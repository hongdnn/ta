import { contextBridge, ipcRenderer } from 'electron';

/**
 * TA Preload — exposes a safe, typed API to the renderer via contextBridge.
 * No Node.js APIs are leaked to the renderer.
 */

const taAPI = {
  // ── Share sources ───────────────────────────
  getScreenPermissionStatus: (): Promise<string> =>
    ipcRenderer.invoke('ta:get-screen-permission-status'),

  requestScreenPermission: (): Promise<string> =>
    ipcRenderer.invoke('ta:request-screen-permission'),

  openScreenPermissionSettings: (): Promise<void> =>
    ipcRenderer.invoke('ta:open-screen-permission-settings'),

  listShareSources: (): Promise<unknown[]> =>
    ipcRenderer.invoke('ta:list-share-sources'),

  getSourceFrame: (sourceId: string): Promise<string | null> =>
    ipcRenderer.invoke('ta:get-source-frame', sourceId),

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

  nativeAudioStart: (
    source: { id: string; type: 'screen' | 'window' | 'tab'; name: string }
  ): Promise<unknown> => ipcRenderer.invoke('ta:native-audio-start', source),

  nativeAudioStop: (): Promise<void> => ipcRenderer.invoke('ta:native-audio-stop'),

  nativeAudioGetSlice: (seconds: number): Promise<Uint8Array | null> =>
    ipcRenderer.invoke('ta:native-audio-get-slice', seconds),

  nativeAudioDebug: (seconds: number): Promise<unknown> =>
    ipcRenderer.invoke('ta:native-audio-debug', seconds),

  setDisplayMediaSource: (sourceId: string): Promise<void> =>
    ipcRenderer.invoke('ta:set-display-media-source', sourceId),

  log: (
    level: 'info' | 'warn' | 'error',
    message: string,
    meta?: unknown
  ): void => ipcRenderer.send('ta:renderer-log', level, message, meta),

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
