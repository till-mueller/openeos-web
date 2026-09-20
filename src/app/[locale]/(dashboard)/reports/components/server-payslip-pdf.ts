import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

import type { ServerReport } from '@/types/report';
import { formatCurrency } from '@/utils/format';
import type { ReportsFilter } from './reports-filter-bar';

export interface ServerPayslipInput {
  organizationName?: string;
  eventName?: string;
  filter: ReportsFilter;
  server: ServerReport;
}

const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Eigenständiges, ruhigeres Layout als die Mehrseiten-Auswertung — dieser
// Beleg wird einer einzelnen Person ausgehändigt, nicht dem Management.
const INK: [number, number, number] = [26, 26, 26];
const GREEN_INK: [number, number, number] = [27, 94, 32];
const GREEN_BAR: [number, number, number] = [46, 125, 50];
const PANEL_BG: [number, number, number] = [247, 250, 247];
const PANEL_LINE: [number, number, number] = [220, 228, 221];

function slugify(value: string): string {
  const combiningDiacritics = new RegExp('[\\u0300-\\u036f]', 'g');
  const slug = value
    .normalize('NFKD')
    .replace(combiningDiacritics, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return slug || 'abrechnung';
}

function formatDateDe(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatPeriodLabel(input: ServerPayslipInput): string {
  const parts: string[] = [];
  if (input.eventName) parts.push(input.eventName);

  const { timeRange, startDate, endDate } = input.filter;
  if (timeRange === 'all') {
    parts.push('Gesamter Zeitraum');
  } else if (timeRange === 'today') {
    parts.push(`Heute (${formatDateDe(new Date())})`);
  } else if (timeRange === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    parts.push(`Gestern (${formatDateDe(yesterday)})`);
  } else if (startDate || endDate) {
    const s = startDate ? formatDateDe(new Date(startDate)) : '…';
    const e = endDate ? formatDateDe(new Date(endDate.split('T')[0])) : '…';
    parts.push(`${s} – ${e}`);
  }
  return parts.join(' · ') || 'Gesamter Zeitraum';
}

async function loadImageAsDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Single-server settlement slip: what one person sold, split cash/card, and
 * what they're owed in commission. Deliberately a one-page handover
 * document (signature line at the bottom) rather than the multi-table
 * management report — this gets handed to the person, not filed away.
 */
export async function generateServerPayslipPdf(input: ServerPayslipInput): Promise<void> {
  const { server } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoDataUrl = await loadImageAsDataUrl('/logo_dark.png');
  const logoWidth = 36;
  const logoHeight = logoWidth * (150 / 500);
  let cursorY = MARGIN;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN, cursorY, logoWidth, logoHeight);
    } catch {
      // Broken/undecodable image — continue without it rather than failing the export.
    }
  }

  const textX = logoDataUrl ? MARGIN + logoWidth + 8 : MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text('Abrechnung', textX, cursorY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  if (input.organizationName) {
    doc.text(input.organizationName, textX, cursorY + 13.5);
  }
  doc.text(formatPeriodLabel(input), textX, cursorY + 19);

  cursorY += Math.max(logoHeight, 22) + 6;

  doc.setDrawColor(...GREEN_INK);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, cursorY, PAGE_WIDTH - MARGIN, cursorY);
  cursorY += 10;

  // Server identity
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(server.name, MARGIN, cursorY);
  if (server.role) {
    const roleLabel = server.role === 'admin' ? 'Administrator' : 'Mitglied';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(roleLabel, PAGE_WIDTH - MARGIN, cursorY, { align: 'right' });
  }
  cursorY += 12;

  // Total sold — big panel
  doc.setFillColor(...PANEL_BG);
  doc.setDrawColor(...PANEL_LINE);
  doc.roundedRect(MARGIN, cursorY, CONTENT_WIDTH, 26, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 90);
  doc.text('Gesamtumsatz', MARGIN + 6, cursorY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...GREEN_INK);
  doc.text(formatCurrency(server.totalSold), MARGIN + 6, cursorY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 90);
  doc.text('Bestellungen', PAGE_WIDTH - MARGIN - 6, cursorY + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(String(server.ordersCount), PAGE_WIDTH - MARGIN - 6, cursorY + 19, { align: 'right' });

  cursorY += 36;

  // Cash / card breakdown table
  autoTable(doc, {
    startY: cursorY,
    head: [['Zahlart', 'Betrag']],
    body: [
      ['Bar', formatCurrency(server.cashTotal)],
      ['Karte / Sonstige', formatCurrency(server.cardTotal)],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 10, cellPadding: 3.5, textColor: [30, 30, 30] },
    headStyles: { fillColor: GREEN_INK, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    theme: 'striped',
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
  cursorY += 12;

  // Commission panel
  doc.setFillColor(...GREEN_BAR);
  doc.roundedRect(MARGIN, cursorY, CONTENT_WIDTH, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Provision (${server.commissionPercent.toFixed(1)}% vom Umsatz)`, MARGIN + 6, cursorY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(formatCurrency(server.commissionEarned), MARGIN + 6, cursorY + 17.5);

  cursorY += 38;

  // Signature line — this is a handover document
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursorY, MARGIN + 70, cursorY);
  doc.line(PAGE_WIDTH - MARGIN - 70, cursorY, PAGE_WIDTH - MARGIN, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(130, 130, 130);
  doc.text('Übergeben (Datum, Unterschrift)', MARGIN, cursorY + 5);
  doc.text('Erhalten (Datum, Unterschrift)', PAGE_WIDTH - MARGIN - 70, cursorY + 5);

  const generatedAt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  doc.setFontSize(8);
  doc.text(`Erstellt am ${generatedAt} · OpenEOS`, MARGIN, 285);

  const filename = `abrechnung-${slugify(server.name)}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
