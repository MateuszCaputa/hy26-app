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
  garminConnect: (email, password) => ipcRenderer.invoke('garmin-connect', email, password),
  garminDisconnect: () => ipcRenderer.invoke('garmin-disconnect'),
  garminSync: () => ipcRenderer.invoke('garmin-sync'),
  activityStatus: () => ipcRenderer.invoke('activity-status'),
  wipeData: () => ipcRenderer.invoke('wipe-data'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openMain: (view) => ipcRenderer.send('open-main', view),
  moveWidget: (x, y, done) => ipcRenderer.send('widget-move', x, y, done),
};

contextBridge.exposeInMainWorld('postura', api);
