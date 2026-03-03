/** Type declarations for the Electron preload API exposed on window.taAPI */

interface TaAPI {
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  listHistory: () => Promise<unknown[]>;
  appendHistory: (item: Record<string, unknown>) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  openSettings: () => void;
  toggleMiniPanel: () => void;
  notifySessionStatus: (active: boolean) => void;
  onStartSession: (cb: () => void) => () => void;
  onCaptureMoment: (cb: () => void) => () => void;
  onStopSession: (cb: () => void) => () => void;
}

interface Window {
  taAPI?: TaAPI;
}
