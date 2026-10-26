import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { CardTemplate, GeneratedCard, TemplateElementConfig } from '../shared/types';
import { calculateA4GridLayout } from '../shared/defaults';
import { BarcodeGenerator } from './barcodeGenerator';

export class PdfGenerator {
  public static async generateCardGridPdf(
    cards: GeneratedCard[],
    template: CardTemplate,
    outputPath: string
  ): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      // Primary High-Fidelity Engine: Chromium Native PrintToPDF (100% Offline Arabic RTL & 300 DPI)
      return await this.generateViaChromium(cards, template, outputPath);
    } catch (err: any) {
      console.warn('[PdfGenerator] Falling back to jsPDF engine due to:', err.message);
      return await this.generateViaJsPdf(cards, template, outputPath);
    }
  }

  /**
   * Resolves an image input (Base64 data URI or local filesystem path)
   * into a valid DataURL image that Chromium can display offline without security blocks.
   */
  private static resolveImageData(imageOrPath?: string): string | undefined {
    if (!imageOrPath) return undefined;
    if (imageOrPath.startsWith('data:image/')) return imageOrPath;

    let cleanPath = imageOrPath.trim();
    if (cleanPath.startsWith('file:///')) {
      cleanPath = cleanPath.slice(8);
    } else if (cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.slice(7);
    }

    if (fs.existsSync(cleanPath)) {
      try {
        const buffer = fs.readFileSync(cleanPath);
        const ext = path.extname(cleanPath).slice(1).toLowerCase();
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        return `data:${mime};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.warn('[PdfGenerator] Could not read local image file:', cleanPath);
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Generates production-grade A4 PDF completely OFFLINE without external web font dependencies.
   * Uses Chromium's native text shaper with system Arabic fonts (Cairo, Tajawal, Segoe UI, Tahoma, Arial)
   * for zero latency and pristine connected RTL typography.
   * Loads HTML via temporary file and CSS classes to eliminate Chromium URL size limits.
   */
  private static async generateViaChromium(
    cards: GeneratedCard[],
    template: CardTemplate,
    outputPath: string
  ): Promise<string> {
    const layout = calculateA4GridLayout(template);
    const cardsPerPage = template.cardsPerPage || layout.cardsPerPage;
    const columns = template.columnsCount || layout.columns;
    const cardW = template.cardWidthMm || 63;
    const cardH = template.cardHeightMm || 30;
    const gapX = layout.gapX;
    const gapY = layout.gapY;
    const marginLeft = layout.marginLeftMm;
    const marginTop = layout.marginTopMm;

    const totalPages = Math.ceil(cards.length / cardsPerPage);

    // Resolve background and logo images to DataURLs
    const resolvedBgData = template.hasBackgroundImage
      ? this.resolveImageData(template.backgroundImageData)
      : undefined;

    const resolvedLogoData = template.hasLogo
      ? this.resolveImageData(template.logoImageData)
      : undefined;

    // Pre-generate Barcodes / QR codes
    const barcodeMap = new Map<string, string>();
    const hasBarcodeElem = template.elements.some((e) => e.id === 'barcode' && e.enabled);
    const barcodeElem = template.elements.find((e) => e.id === 'barcode');
    const isCode128 = barcodeElem?.barcodeType === 'code128';

    if (hasBarcodeElem) {
      for (const card of cards) {
        try {
          if (isCode128) {
            const bWidth = barcodeElem?.barcodeWidthMm || 28;
            const bHeight = barcodeElem?.barcodeHeightMm || 10;
            const dataUrl = BarcodeGenerator.generateCode128DataUrl(
              card.username,
              bWidth,
              bHeight
            );
            barcodeMap.set(card.username, dataUrl);
          } else {
            const qrData = card.password ? `${card.username}:${card.password}` : card.username;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
              margin: 0,
              width: 160,
              color: { dark: '#000000', light: '#ffffff' },
            });
            barcodeMap.set(card.username, qrDataUrl);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    let pagesHtml = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageCards = cards.slice((pageNum - 1) * cardsPerPage, pageNum * cardsPerPage);
      let cardsHtml = '';

      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        const col = i % columns;
        const row = Math.floor(i / columns);

        const cardLeft = marginLeft + col * (cardW + gapX);
        const cardTop = marginTop + row * (cardH + gapY);

        let elementsHtml = '';

        for (const el of template.elements) {
          if (!el.enabled) continue;

          if (el.id === 'barcode') {
            const bUrl = barcodeMap.get(card.username);
            if (bUrl) {
              const bWidth = el.barcodeWidthMm || 12;
              const bHeight = el.barcodeHeightMm || 12;
              elementsHtml += `
                <img src="${bUrl}" style="
                  position: absolute;
                  left: ${el.xMm}mm;
                  top: ${el.yMm}mm;
                  width: ${bWidth}mm;
                  height: ${bHeight}mm;
                  object-fit: contain;
                " />
              `;
            }
            continue;
          }

          let text = '';
          switch (el.id) {
            case 'username':
              text = card.username;
              break;
            case 'password':
              text = card.password || '';
              break;
            case 'serial':
              text = `SN: ${card.serial}`;
              break;
            case 'dataLimit':
              text = card.dataLimit || el.customText || '';
              break;
            case 'validity':
              text = card.validity || el.customText || '';
              break;
            case 'price':
              text = `${card.price ?? ''} ${card.currency || template.currency || 'ريال'}`.trim();
              break;
            case 'custom1':
              text = el.customText || card.custom1 || '';
              break;
            case 'custom2':
              text = el.customText || card.custom2 || '';
              break;
            case 'printDate':
              text = new Date().toLocaleDateString('ar-EG');
              break;
            case 'time':
              text = new Date().toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              });
              break;
          }

          if (text) {
            const fontStyle = el.isItalic ? 'italic' : 'normal';
            const fontWeight = el.isBold ? 'bold' : 'normal';
            elementsHtml += `
              <div style="
                position: absolute;
                left: ${el.xMm}mm;
                top: ${el.yMm}mm;
                font-family: '${el.fontFamily}', 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
                font-size: ${el.fontSizePt * 1.33}px;
                color: ${el.fontColor || '#000000'};
                font-style: ${fontStyle};
                font-weight: ${fontWeight};
                direction: rtl;
                white-space: nowrap;
                line-height: 1;
              ">${this.escapeHtml(text)}</div>
            `;
          }
        }

        const borderStyle = template.hasBorder
          ? `border: ${template.borderSizePx || 1}px solid ${template.borderColor || '#D1D5DB'};`
          : '';

        cardsHtml += `
          <div class="card-item card-bg" style="
            position: absolute;
            left: ${cardLeft}mm;
            top: ${cardTop}mm;
            width: ${cardW}mm;
            height: ${cardH}mm;
            box-sizing: border-box;
            overflow: hidden;
            ${borderStyle}
          ">
            ${resolvedLogoData ? '<div class="card-logo"></div>' : ''}
            ${elementsHtml}
          </div>
        `;
      }

      const pageNumHtml = template.showPageNumber
        ? `<div style="
            position: absolute;
            left: 0;
            right: 0;
            top: ${template.pageNumberY || 290}mm;
            text-align: center;
            font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
            font-size: 10px;
            color: #64748B;
          ">صفحة ${pageNum} من ${totalPages}</div>`
        : '';

      pagesHtml += `
        <div class="sheet-page" style="
          position: relative;
          width: 210mm;
          height: 297mm;
          page-break-after: always;
          overflow: hidden;
          background: #ffffff;
        ">
          ${cardsHtml}
          ${pageNumHtml}
        </div>
      `;
    }

    const bgCssRule = resolvedBgData
      ? `.card-bg { background-image: url('${resolvedBgData}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; }`
      : `.card-bg { background-color: #ffffff; }`;

    const logoCssRule = resolvedLogoData
      ? `.card-logo { position: absolute; left: 2mm; top: 2mm; width: 10mm; height: 10mm; background-image: url('${resolvedLogoData}'); background-size: contain; background-repeat: no-repeat; background-position: center; z-index: 5; }`
      : '';

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: #ffffff;
            }
            * {
              box-sizing: border-box;
            }
            .card-item {
              box-sizing: border-box;
              overflow: hidden;
            }
            ${bgCssRule}
            ${logoCssRule}
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `;

    const tempHtmlPath = path.join(
      app.getPath('temp'),
      `netcard_print_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.html`
    );
    await fs.promises.writeFile(tempHtmlPath, fullHtml, 'utf-8');

    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let finished = false;

      const cleanup = async () => {
        try {
          if (!win.isDestroyed()) win.close();
        } catch {}
        try {
          if (fs.existsSync(tempHtmlPath)) {
            await fs.promises.unlink(tempHtmlPath).catch(() => {});
          }
        } catch {}
      };

      const timer = setTimeout(async () => {
        if (!finished) {
          finished = true;
          await cleanup();
          reject(new Error('انتهت مهلة توليد ملف PDF (تجاوز 45 ثانية).'));
        }
      }, 45000);

      win.webContents.on('did-fail-load', async (_event, errorCode, errorDescription) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          await cleanup();
          reject(new Error(`فشل تحميل قالب الطباعة: ${errorDescription} (${errorCode})`));
        }
      });

      win.webContents.on('did-finish-load', async () => {
        if (finished) return;
        try {
          // Give Chromium 300ms to complete layout calculation, font substitutions, and barcode rendering
          await new Promise((resolve) => setTimeout(resolve, 300));

          const pdfBuffer = await win.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            },
          });

          const outDir = path.dirname(outputPath);
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }

          let finalPath = outputPath;
          try {
            fs.writeFileSync(finalPath, pdfBuffer);
          } catch (writeErr: any) {
            // If locked by another viewer, save with timestamp suffix rather than failing
            if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
              finalPath = outputPath.replace(/\.pdf$/i, `_${Date.now()}.pdf`);
              fs.writeFileSync(finalPath, pdfBuffer);
            } else {
              throw writeErr;
            }
          }

          finished = true;
          clearTimeout(timer);
          await cleanup();
          resolve(finalPath);
        } catch (err) {
          finished = true;
          clearTimeout(timer);
          await cleanup();
          reject(err);
        }
      });

      win.loadFile(tempHtmlPath).catch(async (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          await cleanup();
          reject(err);
        }
      });
    });
  }

  /**
   * Fallback jsPDF generation engine.
   */
  private static async generateViaJsPdf(
    cards: GeneratedCard[],
    template: CardTemplate,
    outputPath: string
  ): Promise<string> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const layout = calculateA4GridLayout(template);
    const cardsPerPage = template.cardsPerPage || layout.cardsPerPage;
    const columns = template.columnsCount || layout.columns;
    const cardW = template.cardWidthMm || 63;
    const cardH = template.cardHeightMm || 30;
    const gapX = layout.gapX;
    const gapY = layout.gapY;
    const marginLeft = layout.marginLeftMm;
    const marginTop = layout.marginTopMm;

    const totalPages = Math.ceil(cards.length / cardsPerPage);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) doc.addPage('a4', 'portrait');

      const pageCards = cards.slice((pageNum - 1) * cardsPerPage, pageNum * cardsPerPage);

      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        const col = i % columns;
        const row = Math.floor(i / columns);

        const cardX = marginLeft + col * (cardW + gapX);
        const cardY = marginTop + row * (cardH + gapY);

        if (template.hasBorder) {
          doc.rect(cardX, cardY, cardW, cardH);
        }

        for (const el of template.elements) {
          if (!el.enabled) continue;
          if (el.id === 'username') {
            doc.text(card.username, cardX + el.xMm, cardY + el.yMm);
          } else if (el.id === 'password' && card.password) {
            doc.text(card.password, cardX + el.xMm, cardY + el.yMm);
          }
        }
      }
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const pdfArrayBuffer = doc.output('arraybuffer');
    let finalPath = outputPath;
    try {
      fs.writeFileSync(finalPath, Buffer.from(pdfArrayBuffer));
    } catch (writeErr: any) {
      if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
        finalPath = outputPath.replace(/\.pdf$/i, `_${Date.now()}.pdf`);
        fs.writeFileSync(finalPath, Buffer.from(pdfArrayBuffer));
      } else {
        throw writeErr;
      }
    }
    return finalPath;
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
