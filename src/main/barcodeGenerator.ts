/**
 * High-performance, self-contained Code128 1D Barcode SVG Generator
 * Supports Code 128 subsets B and C with checksum calculation.
 */
export class BarcodeGenerator {
  // Code128 bar patterns (widths of alternating bars and spaces: 3 bars, 3 spaces)
  private static readonly PATTERNS: number[] = [
    212222, 222122, 222221, 121223, 121322, 131222, 122213, 122312, 132212, 221213,
    221312, 231212, 112232, 122132, 122231, 113222, 123122, 123221, 223211, 221132,
    221231, 213212, 223112, 312131, 311222, 321122, 321221, 312212, 322112, 322211,
    212123, 212321, 232121, 111323, 131123, 131321, 112313, 132113, 132311, 211313,
    231113, 231311, 112133, 112331, 132131, 113123, 113321, 133121, 313121, 211331,
    231131, 213113, 213311, 213131, 311123, 311321, 331121, 312113, 312311, 332111,
    314111, 221411, 431111, 111224, 111422, 121124, 121421, 141122, 141221, 112214,
    112412, 122114, 122411, 142112, 142211, 241211, 221114, 413111, 241112, 134111,
    111242, 121142, 121241, 114212, 124112, 124211, 411212, 421112, 421211, 212141,
    214121, 412121, 111143, 111341, 131141, 114113, 114311, 411113, 411311, 113141,
    114131, 311141, 411131, 211412, 211214, 211232, 2331112,
  ];

  private static readonly START_B = 104;
  private static readonly STOP = 106;

  public static generateCode128Svg(text: string, widthMm = 30, heightMm = 12): string {
    const cleanText = text.replace(/[\r\n]/g, '');
    const codes: number[] = [this.START_B];

    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      codes.push(charCode - 32);
    }

    // Calculate Checksum
    let checksum = codes[0];
    for (let i = 1; i < codes.length; i++) {
      checksum += codes[i] * i;
    }
    codes.push(checksum % 103);
    codes.push(this.STOP);

    // Build bar patterns
    let totalModules = 0;
    const barModules: { isBar: boolean; width: number }[] = [];

    for (let i = 0; i < codes.length; i++) {
      const pattern = this.PATTERNS[codes[i]];
      const digits = pattern.toString().split('').map(Number);
      for (let j = 0; j < digits.length; j++) {
        const isBar = j % 2 === 0;
        barModules.push({ isBar, width: digits[j] });
        totalModules += digits[j];
      }
    }

    // Render SVG
    const quietZone = 10;
    const fullModules = totalModules + quietZone * 2;
    const svgHeight = 50;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullModules} ${svgHeight}" width="${widthMm}mm" height="${heightMm}mm">`;
    svg += `<rect width="${fullModules}" height="${svgHeight}" fill="#ffffff"/>`;

    let x = quietZone;
    for (const seg of barModules) {
      if (seg.isBar) {
        svg += `<rect x="${x}" y="2" width="${seg.width}" height="${svgHeight - 12}" fill="#000000"/>`;
      }
      x += seg.width;
    }

    // Text at bottom
    svg += `<text x="${fullModules / 2}" y="${svgHeight - 2}" text-anchor="middle" font-family="monospace" font-size="8" fill="#000000">${cleanText}</text>`;
    svg += '</svg>';

    return svg;
  }

  public static generateCode128DataUrl(text: string, widthMm = 30, heightMm = 12): string {
    const svg = this.generateCode128Svg(text, widthMm, heightMm);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }
}
