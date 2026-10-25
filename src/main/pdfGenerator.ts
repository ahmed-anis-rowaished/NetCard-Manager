import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { CardTemplate, GeneratedCard } from '../shared/types';

export class PdfGenerator {
  public static async generateCardGridPdf(
    cards: GeneratedCard[],
    template: CardTemplate,
    outputPath: string
  ): Promise<string> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // 210mm x 297mm
    });

    const cardsPerPage = template.cardsPerPage || 51;
    const columns = template.columnsCount || 3;
    const cardW = template.cardWidthMm || 63;
    const cardH = template.cardHeightMm || 30;
    const marginH = template.marginHorizontalMm || 4;
    const marginV = template.marginVerticalMm || 4;

    const totalPages = Math.ceil(cards.length / cardsPerPage);

    // Pre-generate QR codes for cards
    const qrMap = new Map<string, string>();
    const hasBarcodeElem = template.elements.some((e) => e.id === 'barcode' && e.enabled);

    if (hasBarcodeElem) {
      for (const card of cards) {
        try {
          const qrData = card.password ? `${card.username}:${card.password}` : card.username;
          const qrDataUrl = await QRCode.toDataURL(qrData, {
            margin: 0,
            width: 150,
            color: { dark: '#000000', light: '#ffffff' },
          });
          qrMap.set(card.username, qrDataUrl);
        } catch {
          // ignore
        }
      }
    }

    let currentCardIndex = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) {
        doc.addPage('a4', 'portrait');
      }

      const pageCards = cards.slice(
        (pageNum - 1) * cardsPerPage,
        pageNum * cardsPerPage
      );

      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        const col = i % columns;
        const row = Math.floor(i / columns);

        const cardX = marginH + col * cardW;
        const cardY = marginV + row * cardH;

        // Draw Background Image if present
        if (template.hasBackgroundImage && template.backgroundImageData) {
          try {
            doc.addImage(
              template.backgroundImageData,
              'JPEG',
              cardX,
              cardY,
              cardW,
              cardH,
              undefined,
              'FAST'
            );
          } catch {
            // fallback
          }
        }

        // Draw Card Border
        if (template.hasBorder) {
          const rgb = this.hexToRgb(template.borderColor || '#D1D5DB');
          doc.setDrawColor(rgb.r, rgb.g, rgb.b);
          doc.setLineWidth((template.borderSizePx || 1) * 0.264583); // px to mm approx
          doc.rect(cardX, cardY, cardW, cardH);
        }

        // Draw Logo if present
        if (template.hasLogo && template.logoImageData) {
          try {
            doc.addImage(template.logoImageData, 'PNG', cardX + 2, cardY + 2, 10, 10);
          } catch {
            // ignore
          }
        }

        // Render Card Elements
        for (const el of template.elements) {
          if (!el.enabled) continue;

          const elemX = cardX + el.xMm;
          const elemY = cardY + el.yMm;

          if (el.id === 'barcode') {
            const qrUri = qrMap.get(card.username);
            if (qrUri) {
              const bWidth = el.barcodeWidthMm || 12;
              const bHeight = el.barcodeHeightMm || 12;
              try {
                doc.addImage(qrUri, 'PNG', elemX, elemY, bWidth, bHeight);
              } catch {
                // ignore
              }
            }
            continue;
          }

          // Text content resolver
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
            const rgb = this.hexToRgb(el.fontColor || '#000000');
            doc.setTextColor(rgb.r, rgb.g, rgb.b);
            doc.setFontSize(el.fontSizePt || 10);

            let fontStyle = 'normal';
            if (el.isBold && el.isItalic) fontStyle = 'bolditalic';
            else if (el.isBold) fontStyle = 'bold';
            else if (el.isItalic) fontStyle = 'italic';
            doc.setFont('Helvetica', fontStyle);

            doc.text(text, elemX, elemY);
          }
        }
      }

      // Draw Page Number
      if (template.showPageNumber) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `صفحة ${pageNum} من ${totalPages}`,
          template.pageNumberX || 100,
          template.pageNumberY || 290,
          { align: 'center' }
        );
      }
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const pdfArrayBuffer = doc.output('arraybuffer');
    fs.writeFileSync(outputPath, Buffer.from(pdfArrayBuffer));
    return outputPath;
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
}
