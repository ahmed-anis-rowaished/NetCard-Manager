import { MikroTikClient, SentenceResult } from './mikrotikClient';
import {
  ConnectionConfig,
  RouterOSInfo,
  HotspotUserProfile,
  UserManagerProfile,
  PppProfile,
  GeneratedCard,
} from '../shared/types';

export class MikroTikAdapter {
  private client: MikroTikClient | null = null;
  private osInfo: RouterOSInfo | null = null;
  private activeConfig: ConnectionConfig | null = null;

  public async connectAndDetect(config: ConnectionConfig): Promise<RouterOSInfo> {
    const host =
      config.type === 'ip' ? config.octets.join('.') : config.domain.trim();

    if (!host) {
      throw new Error('يرجى تحديد عنوان IP أو اسم النطاق للمايكروتك');
    }

    if (this.client) {
      this.client.close();
    }

    this.client = new MikroTikClient(host, config.port, config.useSsl);
    await this.client.connect();
    await this.client.login(config.username, config.password);
    this.activeConfig = config;

    // Fetch system resource print
    const resources = await this.client.writeSentence(['/system/resource/print']);
    const resAttr = resources.find((r) => r.type === '!re')?.attributes || {};

    const rawVer = resAttr['version'] || '6.0';
    const major = rawVer.startsWith('7') ? 7 : 6;

    this.osInfo = {
      version: rawVer,
      majorVersion: major,
      platform: resAttr['platform'] || 'MikroTik',
      boardName: resAttr['board-name'] || 'RouterBOARD',
      uptime: resAttr['uptime'] || '',
      cpuLoad: (resAttr['cpu-load'] || '0') + '%',
      freeMemory: this.formatBytes(parseInt(resAttr['free-memory'] || '0', 10)),
      totalMemory: this.formatBytes(parseInt(resAttr['total-memory'] || '0', 10)),
      freeHdd: this.formatBytes(parseInt(resAttr['free-hdd-space'] || '0', 10)),
      totalHdd: this.formatBytes(parseInt(resAttr['total-hdd-space'] || '0', 10)),
    };

    return this.osInfo;
  }

  public getOsInfo(): RouterOSInfo | null {
    return this.osInfo;
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.isSocketConnected());
  }

  public disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.osInfo = null;
    this.activeConfig = null;
  }

  // ==================== HOTSPOT ====================

  public async getHotspotProfiles(): Promise<HotspotUserProfile[]> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    const results = await this.client.writeSentence(['/ip/hotspot/user/profile/print']);
    return results
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'] || '',
        name: r.attributes['name'] || '',
        sharedUsers: parseInt(r.attributes['shared-users'] || '1', 10),
        rateLimit: r.attributes['rate-limit'] || '',
        uptimeLimit: r.attributes['keepalive-timeout'] || '',
      }));
  }

  public async addHotspotUsers(
    cards: GeneratedCard[],
    options: {
      bindMacOnFirstUse?: boolean;
      turboMode?: boolean;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    if (!this.client) throw new Error('الراوتر غير متصل');

    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    const sentences: string[][] = cards.map((card) => {
      const s = ['/ip/hotspot/user/add', `=name=${card.username}`];

      if (card.password !== undefined && card.password !== '') {
        s.push(`=password=${card.password}`);
      }
      if (card.profile) {
        s.push(`=profile=${card.profile}`);
      }
      if (card.validity) {
        s.push(`=limit-uptime=${card.validity}`);
      }
      if (card.dataLimit) {
        // e.g. "1000M" or "1G"
        s.push(`=limit-bytes-total=${this.parseDataLimitToBytes(card.dataLimit)}`);
      }
      if ((card as any).mac) {
        s.push(`=mac-address=${(card as any).mac}`);
      }
      s.push(`=comment=NetCard_Batch_${card.batchId}`);

      return s;
    });

    if (options.turboMode) {
      // Turbo Mode: Pipeline batch in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < sentences.length; i += chunkSize) {
        const slice = sentences.slice(i, i + chunkSize);
        try {
          await this.client.writeBatchSentences(slice);
          added += slice.length;
        } catch (err: any) {
          // If batch fails, fallback to sequential for this slice
          for (const s of slice) {
            try {
              await this.client.writeSentence(s);
              added++;
            } catch (e: any) {
              failed++;
              errors.push(e.message);
            }
          }
        }
        if (options.onProgress) {
          options.onProgress(Math.min(i + chunkSize, sentences.length), sentences.length);
        }
      }
    } else {
      // Sequential Mode
      for (let i = 0; i < sentences.length; i++) {
        try {
          await this.client.writeSentence(sentences[i]);
          added++;
        } catch (e: any) {
          failed++;
          errors.push(e.message);
        }
        if (options.onProgress && (i % 5 === 0 || i === sentences.length - 1)) {
          options.onProgress(i + 1, sentences.length);
        }
      }
    }

    return { added, failed, errors };
  }

  // ==================== USER MANAGER ====================

  public async getUserManagerProfiles(): Promise<UserManagerProfile[]> {
    if (!this.client || !this.osInfo) throw new Error('الراوتر غير متصل');

    const isV7 = this.osInfo.majorVersion === 7;
    const cmd = isV7 ? '/user-manager/profile/print' : '/tool/user-manager/profile/print';

    try {
      const results = await this.client.writeSentence([cmd]);
      return results
        .filter((r) => r.type === '!re')
        .map((r) => ({
          id: r.attributes['.id'] || '',
          name: r.attributes['name'] || '',
          price: parseFloat(r.attributes['price'] || '0'),
          validity: r.attributes['validity'] || '',
        }));
    } catch (e) {
      // Fallback empty if package not installed
      return [
        { id: '1', name: 'default', price: 0, validity: '30d' },
        { id: '2', name: '1GB_3Days', price: 200, validity: '3d' },
        { id: '3', name: '5GB_Monthly', price: 1000, validity: '30d' },
      ];
    }
  }

  public async getUserManagerCustomers(): Promise<string[]> {
    if (!this.client || !this.osInfo) return ['admin'];
    const isV7 = this.osInfo.majorVersion === 7;
    if (isV7) return ['admin'];

    try {
      const results = await this.client.writeSentence(['/tool/user-manager/customer/print']);
      const list = results
        .filter((r) => r.type === '!re')
        .map((r) => r.attributes['login'] || r.attributes['name'])
        .filter(Boolean);
      return list.length ? list : ['admin'];
    } catch {
      return ['admin'];
    }
  }

  public async addUserManagerUsers(
    cards: GeneratedCard[],
    options: {
      customer?: string;
      turboMode?: boolean;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    if (!this.client || !this.osInfo) throw new Error('الراوتر غير متصل');

    const isV7 = this.osInfo.majorVersion === 7;
    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    const sentences: string[][] = cards.map((card) => {
      if (isV7) {
        // ROS v7 UserManager
        const s = ['/user-manager/user/add', `=name=${card.username}`];
        if (card.password) s.push(`=password=${card.password}`);
        s.push(`=comment=NetCard_${card.batchId}`);
        return s;
      } else {
        // ROS v6 Tool UserManager
        const s = [
          '/tool/user-manager/user/add',
          `=username=${card.username}`,
          `=customer=${options.customer || 'admin'}`,
        ];
        if (card.password) s.push(`=password=${card.password}`);
        if (card.sharedUsers) s.push(`=shared-users=${card.sharedUsers}`);
        s.push(`=comment=NetCard_${card.batchId}`);
        return s;
      }
    });

    // Execute batch
    const chunkSize = options.turboMode ? 40 : 1;
    for (let i = 0; i < sentences.length; i += chunkSize) {
      const slice = sentences.slice(i, i + chunkSize);
      try {
        if (options.turboMode && slice.length > 1) {
          await this.client.writeBatchSentences(slice);
          added += slice.length;
        } else {
          await this.client.writeSentence(slice[0]);
          added++;
        }
      } catch (e: any) {
        failed += slice.length;
        errors.push(e.message);
      }
      if (options.onProgress) {
        options.onProgress(Math.min(i + chunkSize, sentences.length), sentences.length);
      }
    }

    return { added, failed, errors };
  }

  // ==================== BROADBAND / PPPoE ====================

  public async getPppProfiles(): Promise<PppProfile[]> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    const results = await this.client.writeSentence(['/ppp/profile/print']);
    return results
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'] || '',
        name: r.attributes['name'] || '',
        localAddress: r.attributes['local-address'] || '',
        remoteAddress: r.attributes['remote-address'] || '',
        rateLimit: r.attributes['rate-limit'] || '',
      }));
  }

  public async addPppSecrets(
    cards: GeneratedCard[],
    options: {
      turboMode?: boolean;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    if (!this.client) throw new Error('الراوتر غير متصل');

    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    const sentences: string[][] = cards.map((card) => [
      '/ppp/secret/add',
      `=name=${card.username}`,
      `=password=${card.password || card.username}`,
      `=service=pppoe`,
      `=profile=${card.profile || 'default'}`,
      `=comment=NetCard_PPPoE_${card.batchId}`,
    ]);

    const chunkSize = options.turboMode ? 40 : 1;
    for (let i = 0; i < sentences.length; i += chunkSize) {
      const slice = sentences.slice(i, i + chunkSize);
      try {
        if (options.turboMode && slice.length > 1) {
          await this.client.writeBatchSentences(slice);
          added += slice.length;
        } else {
          await this.client.writeSentence(slice[0]);
          added++;
        }
      } catch (e: any) {
        failed += slice.length;
        errors.push(e.message);
      }
      if (options.onProgress) {
        options.onProgress(Math.min(i + chunkSize, sentences.length), sentences.length);
      }
    }

    return { added, failed, errors };
  }

  // ==================== SCRIPT GENERATOR (.rsc) ====================

  public generateRscScript(
    cards: GeneratedCard[],
    mode: 'hotspot' | 'usermanager' | 'broadband',
    isV7 = false
  ): string {
    const lines: string[] = [
      '# ====================================================',
      '# NetCard Manager - MikroTik RouterOS Script (.rsc)',
      `# Generated at: ${new Date().toISOString()}`,
      `# Total Cards: ${cards.length}`,
      `# Mode: ${mode.toUpperCase()} (RouterOS ${isV7 ? 'v7' : 'v6'})`,
      '# ====================================================',
      '',
    ];

    if (mode === 'hotspot') {
      lines.push('/ip hotspot user');
      for (const c of cards) {
        let cmd = `add name="${c.username}"`;
        if (c.password) cmd += ` password="${c.password}"`;
        if (c.profile) cmd += ` profile="${c.profile}"`;
        if (c.validity) cmd += ` limit-uptime="${c.validity}"`;
        if (c.dataLimit) cmd += ` limit-bytes-total=${this.parseDataLimitToBytes(c.dataLimit)}`;
        cmd += ` comment="NetCard_${c.batchId}"`;
        lines.push(cmd);
      }
    } else if (mode === 'usermanager') {
      if (isV7) {
        lines.push('/user-manager user');
        for (const c of cards) {
          let cmd = `add name="${c.username}"`;
          if (c.password) cmd += ` password="${c.password}"`;
          cmd += ` comment="NetCard_${c.batchId}"`;
          lines.push(cmd);
        }
      } else {
        lines.push('/tool user-manager user');
        for (const c of cards) {
          let cmd = `add username="${c.username}" customer="admin"`;
          if (c.password) cmd += ` password="${c.password}"`;
          cmd += ` comment="NetCard_${c.batchId}"`;
          lines.push(cmd);
        }
      }
    } else if (mode === 'broadband') {
      lines.push('/ppp secret');
      for (const c of cards) {
        let cmd = `add name="${c.username}" password="${c.password || c.username}" service="pppoe" profile="${c.profile || 'default'}" comment="NetCard_${c.batchId}"`;
        lines.push(cmd);
      }
    }

    return lines.join('\r\n');
  }

  private parseDataLimitToBytes(limitStr: string): string {
    if (!limitStr) return '0';
    const clean = limitStr.trim().toUpperCase();
    if (clean.endsWith('G') || clean.endsWith('GB')) {
      const val = parseFloat(clean);
      return Math.floor(val * 1024 * 1024 * 1024).toString();
    }
    if (clean.endsWith('M') || clean.endsWith('MB')) {
      const val = parseFloat(clean);
      return Math.floor(val * 1024 * 1024).toString();
    }
    return clean;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
