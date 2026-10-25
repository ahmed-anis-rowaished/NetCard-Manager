/// <reference types="vite/client" />

import { NetCardAPI } from '../../preload/index';

declare global {
  interface Window {
    netcardAPI: NetCardAPI;
  }
}
