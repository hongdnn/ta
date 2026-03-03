import { contextBridge, ipcRenderer } from 'electron';

/**
 * TA Preload — exposes a safe, typed API to the renderer via contextBridge.
 * No Node.js APIs are leaked to the renderer.
 */

const taAPI = {
  // ── Settings ────────────────────────────────
  getSettings: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('ta:get-settings'),

  saveSettings: (settings: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('ta:save-settings', settings),

  // ── History ─────────────────────────────────
  listHistory: (): Promise<unknown[]> =>
    ipcRenderer.invoke('ta:list-history'),

  appendHistory: (item: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('ta:append-history', item),

  deleteHistory: (id: string): Promise<void> =>
    ipcRenderer.invoke('ta:delete-history', id),

  // ── Window management ───────────────────────
  openSettings: (): void => ipcRenderer.send('ta:open-settings'),

  toggleMiniPanel: (): void => ipcRenderer.send('ta:toggle-mini-panel'),

  notifySessionStatus: (active: boolean): void =>
    ipcRenderer.send('ta:session-status-changed', active),

  // ── Events from main process ────────────────
  onStartSession: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('ta:start-session', handler);
    return () => ipcRenderer.removeListener('ta:start-session', handler);
  },

  onCaptureMoment: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('ta:capture-moment', handler);
    return () => ipcRenderer.removeListener('ta:capture-moment', handler);
  },

  onStopSession: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('ta:stop-session', handler);
    return () => ipcRenderer.removeListener('ta:stop-session', handler);
  },
};

contextBridge.exposeInMainWorld('taAPI', taAPI);

export type TaAPI = typeof taAPI;
