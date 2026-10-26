import { MikroTikClient, SentenceResult } from './mikrotikClient';
import {
  ConnectionConfig,
  RouterOSInfo,
  HotspotUserProfile,
  UserManagerProfile,
  PppProfile,
  GeneratedCard,
  ActiveSessionItem,
  DashboardData,
  CreateProfileParams,
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

    // Connect with safe sequential timeout (10000ms)
    this.client = new MikroTikClient(host, config.port, config.useSsl, 10000);
    await this.client.connect();
    await this.client.login(config.username, config.password);
    this.activeConfig = config;

    // Fetch system resource print
    const resources = await this.client.writeSentence(['/system/resource/print']);
    const resAttr = resources.find((r) => r.type === '!re')?.attributes || {};

    // Fetch identity
    let identityName = 'MikroTik';
    try {
      const identityRes = await this.client.writeSentence(['/system/identity/print']);
      const idAttr = identityRes.find((r) => r.type === '!re')?.attributes || {};
      if (idAttr['name']) identityName = idAttr['name'];
    } catch (e) {}

    const rawVer = resAttr['version'] || '6.0';
    const major = rawVer.startsWith('7') ? 7 : 6;
    const freeMem = parseInt(resAttr['free-memory'] || '0', 10);
    const totalMem = parseInt(resAttr['total-memory'] || '0', 10);
    const freeHdd = parseInt(resAttr['free-hdd-space'] || '0', 10);
    const totalHdd = parseInt(resAttr['total-hdd-space'] || '0', 10);

    this.osInfo = {
      identity: identityName,
      version: rawVer,
      majorVersion: major,
      platform: resAttr['platform'] || 'MikroTik',
      boardName: resAttr['board-name'] || 'RouterBOARD',
      architecture: resAttr['architecture-name'] || resAttr['cpu'] || '',
      uptime: resAttr['uptime'] || '',
      cpuLoad: (resAttr['cpu-load'] || '0') + '%',
      freeMemory: this.formatBytes(freeMem),
      totalMemory: this.formatBytes(totalMem),
      freeHdd: this.formatBytes(freeHdd),
      totalHdd: this.formatBytes(totalHdd),
      freeMemoryBytes: freeMem,
      totalMemoryBytes: totalMem,
      freeHddBytes: freeHdd,
      totalHddBytes: totalHdd,
    };

    return this.osInfo;
  }

  public async getDashboardData(): Promise<DashboardData> {
    if (!this.client || !this.client.isSocketConnected()) {
      throw new Error('الراوتر غير متصل حالياً');
    }

    // Refresh OS info
    let currentInfo = this.osInfo;
    try {
      const resources = await this.client.writeSentence(['/system/resource/print']);
      const resAttr = resources.find((r) => r.type === '!re')?.attributes || {};

      let identityName = currentInfo?.identity || 'MikroTik';
      try {
        const identityRes = await this.client.writeSentence(['/system/identity/print']);
        const idAttr = identityRes.find((r) => r.type === '!re')?.attributes || {};
        if (idAttr['name']) identityName = idAttr['name'];
      } catch (e) {}

      const rawVer = resAttr['version'] || currentInfo?.version || '7.0';
      const major = rawVer.startsWith('7') ? 7 : 6;
      const freeMem = parseInt(resAttr['free-memory'] || '0', 10);
      const totalMem = parseInt(resAttr['total-memory'] || '0', 10);
      const freeHdd = parseInt(resAttr['free-hdd-space'] || '0', 10);
      const totalHdd = parseInt(resAttr['total-hdd-space'] || '0', 10);

      currentInfo = {
        identity: identityName,
        version: rawVer,
        majorVersion: major,
        platform: resAttr['platform'] || 'MikroTik',
        boardName: resAttr['board-name'] || currentInfo?.boardName || 'RouterBOARD',
        architecture:
          resAttr['architecture-name'] || resAttr['cpu'] || currentInfo?.architecture || '',
        uptime: resAttr['uptime'] || currentInfo?.uptime || '',
        cpuLoad: (resAttr['cpu-load'] || '0') + '%',
        freeMemory: this.formatBytes(freeMem),
        totalMemory: this.formatBytes(totalMem),
        freeHdd: this.formatBytes(freeHdd),
        totalHdd: this.formatBytes(totalHdd),
        freeMemoryBytes: freeMem,
        totalMemoryBytes: totalMem,
        freeHddBytes: freeHdd,
        totalHddBytes: totalHdd,
      };
      this.osInfo = currentInfo;
    } catch (e) {}

    const isV7 = currentInfo?.majorVersion === 7 || this.osInfo?.majorVersion === 7;

    // Fetch live user and active session counts in ~1-5ms with zero CPU overhead using =count-only=
    const [
      hotspotUsersCount,
      hotspotActiveCount,
      pppSecretsCount,
      pppActiveCount,
      userManagerUsersCount,
      userManagerActiveCount,
    ] = await Promise.all([
      this.client.writeCountQuery('/ip/hotspot/user/print'),
      this.client.writeCountQuery('/ip/hotspot/active/print'),
      this.client.writeCountQuery('/ppp/secret/print'),
      this.client.writeCountQuery('/ppp/active/print'),
      this.client.writeCountQuery(isV7 ? '/user-manager/user/print' : '/tool/user-manager/user/print'),
      this.client.writeCountQuery(
        isV7 ? '/user-manager/session/print' : '/tool/user-manager/session/print',
        isV7 ? ['?active=true'] : []
      ),
    ]);

    const counts = {
      hotspotUsers: hotspotUsersCount,
      hotspotActive: hotspotActiveCount,
      userManagerUsers: userManagerUsersCount,
      userManagerActive: userManagerActiveCount,
      pppSecrets: pppSecretsCount,
      pppActive: pppActiveCount,
    };

    const activeSessions: ActiveSessionItem[] = [];

    // Fetch lightweight sample (max 25 items) with specific proplist for the active sessions table
    try {
      const hsActive = await this.client.writeSentence([
        '/ip/hotspot/active/print',
        '=.proplist=.id,user,address,mac-address,uptime,bytes-in,bytes-out',
      ]);
      const activeItems = hsActive.filter((r) => r.type === '!re').slice(0, 25);

      for (const item of activeItems) {
        activeSessions.push({
          id: item.attributes['.id'] || item.attributes['user'],
          user: item.attributes['user'] || '',
          address: item.attributes['address'] || '',
          macAddress: item.attributes['mac-address'] || '',
          uptime: item.attributes['uptime'] || '',
          service: 'hotspot',
          bytesIn: this.formatBytes(parseInt(item.attributes['bytes-in'] || '0', 10)),
          bytesOut: this.formatBytes(parseInt(item.attributes['bytes-out'] || '0', 10)),
        });
      }
    } catch (e) {}

    return {
      info: currentInfo || {
        version: '7.0',
        majorVersion: 7,
        platform: 'MikroTik',
        boardName: 'RouterBOARD',
        uptime: '',
        cpuLoad: '0%',
        freeMemory: '0 MB',
        totalMemory: '0 MB',
        freeHdd: '0 MB',
        totalHdd: '0 MB',
      },
      counts,
      activeSessions,
    };
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
    const results = await this.client.writeSentence([
      '/ip/hotspot/user/profile/print',
      '=.proplist=.id,name,shared-users,rate-limit,session-timeout,on-login',
    ]);
    return results
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'] || '',
        name: r.attributes['name'] || '',
        sharedUsers: parseInt(r.attributes['shared-users'] || '1', 10),
        rateLimit: r.attributes['rate-limit'] || '',
        uptimeLimit: r.attributes['session-timeout'] || '',
      }));
  }

  public async getHotspotServers(): Promise<string[]> {
    if (!this.client) return ['all'];
    try {
      const res = await this.client.writeSentence([
        '/ip/hotspot/print',
        '=.proplist=.id,name,interface',
      ]);
      const servers = res
        .filter((r) => r.type === '!re')
        .map((r) => r.attributes['name'])
        .filter(Boolean);
      return ['all', ...servers];
    } catch {
      return ['all'];
    }
  }

  public async createHotspotProfile(data: CreateProfileParams): Promise<void> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    const cmd = ['/ip/hotspot/user/profile/add', `=name=${data.name}`];
    if (data.rateLimit) cmd.push(`=rate-limit=${data.rateLimit}`);
    if (data.sharedUsers) cmd.push(`=shared-users=${data.sharedUsers}`);
    if (data.sessionTimeout) cmd.push(`=session-timeout=${data.sessionTimeout}`);
    await this.client.writeSentence(cmd);
  }

  public async updateHotspotProfile(idOrName: string, data: Partial<CreateProfileParams>): Promise<void> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    try {
      const res = await this.client.writeSentence([
        '/ip/hotspot/user/profile/print',
        `?name=${idOrName}`,
      ]);
      const found = res.find((r) => r.type === '!re');
      const targetId = found?.attributes['.id'] || idOrName;

      const cmd = ['/ip/hotspot/user/profile/set', `=.id=${targetId}`];
      if (data.name) cmd.push(`=name=${data.name}`);
      if (data.rateLimit !== undefined) cmd.push(`=rate-limit=${data.rateLimit}`);
      if (data.sharedUsers !== undefined) cmd.push(`=shared-users=${data.sharedUsers}`);
      if (data.sessionTimeout !== undefined) cmd.push(`=session-timeout=${data.sessionTimeout}`);
      await this.client.writeSentence(cmd);
    } catch (e: any) {
      throw new Error(`فشل تعديل باقة الهوت سبوت: ${e.message}`);
    }
  }

  public async deleteHotspotProfile(idOrName: string): Promise<void> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    try {
      const res = await this.client.writeSentence([
        '/ip/hotspot/user/profile/print',
        `?name=${idOrName}`,
      ]);
      const found = res.find((r) => r.type === '!re');
      const targetId = found?.attributes['.id'] || idOrName;
      await this.client.writeSentence(['/ip/hotspot/user/profile/remove', `=.id=${targetId}`]);
    } catch (e: any) {
      await this.client.writeSentence(['/ip/hotspot/user/profile/remove', `=.id=${idOrName}`]);
    }
  }

  public async addHotspotUsers(
    cards: GeneratedCard[],
    options: {
      bindMacOnFirstUse?: boolean;
      server?: string;
      turboMode?: boolean;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    if (!this.client) throw new Error('الراوتر غير متصل');

    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    // If bindMacOnFirstUse is active, configure the profile's on-login script to automatically bind MAC
    // Safely preserve and append to existing on-login scripts without overwriting
    if (options.bindMacOnFirstUse && cards.length > 0) {
      const targetProfile = cards[0].profile || 'default';
      try {
        const profRes = await this.client.writeSentence([
          '/ip/hotspot/user/profile/print',
          `?name=${targetProfile}`,
        ]);
        const profItem = profRes.find((r) => r.type === '!re');
        const existingOnLogin = profItem?.attributes['on-login'] || '';
        const lockCode =
          '{ :local mac $"mac-address"; /ip hotspot user set [find name=$user] mac-address=$mac }';

        if (!existingOnLogin.includes('mac-address=$mac')) {
          const combinedScript = existingOnLogin.trim()
            ? `${existingOnLogin.trim()}\r\n${lockCode}`
            : lockCode;

          const profileIdentifier = profItem?.attributes['.id'] || targetProfile;
          await this.client.writeSentence([
            '/ip/hotspot/user/profile/set',
            `=.id=${profileIdentifier}`,
            `=on-login=${combinedScript}`,
          ]);
        }
      } catch (err: any) {
        console.warn('[Hotspot Profile on-login preservation] Note:', err.message);
      }
    }

    const sentences: string[][] = cards.map((card) => {
      const s = ['/ip/hotspot/user/add', `=name=${card.username}`];

      if (card.password !== undefined && card.password !== '') {
        s.push(`=password=${card.password}`);
      }
      if (card.profile) {
        s.push(`=profile=${card.profile}`);
      }
      if (options.server && options.server !== 'all') {
        s.push(`=server=${options.server}`);
      }
      if (card.validity) {
        s.push(`=limit-uptime=${card.validity}`);
      }
      if (card.dataLimit) {
        s.push(`=limit-bytes-total=${this.parseDataLimitToBytes(card.dataLimit)}`);
      }
      if ((card as any).mac) {
        s.push(`=mac-address=${(card as any).mac}`);
      }
      s.push(`=comment=NetCard_Batch_${card.batchId}`);

      return s;
    });

    if (options.turboMode) {
      const concurrency = 8;
      const results = await this.client.writeBatchSentences(sentences, concurrency);
      for (const res of results) {
        const isTrap = res.some((r) => r.type === '!trap');
        if (isTrap) {
          failed++;
          const trapMsg = res.find((r) => r.type === '!trap')?.attributes['message'] || 'فشل إضافة الكرت';
          errors.push(trapMsg);
        } else {
          added++;
        }
      }
      if (options.onProgress) {
        options.onProgress(sentences.length, sentences.length);
      }
    } else {
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
    if (isV7) {
      let profiles: any[] = [];
      try {
        const profRes = await this.client.writeSentence([
          '/user-manager/profile/print',
          '=.proplist=.id,name,price,validity,starts-when',
        ]);
        profiles = profRes.filter((r) => r.type === '!re');
      } catch (e) {}

      // Fetch limitations with independent try/catch
      const limitsMap = new Map<string, string>();
      try {
        const limRes = await this.client.writeSentence([
          '/user-manager/limitation/print',
          '=.proplist=.id,name,transfer-limit,uptime-limit,rate-limit-rx,rate-limit-tx',
        ]);
        for (const l of limRes.filter((r) => r.type === '!re')) {
          const rx = l.attributes['rate-limit-rx'];
          const tx = l.attributes['rate-limit-tx'];
          if (rx && tx) limitsMap.set(l.attributes['name'], `${rx}/${tx}`);
        }
      } catch (e) {}

      return profiles.map((r) => ({
        id: r.attributes['.id'] || '',
        name: r.attributes['name'] || '',
        price: parseFloat(r.attributes['price'] || '0'),
        validity: r.attributes['validity'] || '',
        downloadLimit: limitsMap.get(`${r.attributes['name']}_lim`) || '',
      }));
    } else {
      // RouterOS v6
      try {
        const results = await this.client.writeSentence([
          '/tool/user-manager/profile/print',
          '=.proplist=.id,name,price,validity',
        ]);
        return results
          .filter((r) => r.type === '!re')
          .map((r) => ({
            id: r.attributes['.id'] || '',
            name: r.attributes['name'] || '',
            price: parseFloat(r.attributes['price'] || '0'),
            validity: r.attributes['validity'] || '',
          }));
      } catch (e) {
        return [];
      }
    }
  }

  public async createUserManagerProfile(data: CreateProfileParams): Promise<void> {
    if (!this.client || !this.osInfo) throw new Error('الراوتر غير متصل');
    const isV7 = this.osInfo.majorVersion === 7;

    if (isV7) {
      // 1. Create limitation if rate or uptime limit given
      if (data.rateLimit || data.transferLimit || data.validity) {
        const limName = `${data.name}_lim`;
        const limCmd = ['/user-manager/limitation/add', `=name=${limName}`];
        if (data.rateLimit) {
          const parts = data.rateLimit.split('/');
          if (parts.length === 2) {
            limCmd.push(`=rate-limit-rx=${parts[0]}`, `=rate-limit-tx=${parts[1]}`);
          } else {
            limCmd.push(`=rate-limit-rx=${data.rateLimit}`, `=rate-limit-tx=${data.rateLimit}`);
          }
        }
        if (data.transferLimit) limCmd.push(`=transfer-limit=${data.transferLimit}`);
        if (data.validity) limCmd.push(`=uptime-limit=${data.validity}`);

        try {
          await this.client.writeSentence(limCmd);
        } catch (e) {}
      }

      // 2. Create Profile
      const profCmd = ['/user-manager/profile/add', `=name=${data.name}`];
      if (data.validity) profCmd.push(`=validity=${data.validity}`);
      if (data.price) profCmd.push(`=price=${data.price}`);
      await this.client.writeSentence(profCmd);

      // 3. Link profile to limitation
      if (data.rateLimit || data.transferLimit || data.validity) {
        try {
          await this.client.writeSentence([
            '/user-manager/profile-limitation/add',
            `=profile=${data.name}`,
            `=limitation=${data.name}_lim`,
          ]);
        } catch (e) {}
      }
    } else {
      // v6
      const profCmd = ['/tool/user-manager/profile/add', `=name=${data.name}`];
      if (data.validity) profCmd.push(`=validity=${data.validity}`);
      if (data.price) profCmd.push(`=price=${data.price}`);
      await this.client.writeSentence(profCmd);
    }
  }

  public async updateUserManagerProfile(idOrName: string, data: Partial<CreateProfileParams>): Promise<void> {
    if (!this.client || !this.osInfo) throw new Error('الراوتر غير متصل');
    const isV7 = this.osInfo.majorVersion === 7;
    const prefix = isV7 ? '/user-manager/profile' : '/tool/user-manager/profile';

    try {
      const res = await this.client.writeSentence([`${prefix}/print`, `?name=${idOrName}`]);
      const found = res.find((r) => r.type === '!re');
      const targetId = found?.attributes['.id'] || idOrName;

      const cmd = [`${prefix}/set`, `=.id=${targetId}`];
      if (data.name) cmd.push(`=name=${data.name}`);
      if (data.validity !== undefined) cmd.push(`=validity=${data.validity}`);
      if (data.price !== undefined) cmd.push(`=price=${data.price}`);
      await this.client.writeSentence(cmd);

      // In v7, update limitation if rateLimit was modified
      if (isV7 && data.rateLimit) {
        try {
          const limName = `${data.name || idOrName}_lim`;
          const limRes = await this.client.writeSentence([
            '/user-manager/limitation/print',
            `?name=${limName}`,
          ]);
          const limFound = limRes.find((r) => r.type === '!re');
          if (limFound) {
            const limId = limFound.attributes['.id'] || limName;
            const limCmd = ['/user-manager/limitation/set', `=.id=${limId}`];
            const parts = data.rateLimit.split('/');
            if (parts.length === 2) {
              limCmd.push(`=rate-limit-rx=${parts[0]}`, `=rate-limit-tx=${parts[1]}`);
            } else {
              limCmd.push(`=rate-limit-rx=${data.rateLimit}`, `=rate-limit-tx=${data.rateLimit}`);
            }
            await this.client.writeSentence(limCmd);
          }
        } catch (e) {}
      }
    } catch (e: any) {
      throw new Error(`فشل تعديل باقة اليوزر مانجر: ${e.message}`);
    }
  }

  public async deleteUserManagerProfile(idOrName: string): Promise<void> {
    if (!this.client || !this.osInfo) throw new Error('الراوتر غير متصل');
    const isV7 = this.osInfo.majorVersion === 7;
    const prefix = isV7 ? '/user-manager/profile' : '/tool/user-manager/profile';

    try {
      const res = await this.client.writeSentence([`${prefix}/print`, `?name=${idOrName}`]);
      const found = res.find((r) => r.type === '!re');
      const targetId = found?.attributes['.id'] || idOrName;
      await this.client.writeSentence([`${prefix}/remove`, `=.id=${targetId}`]);
    } catch (e: any) {
      await this.client.writeSentence([`${prefix}/remove`, `=.id=${idOrName}`]);
    }
  }

  public async getUserManagerCustomers(): Promise<string[]> {
    if (!this.client || !this.osInfo) return ['admin', 'default'];
    const isV7 = this.osInfo.majorVersion === 7;

    if (!isV7) {
      try {
        const results = await this.client.writeSentence([
          '/tool/user-manager/customer/print',
          '=.proplist=login',
        ]);
        const list = results
          .filter((r) => r.type === '!re')
          .map((r) => r.attributes['login'] || r.attributes['name'])
          .filter(Boolean);
        return list.length ? list : ['admin'];
      } catch {
        return ['admin'];
      }
    }

    // In RouterOS v7: fetch routers and user-groups
    const list: string[] = ['admin', 'default'];
    try {
      const routers = await this.client.writeSentence([
        '/user-manager/router/print',
        '=.proplist=name',
      ]);
      for (const r of routers.filter((x) => x.type === '!re')) {
        const n = r.attributes['name'];
        if (n && !list.includes(n)) list.push(n);
      }
    } catch {}

    try {
      const groups = await this.client.writeSentence([
        '/user-manager/user-group/print',
        '=.proplist=name',
      ]);
      for (const g of groups.filter((x) => x.type === '!re')) {
        const n = g.attributes['name'];
        if (n && !list.includes(n)) list.push(n);
      }
    } catch {}

    return list;
  }

  public async addUserManagerUsers(
    cards: GeneratedCard[],
    options: {
      customer?: string;
      profile?: string;
      bindFirstMac?: boolean;
      turboMode?: boolean;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    if (!this.client || !this.osInfo) throw new Error('الراوتر غير متصل');

    const isV7 = this.osInfo.majorVersion === 7;
    let failed = 0;
    const errors: string[] = [];

    // --- PHASE 1: Add User Accounts to MikroTik ---
    // Prepare commands to create all users first so they are guaranteed to exist before profile assignment
    const userCommands: string[][] = [];
    for (const card of cards) {
      if (isV7) {
        const userCmd = ['/user-manager/user/add', `=name=${card.username}`];
        if (card.password) userCmd.push(`=password=${card.password}`);
        if (card.sharedUsers) userCmd.push(`=shared-users=${card.sharedUsers}`);
        if (options.bindFirstMac) userCmd.push(`=caller-id=bind`);
        if (options.customer && options.customer !== 'admin' && options.customer !== 'default') {
          userCmd.push(`=group=${options.customer}`);
        }
        userCmd.push(`=comment=NetCard_${card.batchId}`);
        userCommands.push(userCmd);
      } else {
        const userCmd = [
          '/tool/user-manager/user/add',
          `=username=${card.username}`,
          `=customer=${options.customer || 'admin'}`,
        ];
        if (card.password) userCmd.push(`=password=${card.password}`);
        if (card.sharedUsers) userCmd.push(`=shared-users=${card.sharedUsers}`);
        if (options.bindFirstMac) userCmd.push(`=caller-id=bind`);
        userCmd.push(`=comment=NetCard_${card.batchId}`);
        userCommands.push(userCmd);
      }
    }

    const addedCards: GeneratedCard[] = [];

    if (options.turboMode) {
      const concurrency = 8;
      const userResults = await this.client.writeBatchSentences(userCommands, concurrency);
      for (let i = 0; i < userResults.length; i++) {
        const res = userResults[i];
        const isTrap = res.some((r) => r.type === '!trap');
        if (isTrap) {
          failed++;
          const trapMsg = res.find((r) => r.type === '!trap')?.attributes['message'] || 'خطأ في إضافة المستخدم باليوزر مانجر';
          errors.push(trapMsg);
        } else {
          addedCards.push(cards[i]);
        }
      }
    } else {
      for (let i = 0; i < userCommands.length; i++) {
        try {
          await this.client.writeSentence(userCommands[i]);
          addedCards.push(cards[i]);
        } catch (e: any) {
          failed++;
          errors.push(e.message);
        }
        if (options.onProgress && (i % 4 === 0 || i === userCommands.length - 1)) {
          options.onProgress(i + 1, cards.length);
        }
      }
    }

    if (options.onProgress) {
      options.onProgress(addedCards.length, cards.length);
    }

    // --- PHASE 2: Assign & Bind Profiles to all successfully created users ---
    const profileToBind = options.profile || (cards.length > 0 ? cards[0].profile : undefined);

    if (profileToBind && profileToBind !== 'none' && addedCards.length > 0) {
      const profileCommands: string[][] = addedCards.map((card) => {
        if (isV7) {
          // In RouterOS v7 User Manager: /user-manager/user-profile/add user=... profile=...
          // CRITICAL: DO NOT pass =comment= as it is rejected by RouterOS v7 syntax
          return [
            '/user-manager/user-profile/add',
            `=user=${card.username}`,
            `=profile=${profileToBind}`,
          ];
        } else {
          // In RouterOS v6 User Manager: /tool/user-manager/user/create-and-activate-profile
          return [
            '/tool/user-manager/user/create-and-activate-profile',
            `=numbers=${card.username}`,
            `=customer=${options.customer || 'admin'}`,
            `=profile=${profileToBind}`,
          ];
        }
      });

      if (options.turboMode) {
        const concurrency = 6;
        const profResults = await this.client.writeBatchSentences(profileCommands, concurrency);
        for (const res of profResults) {
          const isTrap = res.some((r) => r.type === '!trap');
          if (isTrap) {
            const trapMsg = res.find((r) => r.type === '!trap')?.attributes['message'] || 'تحذير أثناء تفعيل باقة اليوزر مانجر';
            errors.push(trapMsg);
          }
        }
      } else {
        for (const cmd of profileCommands) {
          try {
            await this.client.writeSentence(cmd);
          } catch (e: any) {
            errors.push(e.message);
          }
        }
      }
    }

    return { added: addedCards.length, failed, errors };
  }

  // ==================== BROADBAND / PPPoE ====================

  public async getPppProfiles(): Promise<PppProfile[]> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    const results = await this.client.writeSentence([
      '/ppp/profile/print',
      '=.proplist=.id,name,local-address,remote-address,rate-limit',
    ]);
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

  public async createPppProfile(data: CreateProfileParams): Promise<void> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    const cmd = ['/ppp/profile/add', `=name=${data.name}`];
    if (data.rateLimit) cmd.push(`=rate-limit=${data.rateLimit}`);
    if (data.localAddress) cmd.push(`=local-address=${data.localAddress}`);
    if (data.remoteAddress) cmd.push(`=remote-address=${data.remoteAddress}`);
    await this.client.writeSentence(cmd);
  }

  public async updatePppProfile(idOrName: string, data: Partial<CreateProfileParams>): Promise<void> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    try {
      const res = await this.client.writeSentence(['/ppp/profile/print', `?name=${idOrName}`]);
      const found = res.find((r) => r.type === '!re');
      const targetId = found?.attributes['.id'] || idOrName;

      const cmd = ['/ppp/profile/set', `=.id=${targetId}`];
      if (data.name) cmd.push(`=name=${data.name}`);
      if (data.rateLimit !== undefined) cmd.push(`=rate-limit=${data.rateLimit}`);
      if (data.localAddress !== undefined) cmd.push(`=local-address=${data.localAddress}`);
      if (data.remoteAddress !== undefined) cmd.push(`=remote-address=${data.remoteAddress}`);
      await this.client.writeSentence(cmd);
    } catch (e: any) {
      throw new Error(`فشل تعديل باقة البرودباند: ${e.message}`);
    }
  }

  public async deletePppProfile(idOrName: string): Promise<void> {
    if (!this.client) throw new Error('الراوتر غير متصل');
    try {
      const res = await this.client.writeSentence(['/ppp/profile/print', `?name=${idOrName}`]);
      const found = res.find((r) => r.type === '!re');
      const targetId = found?.attributes['.id'] || idOrName;
      await this.client.writeSentence(['/ppp/profile/remove', `=.id=${targetId}`]);
    } catch (e: any) {
      await this.client.writeSentence(['/ppp/profile/remove', `=.id=${idOrName}`]);
    }
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

    if (options.turboMode) {
      const concurrency = 8;
      const results = await this.client.writeBatchSentences(sentences, concurrency);
      for (const res of results) {
        const isTrap = res.some((r) => r.type === '!trap');
        if (isTrap) {
          failed++;
          const trapMsg = res.find((r) => r.type === '!trap')?.attributes['message'] || 'فشل إضافة اشتراك البرودباند';
          errors.push(trapMsg);
        } else {
          added++;
        }
      }
      if (options.onProgress) {
        options.onProgress(sentences.length, sentences.length);
      }
    } else {
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

  // ==================== SCRIPT GENERATOR (.rsc) ====================

  public generateRscScript(
    cards: GeneratedCard[],
    mode: 'hotspot' | 'usermanager' | 'broadband',
    isV7 = false,
    options?: { bindMacOnFirstUse?: boolean; customer?: string }
  ): string {
    const lines: string[] = [
      '# ====================================================',
      '# NetCard Manager - MikroTik RouterOS Script (.rsc)',
      `# تاريخ التوليد: ${new Date().toISOString()}`,
      `# إجمالي الكروت: ${cards.length}`,
      `# الوضع: ${mode.toUpperCase()} (RouterOS ${isV7 ? 'v7' : 'v6'})`,
      '# ====================================================',
      '',
    ];

    if (mode === 'hotspot') {
      if (options?.bindMacOnFirstUse && cards.length > 0) {
        const prof = cards[0].profile || 'default';
        lines.push('# إعداد القفل التلقائي للماك أدرس عند أول تسجيل دخول مع الحفاظ على السكربتات السابقة');
        lines.push(
          `:local curScript [/ip hotspot user profile get [find name="${prof}"] on-login]`
        );
        lines.push(
          `:if ([:find $curScript "mac-address=\\$mac"] = -1) do={ /ip hotspot user profile set [find name="${prof}"] on-login=($curScript . "\\r\\n{ :local mac $\\"mac-address\\"; /ip hotspot user set [find name=$user] mac-address=$mac }") }`
        );
        lines.push('');
      }

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
          if (options?.bindMacOnFirstUse) cmd += ` caller-id="bind"`;
          cmd += ` comment="NetCard_${c.batchId}"`;
          lines.push(cmd);
        }
        lines.push('');
        lines.push('/user-manager user-profile');
        for (const c of cards) {
          if (c.profile) {
            lines.push(`add user="${c.username}" profile="${c.profile}" comment="NetCard_${c.batchId}"`);
          }
        }
      } else {
        lines.push('/tool user-manager user');
        const cust = options?.customer || 'admin';
        for (const c of cards) {
          let cmd = `add username="${c.username}" customer="${cust}"`;
          if (c.password) cmd += ` password="${c.password}"`;
          if (options?.bindMacOnFirstUse) cmd += ` caller-id="bind"`;
          cmd += ` comment="NetCard_${c.batchId}"`;
          lines.push(cmd);
        }
        lines.push('');
        lines.push('/tool user-manager user');
        for (const c of cards) {
          if (c.profile) {
            lines.push(
              `create-and-activate-profile numbers="${c.username}" customer="${cust}" profile="${c.profile}"`
            );
          }
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
