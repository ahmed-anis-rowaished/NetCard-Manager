import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

export interface SentenceResult {
  type: '!re' | '!done' | '!trap' | '!fatal';
  attributes: Record<string, string>;
  raw: string[];
}

interface PendingCommand {
  tag: string;
  resolve: (res: SentenceResult[]) => void;
  reject: (err: Error) => void;
  accumulator: SentenceResult[];
  timeoutTimer: NodeJS.Timeout;
}

export class MikroTikClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private connected = false;
  private tagCounter = 0;

  // Tag-based command mapping for concurrent pipelined requests
  private pendingMap: Map<string, PendingCommand> = new Map();
  // Fallback queue for commands without tags (e.g. initial login)
  private fallbackQueue: PendingCommand[] = [];

  constructor(
    private host: string,
    private port: number = 8728,
    private useSsl: boolean = false,
    private timeoutMs: number = 15000
  ) {}

  public isSocketConnected(): boolean {
    return this.connected;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.close();
          reject(new Error(`انتهت مهلة الاتصال بالمايكروتك (${this.host}:${this.port})`));
        }
      }, this.timeoutMs);

      const onConnect = () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        this.connected = true;
        resolve();
      };

      const onError = (err: Error) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(new Error(`فشل الاتصال بالمايكروتك: ${err.message}`));
        }
      };

      if (this.useSsl) {
        this.socket = tls.connect(
          {
            host: this.host,
            port: this.port,
            rejectUnauthorized: false,
          },
          onConnect
        );
      } else {
        this.socket = net.connect(
          {
            host: this.host,
            port: this.port,
          },
          onConnect
        );
      }

      this.socket.on('error', onError);
      this.socket.on('close', () => {
        this.connected = false;
        this.rejectAllPending(new Error('تم إغلاق الاتصال مع الراوتر'));
      });
      this.socket.on('data', (chunk) => {
        this.handleData(chunk);
      });
    });
  }

  public async login(user: string, pass: string): Promise<boolean> {
    try {
      const res = await this.writeSentence(['/login', `=name=${user}`, `=password=${pass}`]);
      if (res.length > 0 && res[res.length - 1].type === '!done') {
        const ret = res[res.length - 1].attributes['ret'];
        if (!ret) {
          return true;
        }
        return await this.legacyLogin(user, pass, ret);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('cannot log in')) {
        throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
      throw e;
    }

    return false;
  }

  private async legacyLogin(user: string, pass: string, challengeHex: string): Promise<boolean> {
    const challenge = Buffer.from(challengeHex, 'hex');
    const md5 = crypto.createHash('md5');
    md5.update(Buffer.from([0]));
    md5.update(Buffer.from(pass, 'utf8'));
    md5.update(challenge);
    const responseHex = '00' + md5.digest('hex');

    const res2 = await this.writeSentence([
      '/login',
      `=name=${user}`,
      `=response=${responseHex}`,
    ]);

    if (res2.length > 0 && res2[res2.length - 1].type === '!done') {
      return true;
    }
    throw new Error('فشل تسجيل الدخول القديم (Legacy Login)');
  }

  /**
   * Writes a single sentence with unique .tag support.
   */
  public writeSentence(words: string[]): Promise<SentenceResult[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        return reject(new Error('غير متصل بجهاز المايكروتك'));
      }

      const tag = `nc_${++this.tagCounter}`;
      const finalWords = [...words];

      // Attach .tag if not already provided
      const hasTag = words.some((w) => w.startsWith('.tag=') || w.startsWith('=.tag='));
      if (!hasTag) {
        finalWords.push(`.tag=${tag}`);
      }

      const timeoutTimer = setTimeout(() => {
        if (this.pendingMap.has(tag)) {
          this.pendingMap.delete(tag);
          reject(new Error(`انتهت مهلة تنفيذ الأمر على الراوتر (${finalWords[0]})`));
        }
      }, this.timeoutMs);

      const pendingCmd: PendingCommand = {
        tag,
        resolve: (results) => {
          clearTimeout(timeoutTimer);
          resolve(results);
        },
        reject: (err) => {
          clearTimeout(timeoutTimer);
          reject(err);
        },
        accumulator: [],
        timeoutTimer,
      };

      this.pendingMap.set(tag, pendingCmd);
      this.fallbackQueue.push(pendingCmd);

      const bufferChunks: Buffer[] = [];
      for (const word of finalWords) {
        const wordBuf = Buffer.from(word, 'utf8');
        bufferChunks.push(this.encodeLength(wordBuf.length));
        bufferChunks.push(wordBuf);
      }
      // Zero length ends sentence
      bufferChunks.push(Buffer.from([0]));

      this.socket.write(Buffer.concat(bufferChunks));
    });
  }

  /**
   * Turbo Batch Mode with Controlled Concurrency (Sliding Window):
   * Dispatches sentences using a window of concurrency (e.g. 8-10 parallel commands)
   * while tagging each sentence with unique .tag, avoiding socket drop and cross-talk.
   */
  public async writeBatchSentences(
    sentences: string[][],
    concurrency = 8
  ): Promise<SentenceResult[][]> {
    if (sentences.length === 0) return [];

    const results: SentenceResult[][] = new Array(sentences.length);
    let currentIndex = 0;

    const worker = async () => {
      while (true) {
        const idx = currentIndex++;
        if (idx >= sentences.length) break;

        try {
          results[idx] = await this.writeSentence(sentences[idx]);
        } catch (err: any) {
          // Wrap error as trap result so batch completes without discarding other promises
          results[idx] = [
            {
              type: '!trap',
              attributes: { message: err.message || 'Error executing batch command' },
              raw: ['!trap', `=message=${err.message}`],
            },
          ];
        }
      }
    };

    const workerPool: Promise<void>[] = [];
    const actualConcurrency = Math.max(1, Math.min(concurrency, sentences.length));

    for (let i = 0; i < actualConcurrency; i++) {
      workerPool.push(worker());
    }

    await Promise.all(workerPool);
    return results;
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.parseBuffer();
  }

  private parseBuffer(): void {
    while (true) {
      const sentenceWords = this.extractSentence();
      if (!sentenceWords) break;

      const sentence = this.processSentence(sentenceWords);
      const tag = sentence.attributes['.tag'] || sentence.attributes['tag'];

      let targetCmd: PendingCommand | undefined;

      if (tag && this.pendingMap.has(tag)) {
        targetCmd = this.pendingMap.get(tag);
      } else if (this.fallbackQueue.length > 0) {
        targetCmd = this.fallbackQueue[0];
      }

      if (!targetCmd) {
        continue;
      }

      if (sentence.type === '!re') {
        targetCmd.accumulator.push(sentence);
      } else if (sentence.type === '!done') {
        targetCmd.accumulator.push(sentence);
        this.cleanUpCommand(targetCmd);
        targetCmd.resolve(targetCmd.accumulator);
      } else if (sentence.type === '!trap') {
        targetCmd.accumulator.push(sentence);
        this.cleanUpCommand(targetCmd);
        const msg = sentence.attributes['message'] || 'خطأ في تنفيذ الأمر على المايكروتك';
        targetCmd.reject(new Error(msg));
      } else if (sentence.type === '!fatal') {
        this.cleanUpCommand(targetCmd);
        const msg = sentence.attributes['message'] || 'انقطع الاتصال بالراوتر فجأة';
        targetCmd.reject(new Error(msg));
        this.close();
      }
    }
  }

  private cleanUpCommand(cmd: PendingCommand): void {
    if (cmd.timeoutTimer) clearTimeout(cmd.timeoutTimer);
    if (this.pendingMap.has(cmd.tag)) {
      this.pendingMap.delete(cmd.tag);
    }
    const idx = this.fallbackQueue.indexOf(cmd);
    if (idx !== -1) {
      this.fallbackQueue.splice(idx, 1);
    }
  }

  private extractSentence(): string[] | null {
    let offset = 0;
    const words: string[] = [];

    while (offset < this.buffer.length) {
      const lengthInfo = this.decodeLength(this.buffer, offset);
      if (!lengthInfo) return null;

      offset += lengthInfo.lengthBytes;
      const wordLen = lengthInfo.value;

      if (wordLen === 0) {
        this.buffer = this.buffer.subarray(offset);
        return words;
      }

      if (offset + wordLen > this.buffer.length) {
        return null;
      }

      const word = this.buffer.toString('utf8', offset, offset + wordLen);
      words.push(word);
      offset += wordLen;
    }

    return null;
  }

  private decodeLength(buf: Buffer, offset: number): { value: number; lengthBytes: number } | null {
    if (offset >= buf.length) return null;
    const b1 = buf[offset];

    if ((b1 & 0x80) === 0x00) {
      return { value: b1, lengthBytes: 1 };
    }
    if ((b1 & 0xc0) === 0x80) {
      if (offset + 2 > buf.length) return null;
      const val = ((b1 & 0x3f) << 8) | buf[offset + 1];
      return { value: val, lengthBytes: 2 };
    }
    if ((b1 & 0xe0) === 0xc0) {
      if (offset + 3 > buf.length) return null;
      const val = ((b1 & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2];
      return { value: val, lengthBytes: 3 };
    }
    if ((b1 & 0xf0) === 0xe0) {
      if (offset + 4 > buf.length) return null;
      const val =
        ((b1 & 0x0f) << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3];
      return { value: val, lengthBytes: 4 };
    }
    if (b1 === 0xf0) {
      if (offset + 5 > buf.length) return null;
      const val = buf.readUInt32BE(offset + 1);
      return { value: val, lengthBytes: 5 };
    }
    return null;
  }

  private encodeLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    }
    if (len < 0x4000) {
      return Buffer.from([(len >> 8) | 0x80, len & 0xff]);
    }
    if (len < 0x200000) {
      return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    }
    if (len < 0x10000000) {
      return Buffer.from([
        (len >> 24) | 0xe0,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff,
      ]);
    }
    const buf = Buffer.alloc(5);
    buf[0] = 0xf0;
    buf.writeUInt32BE(len, 1);
    return buf;
  }

  private processSentence(words: string[]): SentenceResult {
    const type = (words[0] || '!done') as SentenceResult['type'];
    const attributes: Record<string, string> = {};

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (word.startsWith('=')) {
        const eqIdx = word.indexOf('=', 1);
        if (eqIdx !== -1) {
          const key = word.substring(1, eqIdx);
          const val = word.substring(eqIdx + 1);
          attributes[key] = val;
        } else {
          attributes[word.substring(1)] = '';
        }
      }
    }

    return { type, attributes, raw: words };
  }

  private rejectAllPending(err: Error): void {
    for (const cmd of this.pendingMap.values()) {
      if (cmd.timeoutTimer) clearTimeout(cmd.timeoutTimer);
      cmd.reject(err);
    }
    this.pendingMap.clear();
    this.fallbackQueue = [];
  }

  public close(): void {
    if (this.socket) {
      try {
        this.socket.end();
        this.socket.destroy();
      } catch (e) {
        // ignore
      }
      this.socket = null;
    }
    this.connected = false;
  }
}
