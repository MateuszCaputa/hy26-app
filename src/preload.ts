import { contextBridge, ipcRenderer } from 'electron';
import type { PosturaApi } from './shared/api';

const api: PosturaApi = {
  init: () => ipcRenderer.invoke('init'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  saveCalibration: (c) => ipcRenderer.invoke('save-calibration', c),
  ensureModels: () => ipcRenderer.invoke('ensure-models'),
  onModelsProgress: (cb) => ipcRenderer.on('models-progress', (_e, p: number, f: string) => cb(p, f)),
  sendMinute: (s) => ipcRenderer.send('minute', s),
  sendStatus: (s) => ipcRenderer.send('status', s),
  notify: (n) => ipcRenderer.send('notify', n),
  logEvent: (e) => ipcRenderer.send('event', e),
  getStats: () => ipcRenderer.invoke('get-stats'),
  setPaused: (p) => ipcRenderer.send('set-paused', p),
  onPaused: (cb) => ipcRenderer.on('paused', (_e, p: boolean) => cb(p)),
  onNavigate: (cb) => ipcRenderer.on('navigate', (_e, v: string) => cb(v)),
  onShowBreak: (cb) => ipcRenderer.on('show-break', () => cb()),
  onStatus: (cb) => ipcRenderer.on('status', (_e, s) => cb(s)),
  activityStatus: () => ipcRenderer.invoke('activity-status'),
  wipeData: () => ipcRenderer.invoke('wipe-data'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  setTrayBadge: (png) => ipcRenderer.send('tray-badge', png),
  openMain: (view) => ipcRenderer.send('open-main', view),
  moveWidget: (x, y, done) => ipcRenderer.send('widget-move', x, y, done),
  onNudge: (cb) => ipcRenderer.on('nudge', (_e, n) => cb(n)),
  nudgeAction: (a) => ipcRenderer.send('nudge-action', a),
  onNudgeAction: (cb) => ipcRenderer.on('nudge-action', (_e, a) => cb(a)),
};

contextBridge.exposeInMainWorld('postura', api);
