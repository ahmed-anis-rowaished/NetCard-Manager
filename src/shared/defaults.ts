import { CardTemplate, TemplateElementConfig, ConnectionConfig, GenerationSwitches } from './types';

export const DEFAULT_ELEMENTS: TemplateElementConfig[] = [
  {
    id: 'username',
    label: 'رمز الدخول',
    enabled: true,
    xMm: 22,
    yMm: 14,
    fontFamily: 'Cairo',
    fontSizePt: 12,
    fontColor: '#000000',
    isBold: true,
    isItalic: false,
  },
  {
    id: 'password',
    label: 'كلمة السر',
    enabled: true,
    xMm: 22,
    yMm: 21,
    fontFamily: 'Cairo',
    fontSizePt: 11,
    fontColor: '#000000',
    isBold: true,
    isItalic: false,
  },
  {
    id: 'serial',
    label: 'رقم تسلسلي',
    enabled: true,
    xMm: 5,
    yMm: 27,
    fontFamily: 'Tajawal',
    fontSizePt: 7,
    fontColor: '#4B5563',
    isBold: false,
    isItalic: false,
  },
  {
    id: 'dataLimit',
    label: 'الحجم',
    enabled: true,
    xMm: 5,
    yMm: 8,
    fontFamily: 'Tajawal',
    fontSizePt: 9,
    fontColor: '#1E40AF',
    isBold: true,
    isItalic: false,
    customText: '1 GB',
  },
  {
    id: 'validity',
    label: 'الصلاحية',
    enabled: true,
    xMm: 5,
    yMm: 14,
    fontFamily: 'Tajawal',
    fontSizePt: 8,
    fontColor: '#047857',
    isBold: true,
    isItalic: false,
    customText: '3 أيام',
  },
  {
    id: 'printDate',
    label: 'تاريخ الطباعة',
    enabled: false,
    xMm: 35,
    yMm: 27,
    fontFamily: 'Tajawal',
    fontSizePt: 6,
    fontColor: '#6B7280',
    isBold: false,
    isItalic: false,
  },
  {
    id: 'time',
    label: 'الوقت',
    enabled: false,
    xMm: 45,
    yMm: 27,
    fontFamily: 'Tajawal',
    fontSizePt: 6,
    fontColor: '#6B7280',
    isBold: false,
    isItalic: false,
  },
  {
    id: 'price',
    label: 'السعر',
    enabled: true,
    xMm: 38,
    yMm: 8,
    fontFamily: 'Cairo',
    fontSizePt: 10,
    fontColor: '#DC2626',
    isBold: true,
    isItalic: false,
    customText: '200 ريال',
  },
  {
    id: 'barcode',
    label: 'باركود (QR / Barcode)',
    enabled: true,
    xMm: 40,
    yMm: 14,
    fontFamily: 'Cairo',
    fontSizePt: 8,
    fontColor: '#000000',
    isBold: false,
    isItalic: false,
    barcodeType: 'qr',
    barcodeWidthMm: 12,
    barcodeHeightMm: 12,
  },
  {
    id: 'custom1',
    label: 'تفاصيل 1',
    enabled: true,
    xMm: 5,
    yMm: 21,
    fontFamily: 'Tajawal',
    fontSizePt: 7,
    fontColor: '#374151',
    isBold: false,
    isItalic: false,
    customText: 'للتواصل: 777777777',
  },
  {
    id: 'custom2',
    label: 'تفاصيل 2',
    enabled: false,
    xMm: 5,
    yMm: 24,
    fontFamily: 'Tajawal',
    fontSizePt: 7,
    fontColor: '#6B7280',
    isBold: false,
    isItalic: false,
    customText: 'تسجيل الدخول: wifi.net',
  },
];

export interface A4GridLayoutResult {
  columns: number;
  rows: number;
  cardsPerPage: number;
  printableWidthMm: number;
  printableHeightMm: number;
  gapX: number;
  gapY: number;
  marginLeftMm: number;
  marginTopMm: number;
}

/**
 * Geometric calculation of cards layout on standard A4 paper (210mm x 297mm).
 * Applies 3mm safe margins on all 4 sides (204mm x 291mm printable).
 */
export function calculateA4GridLayout(template: {
  cardWidthMm: number;
  cardHeightMm: number;
  marginHorizontalMm?: number;
  marginVerticalMm?: number;
  enableMargin?: boolean;
}): A4GridLayoutResult {
  const printableW = 204; // 210mm - 6mm page margins
  const printableH = 291; // 297mm - 6mm page margins

  const cardW = Math.max(10, template.cardWidthMm || 63);
  const cardH = Math.max(10, template.cardHeightMm || 30);

  const isMarginEnabled = template.enableMargin !== false;
  const gapX = isMarginEnabled ? (template.marginHorizontalMm ?? 0) : 0;
  const gapY = isMarginEnabled ? (template.marginVerticalMm ?? 0) : 0;

  const columns = Math.max(1, Math.floor((printableW + gapX) / (cardW + gapX)));
  const rows = Math.max(1, Math.floor((printableH + gapY) / (cardH + gapY)));
  const cardsPerPage = columns * rows;

  const usedW = columns * cardW + Math.max(0, columns - 1) * gapX;
  const usedH = rows * cardH + Math.max(0, rows - 1) * gapY;
  const marginLeftMm = Math.max(3, (210 - usedW) / 2);
  const marginTopMm = Math.max(3, (297 - usedH) / 2);

  return {
    columns,
    rows,
    cardsPerPage,
    printableWidthMm: printableW,
    printableHeightMm: printableH,
    gapX,
    gapY,
    marginLeftMm,
    marginTopMm,
  };
}

export const DEFAULT_TEMPLATE: CardTemplate = {
  id: 1,
  name: '200RY - القياسي (51 كرت)',
  cardsPerPage: 51,
  columnsCount: 3,
  cardWidthMm: 63,
  cardHeightMm: 30,
  marginHorizontalMm: 4,
  marginVerticalMm: 4,
  enableMargin: true,
  hasBorder: true,
  borderSizePx: 1,
  borderColor: '#D1D5DB',
  showPageNumber: true,
  pageNumberX: 100,
  pageNumberY: 290,
  showUnits: true,
  showElementDetails: true,
  hasBackgroundImage: false,
  hasLogo: false,
  savePath: '',
  currency: 'ريال',
  linkToPos: false,
  elements: DEFAULT_ELEMENTS,
};

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  type: 'ip',
  octets: ['192', '168', '88', '1'],
  domain: '',
  username: 'admin',
  password: '',
  comment: 'راوتر رئيسي',
  port: 8728,
  useSsl: false,
  fastLogin: false,
  turboMode: true,
  saveUsername: true,
  savePassword: true,
};

export const DEFAULT_GENERATION_SWITCHES: GenerationSwitches = {
  bindMacOnFirstUse: true,
  promptPdfLocation: false,
  exportExcel: true,
  savePdf: true,
  transactionSafety: true,
  saveTxtCopy: false,
  markPrinted: true,
  openFileAfterAdd: true,
  exportRscScript: true,
  offlineMode: false,
  guessProtection: true,
};
