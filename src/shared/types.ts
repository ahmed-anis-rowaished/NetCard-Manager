export type ConnectionType = 'ip' | 'domain';
export type MikroTikServiceMode = 'hotspot' | 'usermanager' | 'broadband';
export type CardFormatType = 'same_user_pass' | 'diff_user_pass' | 'user_only';
export type CharPatternType = 'numbers' | 'letters' | 'alphanumeric';

export interface ConnectionConfig {
  type: ConnectionType;
  octets: [string, string, string, string];
  domain: string;
  username: string;
  password: string;
  comment: string;
  port: number;
  useSsl: boolean;
  fastLogin: boolean;
  turboMode: boolean;
  saveUsername: boolean;
  savePassword: boolean;
}

export interface SavedDevice {
  id?: number;
  name: string;
  ip: string;
  domain: string;
  connectionType: ConnectionType;
  username: string;
  passwordEncrypted: string;
  port: number;
  useSsl: boolean;
  comment: string;
  fastLogin: boolean;
  turboMode: boolean;
  lastConnected?: string;
  createdAt?: string;
}

export interface MndpDevice {
  ip: string;
  mac: string;
  identity: string;
  platform: string;
  version: string;
  boardName: string;
  uptime?: string;
  interfaceName?: string;
}

export interface RouterOSInfo {
  version: string;
  majorVersion: 6 | 7;
  platform: string;
  boardName: string;
  uptime: string;
  cpuLoad: string;
  freeMemory: string;
  totalMemory: string;
  freeHdd: string;
  totalHdd: string;
}

export interface HotspotUserProfile {
  id: string;
  name: string;
  sharedUsers: number;
  rateLimit?: string;
  uptimeLimit?: string;
  bytesTotalLimit?: string;
  price?: number;
}

export interface UserManagerProfile {
  id: string;
  name: string;
  price: number;
  validity?: string;
  downloadLimit?: string;
  uploadLimit?: string;
}

export interface PppProfile {
  id: string;
  name: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
  onlyOne?: string;
}

export interface POSLocation {
  id?: number;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  commissionRate: number;
  notes?: string;
  createdAt?: string;
}

export type TemplateElementId =
  | 'username'
  | 'password'
  | 'serial'
  | 'dataLimit'
  | 'validity'
  | 'printDate'
  | 'time'
  | 'price'
  | 'barcode'
  | 'custom1'
  | 'custom2';

export interface TemplateElementConfig {
  id: TemplateElementId;
  label: string;
  enabled: boolean;
  xMm: number;
  yMm: number;
  fontFamily: string;
  fontSizePt: number;
  fontColor: string;
  isBold: boolean;
  isItalic: boolean;
  customText?: string;
  barcodeType?: 'qr' | 'code128';
  barcodeWidthMm?: number;
  barcodeHeightMm?: number;
}

export interface CardTemplate {
  id?: number;
  name: string;
  cardsPerPage: number;
  columnsCount: number;
  cardWidthMm: number;
  cardHeightMm: number;
  marginHorizontalMm: number;
  marginVerticalMm: number;
  hasBorder: boolean;
  borderSizePx: number;
  borderColor: string;
  showPageNumber: boolean;
  pageNumberX: number;
  pageNumberY: number;
  showUnits: boolean;
  showElementDetails: boolean;
  backgroundImageData?: string;
  hasBackgroundImage: boolean;
  logoImageData?: string;
  hasLogo: boolean;
  savePath: string;
  linkedProfileName?: string;
  currency: string;
  linkToPos: boolean;
  posId?: number;
  elements: TemplateElementConfig[];
  updatedAt?: string;
}

export interface GenerationSwitches {
  bindMacOnFirstUse: boolean;
  promptPdfLocation: boolean;
  exportExcel: boolean;
  savePdf: boolean;
  transactionSafety: boolean;
  saveTxtCopy: boolean;
  markPrinted: boolean;
  openFileAfterAdd: boolean;
  exportRscScript: boolean;
  offlineMode: boolean;
  guessProtection: boolean;
}

export interface CardBatchGenerationRequest {
  mode: MikroTikServiceMode;
  inputMethod: 'cards' | 'pages';
  cardsCount: number;
  pagesCount: number;
  prefix: string;
  suffix: string;
  cardFormat: CardFormatType;
  umCustomer: string;
  profileName: string;
  templateId: number;
  posId?: number;
  userPattern: CharPatternType;
  userLength: number;
  passPattern: CharPatternType;
  passLength: number;
  sharedUsers: number;
  switches: GenerationSwitches;
}

export interface GeneratedCard {
  id?: number;
  batchId: string;
  username: string;
  password?: string;
  serial: string;
  profile: string;
  mode: MikroTikServiceMode;
  dataLimit?: string;
  validity?: string;
  price?: number;
  currency?: string;
  custom1?: string;
  custom2?: string;
  templateId?: number;
  posId?: number;
  sharedUsers?: number;
  isPrinted: boolean;
  createdAt: string;
  routerIp?: string;
}

export interface GenerationProgress {
  step: 'generating' | 'pushing_router' | 'rendering_pdf' | 'exporting' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
  pdfPath?: string;
  excelPath?: string;
  rscPath?: string;
  txtPath?: string;
}
