import { ipcMain, app, desktopCapturer, shell, systemPreferences } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * JSON-file persistence in Electron's userData directory.
 * Files: settings.json, history.json
 */

function getDataPath(filename: string) {
  return path.join(app.getPath('userData'), filename);
}

function readJSON(filename: string, fallback: unknown = {}) {
  try {
    const raw = fs.readFileSync(getDataPath(filename), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(filename: string, data: unknown) {
  fs.writeFileSync(getDataPath(filename), JSON.stringify(data, null, 2), 'utf-8');
}

function getScreenPermissionStatus() {
  if (process.platform !== 'darwin') return 'granted';
  return systemPreferences.getMediaAccessStatus('screen');
}

// ── IPC Handlers ─────────────────────────────────────────────

export function setupIpcHandlers() {
  ipcMain.handle('ta:get-screen-permission-status', () => {
    return getScreenPermissionStatus();
  });

  ipcMain.handle('ta:request-screen-permission', async () => {
    if (process.platform !== 'darwin') return 'granted';
    try {
      // Trigger native prompt on first use for screen capture permission.
      await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 },
      });
    } catch {
      // Status will still be reported below.
    }
    return getScreenPermissionStatus();
  });

  ipcMain.handle('ta:open-screen-permission-settings', async () => {
    if (process.platform === 'darwin') {
      await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      );
      return;
    }
    if (process.platform === 'win32') {
      await shell.openExternal('ms-settings:privacy-screenrecording');
    }
  });

  ipcMain.handle('ta:list-share-sources', async () => {
    const permissionStatus = getScreenPermissionStatus();
    if (permissionStatus !== 'granted') {
      throw new Error(`SCREEN_PERMISSION_${permissionStatus}`);
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 640, height: 360 },
      fetchWindowIcons: true,
    });

    return sources.map((source) => {
      const isScreen = source.id.startsWith('screen:');
      return {
        id: source.id,
        type: isScreen ? 'screen' : 'window',
        name: source.name,
        thumbnail: source.thumbnail.isEmpty() ? '' : source.thumbnail.toDataURL(),
      };
    });
  });

  ipcMain.handle('ta:get-source-frame', async (_e, sourceId: string) => {
    const permissionStatus = getScreenPermissionStatus();
    if (permissionStatus !== 'granted') {
      throw new Error(`SCREEN_PERMISSION_${permissionStatus}`);
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 1280, height: 720 },
    });
    const source = sources.find((item) => item.id === sourceId);
    if (!source || source.thumbnail.isEmpty()) {
      return null;
    }
    return source.thumbnail.toDataURL();
  });

  // Settings
  ipcMain.handle('ta:get-settings', () => {
    return readJSON('settings.json', {
      hotkey: 'Ctrl+Shift+Space',
      captureDuration: 20,
      includeAudio: true,
      compactMiniPanel: false,
      localOnly: true,
      autoSaveCaptures: false,
    });
  });

  ipcMain.handle('ta:save-settings', (_e, settings: Record<string, unknown>) => {
    writeJSON('settings.json', settings);
  });

  // History
  ipcMain.handle('ta:list-history', () => {
    return readJSON('history.json', []);
  });

  ipcMain.handle('ta:append-history', (_e, item: Record<string, unknown>) => {
    const history = readJSON('history.json', []) as unknown[];
    history.unshift(item);
    writeJSON('history.json', history);
  });

  ipcMain.handle('ta:delete-history', (_e, id: string) => {
    const history = readJSON('history.json', []) as Array<{ id?: string }>;
    writeJSON('history.json', history.filter((h) => h.id !== id));
  });
}
