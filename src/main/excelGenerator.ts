import ExcelJS from 'exceljs';
import { GeneratedCard } from '../shared/types';

export class ExcelExporter {
  public static async exportCardsToExcel(
    cards: GeneratedCard[],
    outputPath: string,
    batchTitle = 'دفعة كروت مايكروتك'
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NetCard Manager';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('الكروت المولدة', {
      views: [{ rightToLeft: true }], // RTL Excel sheet
    });

    // Header styling
    sheet.columns = [
      { header: '#', key: 'index', width: 6 },
      { header: 'الرقم التسلسلي', key: 'serial', width: 16 },
      { header: 'اسم المستخدم', key: 'username', width: 18 },
      { header: 'كلمة السر', key: 'password', width: 18 },
      { header: 'الباقة', key: 'profile', width: 16 },
      { header: 'الحجم', key: 'dataLimit', width: 12 },
      { header: 'الصلاحية', key: 'validity', width: 12 },
      { header: 'السعر', key: 'price', width: 12 },
      { header: 'العملة', key: 'currency', width: 10 },
      { header: 'الحالة', key: 'isPrinted', width: 14 },
      { header: 'النوع', key: 'mode', width: 14 },
      { header: 'تاريخ الإنشاء', key: 'createdAt', width: 22 },
      { header: 'ملاحظات / تفاصيل', key: 'custom1', width: 24 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2D124D' }, // Deep Purple Theme
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    cards.forEach((c, idx) => {
      const row = sheet.addRow({
        index: idx + 1,
        serial: c.serial,
        username: c.username,
        password: c.password || '---',
        profile: c.profile,
        dataLimit: c.dataLimit || '---',
        validity: c.validity || '---',
        price: c.price || 0,
        currency: c.currency || 'ريال',
        isPrinted: c.isPrinted ? 'مطبوع' : 'غير مطبوع',
        mode: c.mode === 'hotspot' ? 'هوت سبوت' : c.mode === 'usermanager' ? 'يوزر مانجر' : 'برودباند',
        createdAt: c.createdAt,
        custom1: c.custom1 || '',
      });

      row.height = 22;
      row.alignment = { vertical: 'middle', horizontal: 'center' };

      // Zebra striping
      if (idx % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F3FF' },
        };
      }

      // Borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }
}
