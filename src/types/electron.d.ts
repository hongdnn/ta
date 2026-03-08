/** Type declarations for the Electron preload API exposed on window.taAPI */

interface TaAPI {
  getScreenPermissionStatus: () => Promise<string>;
  requestScreenPermission: () => Promise<string>;
  openScreenPermissionSettings: () => Promise<void>;
  listShareSources: () => Promise<unknown[]>;
  getSourceFrame: (sourceId: string) => Promise<string | null>;
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  listHistory: () => Promise<unknown[]>;
  appendHistory: (item: Record<string, unknown>) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  openSettings: () => void;
  toggleMiniPanel: () => void;
  notifySessionStatus: (active: boolean) => void;
  nativeAudioStart: (source: { id: string; type: 'screen' | 'window' | 'tab'; name: string }) => Promise<unknown>;
  nativeAudioStop: () => Promise<void>;
  nativeAudioGetSlice: (seconds: number) => Promise<Uint8Array | null>;
  nativeAudioDebug: (seconds: number) => Promise<unknown>;
  setDisplayMediaSource: (sourceId: string) => Promise<void>;
  log: (level: 'info' | 'warn' | 'error', message: string, meta?: unknown) => void;
  onStartSession: (cb: () => void) => () => void;
  onCaptureMoment: (cb: () => void) => () => void;
  onStopSession: (cb: () => void) => () => void;
}

interface Window {
  taAPI?: TaAPI;
}
