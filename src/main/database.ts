import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import {
  SavedDevice,
  CardTemplate,
  POSLocation,
  GeneratedCard,
  TemplateElementConfig,
  ProfileMetadata,
} from '../shared/types';
import { DEFAULT_TEMPLATE, DEFAULT_ELEMENTS } from '../shared/defaults';

const ENCRYPTION_KEY = crypto.createHash('sha256').update('NetCardManager_SecretKey_2026').digest();
const IV_LENGTH = 16;

function encryptPassword(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPassword(text: string): string {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text;
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text; // fallback to plain if not encrypted
  }
}

export class AppDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string = '';

  public async initialize(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file) => {
        const localPath = path.join(__dirname, file);
        if (fs.existsSync(localPath)) return localPath;
        if (app && app.isPackaged) {
          const resPath = path.join(process.resourcesPath, file);
          if (fs.existsSync(resPath)) return resPath;
        }
        return path.join(__dirname, '../../node_modules/sql.js/dist', file);
      },
    });
    const userDataPath =
      app && typeof app.getPath === 'function'
        ? app.getPath('userData')
        : path.resolve(process.env.USERPROFILE || process.env.HOME || '.', '.netcard_data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'netcard_manager.sqlite');

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
      this.createTables();
      this.seedDefaultData();
      this.saveToFile();
    }
    this.createTables(); // Ensure all tables exist
    this.clearDemoData(); // Purge any legacy demo/mock data
  }

  private saveToFile(): void {
    if (!this.db || !this.dbPath) return;
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('[Database] Failed to save database to disk:', err);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS saved_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ip TEXT NOT NULL,
        domain TEXT,
        connectionType TEXT NOT NULL,
        username TEXT NOT NULL,
        passwordEncrypted TEXT,
        port INTEGER NOT NULL DEFAULT 8728,
        useSsl INTEGER NOT NULL DEFAULT 0,
        comment TEXT,
        fastLogin INTEGER NOT NULL DEFAULT 0,
        turboMode INTEGER NOT NULL DEFAULT 1,
        lastConnected TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cardsPerPage INTEGER NOT NULL DEFAULT 51,
        columnsCount INTEGER NOT NULL DEFAULT 3,
        cardWidthMm REAL NOT NULL DEFAULT 63,
        cardHeightMm REAL NOT NULL DEFAULT 30,
        marginHorizontalMm REAL NOT NULL DEFAULT 4,
        marginVerticalMm REAL NOT NULL DEFAULT 4,
        hasBorder INTEGER NOT NULL DEFAULT 1,
        borderSizePx INTEGER NOT NULL DEFAULT 1,
        borderColor TEXT NOT NULL DEFAULT '#D1D5DB',
        showPageNumber INTEGER NOT NULL DEFAULT 1,
        pageNumberX REAL NOT NULL DEFAULT 100,
        pageNumberY REAL NOT NULL DEFAULT 290,
        showUnits INTEGER NOT NULL DEFAULT 1,
        showElementDetails INTEGER NOT NULL DEFAULT 1,
        backgroundImageData TEXT,
        hasBackgroundImage INTEGER NOT NULL DEFAULT 0,
        logoImageData TEXT,
        hasLogo INTEGER NOT NULL DEFAULT 0,
        savePath TEXT,
        linkedProfileName TEXT,
        currency TEXT NOT NULL DEFAULT 'ريال',
        linkToPos INTEGER NOT NULL DEFAULT 0,
        posId INTEGER,
        elementsJson TEXT NOT NULL,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS pos_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ownerName TEXT,
        phone TEXT,
        address TEXT,
        commissionRate REAL DEFAULT 0,
        notes TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS cards_archive (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batchId TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT,
        serial TEXT,
        profile TEXT,
        mode TEXT NOT NULL,
        dataLimit TEXT,
        validity TEXT,
        price REAL,
        currency TEXT,
        custom1 TEXT,
        custom2 TEXT,
        templateId INTEGER,
        posId INTEGER,
        isPrinted INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT,
        routerIp TEXT
      );

      CREATE TABLE IF NOT EXISTS profile_metadata (
        mode TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'ريال',
        validity TEXT,
        rateLimit TEXT,
        sharedUsers INTEGER DEFAULT 1,
        notes TEXT,
        PRIMARY KEY (mode, name)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  private seedDefaultData(): void {
    if (!this.db) return;

    // Seed default template
    const tmpl = DEFAULT_TEMPLATE;
    this.saveTemplate({
      ...tmpl,
      name: '200RY - القياسي (51 كرت)',
    });

    // Seed 42 cards template
    this.saveTemplate({
      ...tmpl,
      id: undefined,
      name: '500RY - التوفير (42 كرت)',
      cardsPerPage: 42,
      columnsCount: 3,
      cardWidthMm: 65,
      cardHeightMm: 38,
      elements: DEFAULT_ELEMENTS.map((el) => {
        if (el.id === 'price') return { ...el, customText: '500 ريال' };
        if (el.id === 'dataLimit') return { ...el, customText: '2.5 GB' };
        if (el.id === 'validity') return { ...el, customText: '7 أيام' };
        return el;
      }),
    });
  }

  public clearDemoData(): void {
    if (!this.db) return;
    try {
      this.db.run(
        `DELETE FROM saved_devices WHERE name LIKE '%الراوتر الرئيسي (Default)%' OR (ip = '192.168.88.1' AND comment LIKE '%شبكة المايكروتك الرئيسية%')`
      );
      this.db.run(
        `DELETE FROM pos_locations WHERE name = 'نقطة بيع المركز الرئيسي' AND phone = '777123456'`
      );
      this.saveToFile();
    } catch (e) {
      console.warn('[Database] clearDemoData error:', e);
    }
  }

  // --- Saved Devices ---
  public getSavedDevices(): SavedDevice[] {
    if (!this.db) return [];
    const res = this.db.exec('SELECT * FROM saved_devices ORDER BY id DESC');
    if (!res.length || !res[0].values) return [];
    const cols = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        ...obj,
        useSsl: Boolean(obj.useSsl),
        fastLogin: Boolean(obj.fastLogin),
        turboMode: Boolean(obj.turboMode),
        passwordEncrypted: decryptPassword(obj.passwordEncrypted || ''),
      } as SavedDevice;
    });
  }

  public saveDevice(dev: SavedDevice): number {
    if (!this.db) return 0;
    const encrypted = encryptPassword(dev.passwordEncrypted);
    const now = new Date().toISOString();

    if (dev.id) {
      this.db.run(
        `UPDATE saved_devices SET 
          name = ?, ip = ?, domain = ?, connectionType = ?, username = ?, 
          passwordEncrypted = ?, port = ?, useSsl = ?, comment = ?, 
          fastLogin = ?, turboMode = ?, lastConnected = ? 
        WHERE id = ?`,
        [
          dev.name,
          dev.ip,
          dev.domain || '',
          dev.connectionType,
          dev.username,
          encrypted,
          dev.port,
          dev.useSsl ? 1 : 0,
          dev.comment || '',
          dev.fastLogin ? 1 : 0,
          dev.turboMode ? 1 : 0,
          dev.lastConnected || now,
          dev.id,
        ]
      );
      this.saveToFile();
      return dev.id;
    } else {
      this.db.run(
        `INSERT INTO saved_devices 
          (name, ip, domain, connectionType, username, passwordEncrypted, port, useSsl, comment, fastLogin, turboMode, lastConnected, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dev.name,
          dev.ip,
          dev.domain || '',
          dev.connectionType,
          dev.username,
          encrypted,
          dev.port,
          dev.useSsl ? 1 : 0,
          dev.comment || '',
          dev.fastLogin ? 1 : 0,
          dev.turboMode ? 1 : 0,
          dev.lastConnected || now,
          now,
        ]
      );
      this.saveToFile();
      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      return lastIdRes[0].values[0][0] as number;
    }
  }

  public deleteDevice(id: number): boolean {
    if (!this.db) return false;
    this.db.run('DELETE FROM saved_devices WHERE id = ?', [id]);
    this.saveToFile();
    return true;
  }

  // --- Templates ---
  public getTemplates(): CardTemplate[] {
    if (!this.db) return [];
    const res = this.db.exec('SELECT * FROM templates ORDER BY id ASC');
    if (!res.length || !res[0].values) return [];
    const cols = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      let elements: TemplateElementConfig[] = DEFAULT_ELEMENTS;
      try {
        elements = JSON.parse(obj.elementsJson);
      } catch (e) {
        // fallback
      }
      return {
        ...obj,
        hasBorder: Boolean(obj.hasBorder),
        showPageNumber: Boolean(obj.showPageNumber),
        showUnits: Boolean(obj.showUnits),
        showElementDetails: Boolean(obj.showElementDetails),
        hasBackgroundImage: Boolean(obj.hasBackgroundImage),
        hasLogo: Boolean(obj.hasLogo),
        linkToPos: Boolean(obj.linkToPos),
        elements,
      } as CardTemplate;
    });
  }

  public saveTemplate(tmpl: CardTemplate): number {
    if (!this.db) return 0;
    const elementsJson = JSON.stringify(tmpl.elements || DEFAULT_ELEMENTS);
    const now = new Date().toISOString();

    if (tmpl.id) {
      this.db.run(
        `UPDATE templates SET
          name = ?, cardsPerPage = ?, columnsCount = ?, cardWidthMm = ?, cardHeightMm = ?,
          marginHorizontalMm = ?, marginVerticalMm = ?, hasBorder = ?, borderSizePx = ?, borderColor = ?,
          showPageNumber = ?, pageNumberX = ?, pageNumberY = ?, showUnits = ?, showElementDetails = ?,
          backgroundImageData = ?, hasBackgroundImage = ?, logoImageData = ?, hasLogo = ?,
          savePath = ?, linkedProfileName = ?, currency = ?, linkToPos = ?, posId = ?,
          elementsJson = ?, updatedAt = ?
        WHERE id = ?`,
        [
          tmpl.name,
          tmpl.cardsPerPage,
          tmpl.columnsCount,
          tmpl.cardWidthMm,
          tmpl.cardHeightMm,
          tmpl.marginHorizontalMm,
          tmpl.marginVerticalMm,
          tmpl.hasBorder ? 1 : 0,
          tmpl.borderSizePx,
          tmpl.borderColor,
          tmpl.showPageNumber ? 1 : 0,
          tmpl.pageNumberX,
          tmpl.pageNumberY,
          tmpl.showUnits ? 1 : 0,
          tmpl.showElementDetails ? 1 : 0,
          tmpl.backgroundImageData || '',
          tmpl.hasBackgroundImage ? 1 : 0,
          tmpl.logoImageData || '',
          tmpl.hasLogo ? 1 : 0,
          tmpl.savePath || '',
          tmpl.linkedProfileName || '',
          tmpl.currency || 'ريال',
          tmpl.linkToPos ? 1 : 0,
          tmpl.posId || null,
          elementsJson,
          now,
          tmpl.id,
        ]
      );
      this.saveToFile();
      return tmpl.id;
    } else {
      this.db.run(
        `INSERT INTO templates
          (name, cardsPerPage, columnsCount, cardWidthMm, cardHeightMm,
          marginHorizontalMm, marginVerticalMm, hasBorder, borderSizePx, borderColor,
          showPageNumber, pageNumberX, pageNumberY, showUnits, showElementDetails,
          backgroundImageData, hasBackgroundImage, logoImageData, hasLogo,
          savePath, linkedProfileName, currency, linkToPos, posId, elementsJson, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tmpl.name,
          tmpl.cardsPerPage,
          tmpl.columnsCount,
          tmpl.cardWidthMm,
          tmpl.cardHeightMm,
          tmpl.marginHorizontalMm,
          tmpl.marginVerticalMm,
          tmpl.hasBorder ? 1 : 0,
          tmpl.borderSizePx,
          tmpl.borderColor,
          tmpl.showPageNumber ? 1 : 0,
          tmpl.pageNumberX,
          tmpl.pageNumberY,
          tmpl.showUnits ? 1 : 0,
          tmpl.showElementDetails ? 1 : 0,
          tmpl.backgroundImageData || '',
          tmpl.hasBackgroundImage ? 1 : 0,
          tmpl.logoImageData || '',
          tmpl.hasLogo ? 1 : 0,
          tmpl.savePath || '',
          tmpl.linkedProfileName || '',
          tmpl.currency || 'ريال',
          tmpl.linkToPos ? 1 : 0,
          tmpl.posId || null,
          elementsJson,
          now,
        ]
      );
      this.saveToFile();
      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      return lastIdRes[0].values[0][0] as number;
    }
  }

  public deleteTemplate(id: number): boolean {
    if (!this.db) return false;
    this.db.run('DELETE FROM templates WHERE id = ?', [id]);
    this.saveToFile();
    return true;
  }

  // --- POS Locations ---
  public getPosLocations(): POSLocation[] {
    if (!this.db) return [];
    const res = this.db.exec('SELECT * FROM pos_locations ORDER BY id ASC');
    if (!res.length || !res[0].values) return [];
    const cols = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj as POSLocation;
    });
  }

  public savePosLocation(pos: POSLocation): number {
    if (!this.db) return 0;
    const now = new Date().toISOString();
    if (pos.id) {
      this.db.run(
        `UPDATE pos_locations SET name = ?, ownerName = ?, phone = ?, address = ?, commissionRate = ?, notes = ? WHERE id = ?`,
        [pos.name, pos.ownerName || '', pos.phone || '', pos.address || '', pos.commissionRate || 0, pos.notes || '', pos.id]
      );
      this.saveToFile();
      return pos.id;
    } else {
      this.db.run(
        `INSERT INTO pos_locations (name, ownerName, phone, address, commissionRate, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pos.name, pos.ownerName || '', pos.phone || '', pos.address || '', pos.commissionRate || 0, pos.notes || '', now]
      );
      this.saveToFile();
      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      return lastIdRes[0].values[0][0] as number;
    }
  }

  public deletePosLocation(id: number): boolean {
    if (!this.db) return false;
    this.db.run('DELETE FROM pos_locations WHERE id = ?', [id]);
    this.saveToFile();
    return true;
  }

  // --- Cards Archive ---
  public saveBatchCards(cards: GeneratedCard[]): void {
    if (!this.db || !cards.length) return;
    for (const c of cards) {
      this.db.run(
        `INSERT INTO cards_archive 
          (batchId, username, password, serial, profile, mode, dataLimit, validity, price, currency, custom1, custom2, templateId, posId, isPrinted, createdAt, routerIp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.batchId,
          c.username,
          c.password || '',
          c.serial,
          c.profile,
          c.mode,
          c.dataLimit || '',
          c.validity || '',
          c.price || 0,
          c.currency || 'ريال',
          c.custom1 || '',
          c.custom2 || '',
          c.templateId || null,
          c.posId || null,
          c.isPrinted ? 1 : 0,
          c.createdAt,
          c.routerIp || '',
        ]
      );
    }
    this.saveToFile();
  }

  public getCardsArchive(batchId?: string): GeneratedCard[] {
    if (!this.db) return [];
    const query = batchId
      ? 'SELECT * FROM cards_archive WHERE batchId = ? ORDER BY id DESC'
      : 'SELECT * FROM cards_archive ORDER BY id DESC LIMIT 500';
    const params = batchId ? [batchId] : [];
    const res = this.db.exec(query, params);
    if (!res.length || !res[0].values) return [];
    const cols = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        ...obj,
        isPrinted: Boolean(obj.isPrinted),
      } as GeneratedCard;
    });
  }

  public updateCardPrintedStatus(ids: number[], isPrinted: boolean): void {
    if (!this.db || !ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    this.db.run(`UPDATE cards_archive SET isPrinted = ? WHERE id IN (${placeholders})`, [
      isPrinted ? 1 : 0,
      ...ids,
    ]);
    this.saveToFile();
  }

  // --- Profile Metadata ---
  public saveProfileMetadata(meta: ProfileMetadata): void {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO profile_metadata (mode, name, price, currency, validity, rateLimit, sharedUsers, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meta.mode,
        meta.name,
        meta.price || 0,
        meta.currency || 'ريال',
        meta.validity || '',
        meta.rateLimit || '',
        meta.sharedUsers || 1,
        meta.notes || '',
      ]
    );
    this.saveToFile();
  }

  public getProfileMetadata(mode?: string): ProfileMetadata[] {
    if (!this.db) return [];
    let sql = 'SELECT * FROM profile_metadata';
    const params: any[] = [];
    if (mode) {
      sql += ' WHERE mode = ?';
      params.push(mode);
    }
    const res = this.db.exec(sql, params);
    if (!res.length || !res[0].values) return [];
    const cols = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj as ProfileMetadata;
    });
  }

  public deleteProfileMetadata(mode: string, name: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM profile_metadata WHERE mode = ? AND name = ?', [mode, name]);
    this.saveToFile();
  }
}
