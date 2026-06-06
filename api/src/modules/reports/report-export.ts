import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportExportFormat } from './reports.schema.js';

export type ExportPayload = {
  format: ReportExportFormat;
  filenameBase: string;
  headers: string[];
  rows: string[][];
};

export type ExportResult = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\n');
}

export async function buildXlsx(headers: string[], rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Relatório');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const PDF_PAGE_WIDTH = 842;
const PDF_PAGE_HEIGHT = 595;
const PDF_MARGIN = 36;
const PDF_FONT_SIZE = 8;
const PDF_LINE_HEIGHT = 12;
const PDF_HEADER_HEIGHT = 16;

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export async function buildPdf(headers: string[], rows: string[][]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const colCount = headers.length;
  const usableWidth = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
  const colWidth = usableWidth / colCount;
  const maxCharsPerCol = Math.max(8, Math.floor(colWidth / (PDF_FONT_SIZE * 0.45)));

  let page = pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
  let y = PDF_PAGE_HEIGHT - PDF_MARGIN;

  const drawRow = (cells: string[], isHeader: boolean) => {
    if (y < PDF_MARGIN + PDF_LINE_HEIGHT) {
      page = pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
      y = PDF_PAGE_HEIGHT - PDF_MARGIN;
    }

    const rowFont = isHeader ? boldFont : font;
    const rowHeight = isHeader ? PDF_HEADER_HEIGHT : PDF_LINE_HEIGHT;

    cells.forEach((cell, colIndex) => {
      const x = PDF_MARGIN + colIndex * colWidth;
      page.drawText(truncateText(cell, maxCharsPerCol), {
        x,
        y: y - PDF_FONT_SIZE,
        size: PDF_FONT_SIZE,
        font: rowFont,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: colWidth - 4,
      });
    });

    y -= rowHeight;
  };

  drawRow(headers, true);
  rows.forEach((row) => drawRow(row, false));

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

const CONTENT_TYPES: Record<ReportExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const EXTENSIONS: Record<ReportExportFormat, string> = {
  csv: 'csv',
  xlsx: 'xlsx',
  pdf: 'pdf',
};

export async function buildExport(payload: ExportPayload): Promise<ExportResult> {
  const { format, filenameBase, headers, rows } = payload;
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const filename = `${filenameBase}-${dateSuffix}.${EXTENSIONS[format]}`;

  let buffer: Buffer;
  if (format === 'csv') {
    buffer = Buffer.from(buildCsv(headers, rows), 'utf-8');
  } else if (format === 'xlsx') {
    buffer = await buildXlsx(headers, rows);
  } else {
    buffer = await buildPdf(headers, rows);
  }

  return {
    buffer,
    contentType: CONTENT_TYPES[format],
    filename,
  };
}
