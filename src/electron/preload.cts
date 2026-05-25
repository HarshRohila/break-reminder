import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('breakReminder', {
  getStatus: (): Promise<unknown> => ipcRenderer.invoke('get-status'),
  quit: (): void => ipcRenderer.send('quit-app'),
});
