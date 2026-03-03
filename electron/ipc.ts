import { ipcMain, app } from 'electron';
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

// ── IPC Handlers ─────────────────────────────────────────────

export function setupIpcHandlers() {
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
