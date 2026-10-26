import { contextBridge, ipcRenderer } from 'electron';
import {
  ConnectionConfig,
  SavedDevice,
  CardTemplate,
  POSLocation,
  CardBatchGenerationRequest,
  MndpDevice,
  GenerationProgress,
} from '../shared/types';

const netcardAPI = {
  // MNDP
  startMndp: () => ipcRenderer.invoke('mndp:start'),
  stopMndp: () => ipcRenderer.invoke('mndp:stop'),
  getMndpDevices: () => ipcRenderer.invoke('mndp:getDevices'),
  scanMndp: () => ipcRenderer.invoke('mndp:scan'),
  onMndpDevicesUpdated: (callback: (devices: MndpDevice[]) => void) => {
    const listener = (_: any, devices: MndpDevice[]) => callback(devices);
    ipcRenderer.on('mndp:devicesUpdated', listener);
    return () => ipcRenderer.removeListener('mndp:devicesUpdated', listener);
  },

  // MikroTik
  connectMikroTik: (config: ConnectionConfig) => ipcRenderer.invoke('mikrotik:connect', config),
  disconnectMikroTik: () => ipcRenderer.invoke('mikrotik:disconnect'),
  getMikroTikStatus: () => ipcRenderer.invoke('mikrotik:getStatus'),
  getDashboardData: () => ipcRenderer.invoke('mikrotik:getDashboardData'),
  getHotspotProfiles: () => ipcRenderer.invoke('mikrotik:getHotspotProfiles'),
  createHotspotProfile: (data: any) => ipcRenderer.invoke('mikrotik:createHotspotProfile', data),
  deleteHotspotProfile: (idOrName: string) => ipcRenderer.invoke('mikrotik:deleteHotspotProfile', idOrName),
  getUserManagerProfiles: () => ipcRenderer.invoke('mikrotik:getUserManagerProfiles'),
  createUserManagerProfile: (data: any) => ipcRenderer.invoke('mikrotik:createUserManagerProfile', data),
  deleteUserManagerProfile: (idOrName: string) => ipcRenderer.invoke('mikrotik:deleteUserManagerProfile', idOrName),
  getUserManagerCustomers: () => ipcRenderer.invoke('mikrotik:getUserManagerCustomers'),
  getPppProfiles: () => ipcRenderer.invoke('mikrotik:getPppProfiles'),
  createPppProfile: (data: any) => ipcRenderer.invoke('mikrotik:createPppProfile', data),
  deletePppProfile: (idOrName: string) => ipcRenderer.invoke('mikrotik:deletePppProfile', idOrName),

  // Database
  getSavedDevices: () => ipcRenderer.invoke('db:getSavedDevices'),
  saveDevice: (dev: SavedDevice) => ipcRenderer.invoke('db:saveDevice', dev),
  deleteDevice: (id: number) => ipcRenderer.invoke('db:deleteDevice', id),

  getTemplates: () => ipcRenderer.invoke('db:getTemplates'),
  saveTemplate: (tmpl: CardTemplate) => ipcRenderer.invoke('db:saveTemplate', tmpl),
  deleteTemplate: (id: number) => ipcRenderer.invoke('db:deleteTemplate', id),

  getPosLocations: () => ipcRenderer.invoke('db:getPosLocations'),
  savePosLocation: (pos: POSLocation) => ipcRenderer.invoke('db:savePosLocation', pos),
  deletePosLocation: (id: number) => ipcRenderer.invoke('db:deletePosLocation', id),

  getProfileMetadata: (mode?: string) => ipcRenderer.invoke('db:getProfileMetadata', mode),
  saveProfileMetadata: (meta: any) => ipcRenderer.invoke('db:saveProfileMetadata', meta),
  deleteProfileMetadata: (mode: string, name: string) =>
    ipcRenderer.invoke('db:deleteProfileMetadata', mode, name),
  clearDemoData: () => ipcRenderer.invoke('db:clearDemoData'),

  getCardsArchive: (batchId?: string) => ipcRenderer.invoke('db:getCardsArchive', batchId),
  updateCardPrintedStatus: (ids: number[], isPrinted: boolean) =>
    ipcRenderer.invoke('db:updateCardPrintedStatus', ids, isPrinted),

  // Generator
  executeBatch: (req: CardBatchGenerationRequest) => ipcRenderer.invoke('generator:executeBatch', req),
  onGeneratorProgress: (callback: (p: GenerationProgress) => void) => {
    const listener = (_: any, p: GenerationProgress) => callback(p);
    ipcRenderer.on('generator:progress', listener);
    return () => ipcRenderer.removeListener('generator:progress', listener);
  },

  // System
  selectDirectory: () => ipcRenderer.invoke('system:selectDirectory'),
  selectImage: () => ipcRenderer.invoke('system:selectImage'),
  fileToDataUrl: (filePath: string) => ipcRenderer.invoke('system:fileToDataUrl', filePath),
  openPath: (targetPath: string) => ipcRenderer.invoke('system:openPath', targetPath),
  getFirewallProtectionScript: () => ipcRenderer.invoke('system:getFirewallProtectionScript'),
};

contextBridge.exposeInMainWorld('netcardAPI', netcardAPI);

export type NetCardAPI = typeof netcardAPI;
