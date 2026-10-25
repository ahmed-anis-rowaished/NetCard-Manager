import { app, BrowserWindow } from 'electron';
import path from 'path';
import { AppDatabase } from './database';
import { MikroTikAdapter } from './mikrotikAdapter';
import { MndpListener } from './mndpListener';
import { setupIpcHandlers } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;
const db = new AppDatabase();
const adapter = new MikroTikAdapter();
const mndp = new MndpListener();

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: 'NetCard Manager - مدير كروت المايكروتك الاحترافي',
    backgroundColor: '#130624',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Initialize DB and IPC
  await db.initialize();
  setupIpcHandlers(db, adapter, mndp, mainWindow);

  // Auto-start MNDP listener
  mndp.startListening();

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  mndp.stopListening();
  adapter.disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
