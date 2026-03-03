import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell,
} from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let miniPanel: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = !app.isPackaged;

function getPreloadPath() {
  return path.join(__dirname, 'preload.js');
}

function getRendererURL(route = '/') {
  if (isDev) {
    return `http://localhost:8080${route}`;
  }
  return `file://${path.join(__dirname, '../dist/index.html')}#${route}`;
}

// ── Main Window ──────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'TA',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(getRendererURL('/home'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to unknown origins
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (isDev && url.startsWith('http://localhost')) return;
    e.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Floating Mini Panel ──────────────────────────────────────

function createMiniPanel() {
  if (miniPanel) {
    miniPanel.focus();
    return;
  }

  miniPanel = new BrowserWindow({
    width: 320,
    height: 180,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  miniPanel.loadURL(getRendererURL('/mini-panel'));

  miniPanel.on('closed', () => {
    miniPanel = null;
  });
}

function toggleMiniPanel() {
  if (miniPanel) {
    miniPanel.close();
    miniPanel = null;
  } else {
    createMiniPanel();
  }
}

// ── Settings Window ──────────────────────────────────────────

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 620,
    resizable: false,
    title: 'TA — Settings',
    parent: mainWindow ?? undefined,
    modal: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  settingsWindow.loadURL(getRendererURL('/settings'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ── Tray ─────────────────────────────────────────────────────

function createTray() {
  // Use a simple 16x16 icon; replace with a real icon in production
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('TA — Teaching Assistant');
  updateTrayMenu(false);
}

function updateTrayMenu(sessionActive: boolean) {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: 'Start Session',
      enabled: !sessionActive,
      click: () => {
        mainWindow?.webContents.send('ta:start-session');
        mainWindow?.show();
      },
    },
    {
      label: 'Capture Moment',
      enabled: sessionActive,
      click: () => mainWindow?.webContents.send('ta:capture-moment'),
    },
    { type: 'separator' },
    {
      label: 'Open App',
      click: () => mainWindow?.show(),
    },
    {
      label: 'Toggle Mini Panel',
      enabled: sessionActive,
      click: toggleMiniPanel,
    },
    {
      label: 'Stop Session',
      enabled: sessionActive,
      click: () => mainWindow?.webContents.send('ta:stop-session'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(menu);
}

// ── Global Shortcuts ─────────────────────────────────────────

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.webContents.send('ta:capture-moment');
  });
}

// ── IPC: Window management ───────────────────────────────────

function setupWindowIpc() {
  ipcMain.on('ta:open-settings', () => createSettingsWindow());
  ipcMain.on('ta:toggle-mini-panel', () => toggleMiniPanel());
  ipcMain.on('ta:session-status-changed', (_e, active: boolean) => {
    updateTrayMenu(active);
  });
}

// ── App lifecycle ────────────────────────────────────────────

app.whenReady().then(() => {
  setupIpcHandlers();
  setupWindowIpc();
  createMainWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (!mainWindow) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
