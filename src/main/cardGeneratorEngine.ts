import crypto from 'crypto';
import {
  CardBatchGenerationRequest,
  GeneratedCard,
  CardTemplate,
  CharPatternType,
} from '../shared/types';

export class CardGeneratorEngine {
  private static readonly NUMBERS = '0123456789';
  private static readonly LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'; // omitting confusing l/1/O/0
  private static readonly ALPHANUMERIC = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';

  public static generateBatch(
    req: CardBatchGenerationRequest,
    template: CardTemplate,
    routerIp?: string
  ): GeneratedCard[] {
    const cardsPerPage = template.cardsPerPage || 51;
    let totalCards = req.cardsCount;

    if (req.inputMethod === 'pages') {
      totalCards = (req.pagesCount || 1) * cardsPerPage;
    }

    const batchId = Date.now().toString(36).toUpperCase();
    const nowIso = new Date().toISOString();
    const usedUsernames = new Set<string>();
    const cards: GeneratedCard[] = [];

    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD

    // Extract custom details or profile defaults from template elements
    const dataLimitEl = template.elements.find((e) => e.id === 'dataLimit');
    const validityEl = template.elements.find((e) => e.id === 'validity');
    const priceEl = template.elements.find((e) => e.id === 'price');
    const custom1El = template.elements.find((e) => e.id === 'custom1');
    const custom2El = template.elements.find((e) => e.id === 'custom2');

    const cleanPrice = priceEl?.customText ? parseFloat(priceEl.customText) : 200;

    for (let i = 0; i < totalCards; i++) {
      // 1. Generate unique Username
      let username = '';
      let attempts = 0;
      do {
        attempts++;
        const core = this.generateRandomString(req.userPattern, req.userLength || 8);
        username = `${req.prefix || ''}${core}${req.suffix || ''}`;
      } while (usedUsernames.has(username) && attempts < 1000);

      usedUsernames.add(username);

      // 2. Generate Password
      let password = '';
      if (req.cardFormat === 'same_user_pass') {
        password = username;
      } else if (req.cardFormat === 'diff_user_pass') {
        password = this.generateRandomString(req.passPattern, req.passLength || 6);
      } else {
        // user_only
        password = '';
      }

      // 3. Generate Serial Number
      const serialRandom = crypto.randomInt(100000, 999999);
      const serial = `${datePrefix}${serialRandom}`;

      cards.push({
        batchId,
        username,
        password,
        serial,
        profile: req.profileName || template.linkedProfileName || 'default',
        mode: req.mode,
        dataLimit: dataLimitEl?.customText || '',
        validity: validityEl?.customText || '',
        price: cleanPrice,
        currency: template.currency || 'ريال',
        custom1: custom1El?.customText || '',
        custom2: custom2El?.customText || '',
        templateId: template.id,
        posId: req.posId,
        isPrinted: req.switches.markPrinted,
        createdAt: nowIso,
        routerIp,
      });
    }

    return cards;
  }

  private static generateRandomString(pattern: CharPatternType, length: number): string {
    let chars = this.NUMBERS;
    if (pattern === 'letters') chars = this.LETTERS;
    if (pattern === 'alphanumeric') chars = this.ALPHANUMERIC;

    let res = '';
    const charLen = chars.length;
    for (let i = 0; i < length; i++) {
      const idx = crypto.randomInt(0, charLen);
      res += chars[idx];
    }
    return res;
  }
}
