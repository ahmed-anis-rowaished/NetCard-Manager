import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { AppDatabase } from './database';
import { MikroTikAdapter } from './mikrotikAdapter';
import { MndpListener } from './mndpListener';
import { CardGeneratorEngine } from './cardGeneratorEngine';
import { PdfGenerator } from './pdfGenerator';
import { ExcelExporter } from './excelGenerator';
import { FirewallProtector } from './firewallProtector';
import {
  ConnectionConfig,
  SavedDevice,
  CardTemplate,
  POSLocation,
  CardBatchGenerationRequest,
  GenerationProgress,
} from '../shared/types';

// Execution lock to prevent concurrent overlapping batch runs
let isGeneratingLock = false;

export function setupIpcHandlers(
  db: AppDatabase,
  adapter: MikroTikAdapter,
  mndp: MndpListener,
  mainWindow: BrowserWindow | null
) {
  // --- MNDP Discovery ---
  ipcMain.handle('mndp:start', () => {
    mndp.startListening();
    return mndp.getDevices();
  });

  ipcMain.handle('mndp:stop', () => {
    mndp.stopListening();
    return true;
  });

  ipcMain.handle('mndp:getDevices', () => {
    return mndp.getDevices();
  });

  ipcMain.handle('mndp:scan', async () => {
    return await mndp.scanSubnetRanges();
  });

  // Setup MNDP auto-push to renderer
  mndp.onDevicesUpdated((devices) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mndp:devicesUpdated', devices);
    }
  });

  // --- MikroTik Connection ---
  ipcMain.handle('mikrotik:connect', async (_, config: ConnectionConfig) => {
    try {
      const info = await adapter.connectAndDetect(config);
      // Auto-save device if requested
      if (config.saveUsername || config.savePassword) {
        db.saveDevice({
          name: config.comment || (config.type === 'ip' ? config.octets.join('.') : config.domain),
          ip: config.type === 'ip' ? config.octets.join('.') : '',
          domain: config.type === 'domain' ? config.domain : '',
          connectionType: config.type,
          username: config.username,
          passwordEncrypted: config.savePassword ? config.password : '',
          port: config.port,
          useSsl: config.useSsl,
          comment: config.comment,
          fastLogin: config.fastLogin,
          turboMode: config.turboMode,
          lastConnected: new Date().toISOString(),
        });
      }
      return { success: true, info };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل الاتصال بالمايكروتك' };
    }
  });

  ipcMain.handle('mikrotik:disconnect', () => {
    adapter.disconnect();
    return true;
  });

  ipcMain.handle('mikrotik:getStatus', () => {
    return {
      connected: adapter.isConnected(),
      info: adapter.getOsInfo(),
    };
  });

  ipcMain.handle('mikrotik:getHotspotProfiles', async () => {
    try {
      return await adapter.getHotspotProfiles();
    } catch (e: any) {
      return [];
    }
  });

  ipcMain.handle('mikrotik:getUserManagerProfiles', async () => {
    try {
      return await adapter.getUserManagerProfiles();
    } catch (e: any) {
      return [];
    }
  });

  ipcMain.handle('mikrotik:getUserManagerCustomers', async () => {
    try {
      return await adapter.getUserManagerCustomers();
    } catch {
      return ['admin'];
    }
  });

  ipcMain.handle('mikrotik:getPppProfiles', async () => {
    try {
      return await adapter.getPppProfiles();
    } catch {
      return [];
    }
  });

  // --- Database Saved Devices ---
  ipcMain.handle('db:getSavedDevices', () => {
    return db.getSavedDevices();
  });

  ipcMain.handle('db:saveDevice', (_, dev: SavedDevice) => {
    return db.saveDevice(dev);
  });

  ipcMain.handle('db:deleteDevice', (_, id: number) => {
    return db.deleteDevice(id);
  });

  // --- Database Templates ---
  ipcMain.handle('db:getTemplates', () => {
    return db.getTemplates();
  });

  ipcMain.handle('db:saveTemplate', (_, tmpl: CardTemplate) => {
    return db.saveTemplate(tmpl);
  });

  ipcMain.handle('db:deleteTemplate', (_, id: number) => {
    return db.deleteTemplate(id);
  });

  // --- Database POS Locations ---
  ipcMain.handle('db:getPosLocations', () => {
    return db.getPosLocations();
  });

  ipcMain.handle('db:savePosLocation', (_, pos: POSLocation) => {
    return db.savePosLocation(pos);
  });

  ipcMain.handle('db:deletePosLocation', (_, id: number) => {
    return db.deletePosLocation(id);
  });

  // --- Database Cards Archive ---
  ipcMain.handle('db:getCardsArchive', (_, batchId?: string) => {
    return db.getCardsArchive(batchId);
  });

  ipcMain.handle('db:updateCardPrintedStatus', (_, ids: number[], isPrinted: boolean) => {
    db.updateCardPrintedStatus(ids, isPrinted);
    return true;
  });

  // --- Batch Generation & Print Orchestrator with Execution Lock ---
  ipcMain.handle('generator:executeBatch', async (_, req: CardBatchGenerationRequest) => {
    if (isGeneratingLock) {
      return {
        success: false,
        error: 'هناك عملية توليد وطباعة قيد التنفيذ حالياً، يرجى الانتظار حتى تكتمل',
      };
    }

    isGeneratingLock = true;

    const notifyProgress = (p: GenerationProgress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generator:progress', p);
      }
    };

    try {
      // 1. Fetch template
      const templates = db.getTemplates();
      const template = templates.find((t) => t.id === req.templateId) || templates[0];
      if (!template) {
        throw new Error('لم يتم العثور على القالب المختار');
      }

      notifyProgress({
        step: 'generating',
        current: 0,
        total: req.cardsCount,
        message: 'جاري توليد أرقام الكروت والبيانات عشوائياً...',
      });

      // 2. Generate cards array
      const cards = CardGeneratorEngine.generateBatch(req, template);

      // 3. Push to Router (unless Offline Mode)
      if (!req.switches.offlineMode) {
        if (!adapter.isConnected()) {
          throw new Error('الراوتر غير متصل! يرجى الاتصال أولاً أو تفعيل "توليد كروت بدون إضافة" (Offline)');
        }

        notifyProgress({
          step: 'pushing_router',
          current: 0,
          total: cards.length,
          message: 'جاري إضافة الكروت في جهاز المايكروتك...',
        });

        if (req.mode === 'hotspot') {
          const res = await adapter.addHotspotUsers(cards, {
            bindMacOnFirstUse: req.switches.bindMacOnFirstUse,
            turboMode: true,
            onProgress: (cur, tot) => {
              notifyProgress({
                step: 'pushing_router',
                current: cur,
                total: tot,
                message: `تم إضافة ${cur} من أصل ${tot} كرت في الهوت سبوت...`,
              });
            },
          });
          if (req.switches.transactionSafety && res.failed > 0 && res.added === 0) {
            throw new Error(`فشلت إضافة الكروت في الراوتر: ${res.errors[0] || 'خطأ غير معروف'}`);
          }
        } else if (req.mode === 'usermanager') {
          const res = await adapter.addUserManagerUsers(cards, {
            customer: req.umCustomer || 'admin',
            profile: req.profileName,
            bindFirstMac: req.switches.bindMacOnFirstUse,
            turboMode: true,
            onProgress: (cur, tot) => {
              notifyProgress({
                step: 'pushing_router',
                current: cur,
                total: tot,
                message: `تم إضافة وتفعيل ${cur} من أصل ${tot} كرت في اليوزر مانجر...`,
              });
            },
          });
          if (req.switches.transactionSafety && res.failed > 0 && res.added === 0) {
            throw new Error(`فشلت إضافة الكروت في اليوزر مانجر: ${res.errors[0] || 'خطأ غير معروف'}`);
          }
        } else if (req.mode === 'broadband') {
          const res = await adapter.addPppSecrets(cards, {
            turboMode: true,
            onProgress: (cur, tot) => {
              notifyProgress({
                step: 'pushing_router',
                current: cur,
                total: tot,
                message: `تم إضافة ${cur} من أصل ${tot} مشترك في البرودباند...`,
              });
            },
          });
          if (req.switches.transactionSafety && res.failed > 0 && res.added === 0) {
            throw new Error(`فشلت إضافة اشتراكات البرودباند: ${res.errors[0] || 'خطأ غير معروف'}`);
          }
        }
      }

      // 4. Archive in SQLite Database
      db.saveBatchCards(cards);

      // 5. Determine output directory
      let targetDir = template.savePath;
      if (!targetDir || !fs.existsSync(targetDir)) {
        targetDir = path.join(
          process.env.USERPROFILE || process.env.HOME || '.',
          'Documents',
          'NetCard_Prints'
        );
      }
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `NetCards_${req.mode}_${cards[0].batchId}_${timestamp}`;

      let pdfPath = path.join(targetDir, `${baseFilename}.pdf`);
      let excelPath = '';
      let rscPath = '';
      let txtPath = '';

      // Prompt for PDF save location if switch is active
      if (req.switches.savePdf && req.switches.promptPdfLocation && mainWindow) {
        const saveDialogRes = await dialog.showSaveDialog(mainWindow, {
          title: 'تحديد مكان حفظ ملف الكروت المجهزة للطباعة (PDF)',
          defaultPath: pdfPath,
          filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }],
        });
        if (!saveDialogRes.canceled && saveDialogRes.filePath) {
          pdfPath = saveDialogRes.filePath;
          targetDir = path.dirname(pdfPath);
        }
      }

      // 6. Generate PDF if enabled
      if (req.switches.savePdf) {
        notifyProgress({
          step: 'rendering_pdf',
          current: cards.length,
          total: cards.length,
          message: 'جاري تصيير شبكة الكروت وملف الطباعة بدقة 300 DPI مع النصوص العربية...',
        });

        await PdfGenerator.generateCardGridPdf(cards, template, pdfPath);
      }

      // 7. Generate Excel if enabled
      if (req.switches.exportExcel) {
        excelPath = path.join(targetDir, `${baseFilename}.xlsx`);
        await ExcelExporter.exportCardsToExcel(cards, excelPath, `دفعة ${cards[0].batchId}`);
      }

      // 8. Generate RSC Script if enabled
      if (req.switches.exportRscScript) {
        rscPath = path.join(targetDir, `${baseFilename}.rsc`);
        const rscContent = adapter.generateRscScript(
          cards,
          req.mode,
          adapter.getOsInfo()?.majorVersion === 7,
          {
            bindMacOnFirstUse: req.switches.bindMacOnFirstUse,
            customer: req.umCustomer || 'admin',
          }
        );
        fs.writeFileSync(rscPath, rscContent, 'utf8');
      }

      // 9. Generate TXT Copy if enabled
      if (req.switches.saveTxtCopy) {
        txtPath = path.join(targetDir, `${baseFilename}.txt`);
        const txtLines = cards.map(
          (c) =>
            `${c.serial}\t${c.username}\t${c.password || ''}\t${c.profile}\t${c.price} ${c.currency}`
        );
        fs.writeFileSync(txtPath, txtLines.join('\r\n'), 'utf8');
      }

      // 10. Open File after add if enabled
      if (req.switches.openFileAfterAdd && pdfPath && fs.existsSync(pdfPath)) {
        shell.openPath(pdfPath);
      }

      notifyProgress({
        step: 'completed',
        current: cards.length,
        total: cards.length,
        message: 'تمت عملية التوليد والطباعة بنجاح تام!',
        pdfPath: req.switches.savePdf ? pdfPath : undefined,
        excelPath,
        rscPath,
        txtPath,
      });

      return {
        success: true,
        cardsCount: cards.length,
        batchId: cards[0].batchId,
        pdfPath: req.switches.savePdf ? pdfPath : undefined,
        excelPath,
        rscPath,
        txtPath,
      };
    } catch (err: any) {
      notifyProgress({
        step: 'error',
        current: 0,
        total: 0,
        message: err.message,
      });
      return { success: false, error: err.message };
    } finally {
      isGeneratingLock = false;
    }
  });

  // --- System File / Dialog Operations ---
  ipcMain.handle('system:selectDirectory', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر مجلد حفظ ملفات الطباعة',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('system:selectImage', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر صورة الخلفية أو الشعار',
      properties: ['openFile'],
      filters: [{ name: 'صور (Images)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'] }],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      const filePath = res.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1);
      return `data:image/${ext};base64,${buffer.toString('base64')}`;
    }
    return null;
  });

  ipcMain.handle('system:openPath', async (_, targetPath: string) => {
    if (fs.existsSync(targetPath)) {
      await shell.openPath(targetPath);
      return true;
    }
    return false;
  });

  ipcMain.handle('system:getFirewallProtectionScript', () => {
    return FirewallProtector.generateAntiGuessingScript();
  });
}
