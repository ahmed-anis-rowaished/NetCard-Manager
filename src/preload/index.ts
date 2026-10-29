import { contextBridge, ipcRenderer } from 'electron';
import {
  ConnectionConfig,
  SavedDevice,
  CardTemplate,
  POSLocation,
  CardBatchGenerationRequest,
  MndpDevice,
  GenerationProgress,
  UserManagerV7UserItem,
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
  getHotspotServers: () => ipcRenderer.invoke('mikrotik:getHotspotServers'),
  createHotspotProfile: (data: any) => ipcRenderer.invoke('mikrotik:createHotspotProfile', data),
  updateHotspotProfile: (idOrName: string, data: any) =>
    ipcRenderer.invoke('mikrotik:updateHotspotProfile', idOrName, data),
  deleteHotspotProfile: (idOrName: string) => ipcRenderer.invoke('mikrotik:deleteHotspotProfile', idOrName),
  getUserManagerProfiles: () => ipcRenderer.invoke('mikrotik:getUserManagerProfiles'),
  createUserManagerProfile: (data: any) => ipcRenderer.invoke('mikrotik:createUserManagerProfile', data),
  updateUserManagerProfile: (idOrName: string, data: any) =>
    ipcRenderer.invoke('mikrotik:updateUserManagerProfile', idOrName, data),
  deleteUserManagerProfile: (idOrName: string) => ipcRenderer.invoke('mikrotik:deleteUserManagerProfile', idOrName),
  getUserManagerCustomers: () => ipcRenderer.invoke('mikrotik:getUserManagerCustomers'),
  getPppProfiles: () => ipcRenderer.invoke('mikrotik:getPppProfiles'),
  createPppProfile: (data: any) => ipcRenderer.invoke('mikrotik:createPppProfile', data),
  updatePppProfile: (idOrName: string, data: any) =>
    ipcRenderer.invoke('mikrotik:updatePppProfile', idOrName, data),
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

  // User Manager v7 Offline Cache & Live Operations
  syncUserManagerV7Users: (): Promise<{ success: boolean; count?: number; error?: string; users?: UserManagerV7UserItem[] }> =>
    ipcRenderer.invoke('userman7:syncFromRouter'),
  getCachedUserManagerV7Users: (): Promise<{ success: boolean; users: UserManagerV7UserItem[]; error?: string }> =>
    ipcRenderer.invoke('userman7:getLocalUsers'),
  addUserManagerV7User: (data: {
    username: string;
    password?: string;
    profile?: string;
    sharedUsers?: number;
    callerId?: string;
    comment?: string;
    group?: string;
  }): Promise<{ success: boolean; user?: UserManagerV7UserItem; error?: string }> =>
    ipcRenderer.invoke('userman7:addUser', data),
  updateUserManagerV7User: (
    id: string,
    username: string,
    data: {
      password?: string;
      profile?: string;
      sharedUsers?: number;
      callerId?: string;
      comment?: string;
      disabled?: boolean;
      group?: string;
    }
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('userman7:updateUser', id, username, data),
  deleteUserManagerV7Users: (ids: string[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('userman7:deleteUsers', ids),
  setUserManagerV7UserDisabled: (ids: string[], disabled: boolean): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('userman7:setDisabled', ids, disabled),
  assignUserManagerV7Profile: (
    users: { id: string; username: string }[],
    profileName: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('userman7:assignProfile', users, profileName),
  disconnectUserManagerV7Session: (username: string, id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('userman7:disconnectSession', username, id),
};

contextBridge.exposeInMainWorld('netcardAPI', netcardAPI);

export type NetCardAPI = typeof netcardAPI;
