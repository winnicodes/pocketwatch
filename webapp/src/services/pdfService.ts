import type { TimeEntry } from '../types';
import { format } from 'date-fns/format';
import { clientOrFallback, formatDuration, entryDuration, clockPattern, type RoundingSettings } from '../entryTimes';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Settings extends RoundingSettings {
    name: string;
    language: 'de' | 'en';
    timeFormat: '12h' | '24h';
}

type TFunction = (key: string, replacements?: Record<string, string | number>) => string;

// Palette: paper-friendly version of the app theme (amber accent, neutral ink)
const INK: [number, number, number] = [26, 28, 31];
const MUTED: [number, number, number] = [122, 128, 136];
const AMBER: [number, number, number] = [214, 160, 60];
const ZEBRA: [number, number, number] = [247, 247, 245];
const RULE: [number, number, number] = [226, 228, 231];

const MARGIN = 16;

// Kopfbereich. Rechts stehen Name und Zeitraum auf zwei Grundlinien, links der Titel.
const PT_TO_MM = 25.4 / 72;
const CAP_RATIO = 0.717;   // Versalhoehe Helvetica, Anteil der Schriftgroesse
const META_SIZE = 10;      // pt, Name + Zeitraum
const META_LINE_1 = 24;    // Grundlinie Name
const META_LINE_2 = 30;    // Grundlinie Zeitraum
// Titel so gross, dass seine Versalhoehe genau den rechten Block abdeckt: von der
// Oberkante der ersten Zeile bis zur Grundlinie der zweiten. Faellt der Name weg,
// bleibt die Groesse gleich - sonst wuerde der Titel je nach Einstellung springen.
const META_TOP = META_LINE_1 - META_SIZE * PT_TO_MM * CAP_RATIO;
const TITLE_SIZE = (META_LINE_2 - META_TOP) / (PT_TO_MM * CAP_RATIO);
// Die Trennlinie muss unter die Unterlaenge des Titels ("g" in Zeiterfassung)
const DESC_RATIO = 0.207;  // Unterlaenge Helvetica, Anteil der Schriftgroesse
const RULE_Y = META_LINE_2 + TITLE_SIZE * PT_TO_MM * DESC_RATIO + 2.4;

export const exportToPdf = (
    entries: TimeEntry[],
    options: { timesOnly: boolean; showCreatedAt: boolean },
    settings: Settings,
    t: TFunction
): void => {
    const { timesOnly, showCreatedAt } = options;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const right = pageWidth - MARGIN;

    const dateFormatString = settings.language === 'de' ? 'dd.MM.yyyy' : 'MM/dd/yyyy';
    const timeFormatString = clockPattern(settings);

    const formatTimeForPdf = (date: Date) => {
        const formatted = format(date, timeFormatString);
        return settings.timeFormat === '12h'
            ? formatted.replace(' ', '') // kompakter für AM/PM
            : formatted;
    };

    // Kein "(hh:mm)" mehr im Kopf: das umbrach die schmale Spalte auf zwei Zeilen
    const head = timesOnly
        ? [[t('thDate'), t('startTime'), t('endTime'), t('thDuration')]]
        : [[t('thDate'), t('startTime'), t('endTime'), t('thClient'), t('thActivity'), t('thDuration')]];

    const body = entries.map(entry => {
        const duration = formatDuration(entryDuration(entry, settings));
        const dateStr = format(new Date(entry.start), dateFormatString);
        const startStr = formatTimeForPdf(new Date(entry.start));
        const endStr = entry.end ? formatTimeForPdf(new Date(entry.end)) : '–';

        if (timesOnly) {
            return [dateStr, startStr, endStr, duration];
        }

        return [dateStr, startStr, endStr, clientOrFallback(entry.client, '–'), entry.activity.trim() || '–', duration];
    });

    const totalDurationMs = entries.reduce(
        (acc, entry) => acc + entryDuration(entry, settings),
        0
    );

    const columns = head[0].length;

    // --- Kopfbereich -------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(TITLE_SIZE);
    doc.setTextColor(...INK);
    doc.text(t('pdfTitle'), MARGIN, META_LINE_2);

    // Name und Zeitraum stehen als Block rechts, rechtsbuendig untereinander
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(META_SIZE);
    doc.setTextColor(...MUTED);
    if (settings.name) doc.text(settings.name, right, META_LINE_1, { align: 'right' });

    // Zeitraum aus den Einträgen ableiten. Aeltester und juengster Eintrag statt
    // erste und letzte Zeile: bei absteigender Sortierung stuenden die sonst
    // vertauscht im Kopf ("07.08.2026 – 13.08.2021").
    if (entries.length > 0) {
        const starts = entries.map(e => e.start);
        const from = format(new Date(Math.min(...starts)), dateFormatString);
        const to = format(new Date(Math.max(...starts)), dateFormatString);
        doc.text(`${t('period')}: ${from === to ? from : `${from} – ${to}`}`, right, META_LINE_2, { align: 'right' });
    }

    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, RULE_Y, right, RULE_Y);

    // --- Tabelle -----------------------------------------------------------
    autoTable(doc, {
        startY: RULE_Y + 6,
        margin: { top: 20, bottom: 22, left: MARGIN, right: MARGIN },
        head,
        body: body.length > 0
            ? body
            : [[{ content: t('noEntriesFound'), colSpan: columns, styles: { halign: 'center' as const, textColor: MUTED } }]],
        foot: [[
            { content: t('totalDuration'), colSpan: columns - 1 },
            { content: formatDuration(totalDurationMs) },
        ]],
        showFoot: 'lastPage',
        // sonst zersaegt der Seitenumbruch mehrzeilige Zeilen mittendrin
        rowPageBreak: 'avoid',
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            textColor: INK,
            cellPadding: { top: 2.6, right: 3, bottom: 2.6, left: 3 },
            lineWidth: 0,
            valign: 'middle',
        },
        headStyles: {
            fontStyle: 'bold',
            fontSize: 8,
            textColor: MUTED,
            lineColor: RULE,
            lineWidth: { top: 0, right: 0, bottom: 0.4, left: 0 },
        },
        footStyles: {
            fontStyle: 'bold',
            fontSize: 9.5,
            textColor: INK,
            halign: 'right',
            lineColor: AMBER,
            lineWidth: { top: 0.6, right: 0, bottom: 0, left: 0 },
        },
        alternateRowStyles: { fillColor: ZEBRA },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'center' },
            [columns - 1]: { halign: 'right' },
        },
        didParseCell: data => {
            if (data.section !== 'head') return;
            // Kopfzeile in Versalien wirkt ruhiger als gemischte Schreibweise
            data.cell.text = data.cell.text.map(line => line.toUpperCase());
            // Kopfzellen erben halign nicht aus columnStyles - sonst steht die
            // Ueberschrift links waehrend die Werte darunter zentriert sind
            data.cell.styles.halign =
                data.column.index === columns - 1 ? 'right'
                : data.column.index === 1 || data.column.index === 2 ? 'center'
                : 'left';
        },
    });

    // --- Fußzeile mit Branding --------------------------------------------
    const pages = doc.getNumberOfPages();
    const footerY = pageHeight - 12;

    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);

        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, footerY - 5, right, footerY - 5);

        // footerY ist die Grundlinie, nicht die Mitte. Der Versatz ist am gerenderten
        // PDF ausgemessen: Mitte des Schriftbilds von "pocketwatch" (Oberlaenge k/t/h
        // bis Unterlaenge p) liegt 0,8 mm ueber der Grundlinie. Bei geaenderter
        // Schriftgroesse neu messen, nicht schaetzen.
        const logoSize = 4.4;
        const logoCenterY = footerY - 0.8;
        // Alias: sonst landet das PNG einmal pro Seite im Dokument
        doc.addImage(LOGO_PNG, 'PNG', MARGIN, logoCenterY - logoSize / 2, logoSize, logoSize, 'pocketwatch-logo', 'FAST');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        doc.text('pocketwatch', MARGIN + logoSize + 1.8, footerY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        if (showCreatedAt) {
            doc.text(format(new Date(), `${dateFormatString} · ${timeFormatString}`), pageWidth / 2, footerY, { align: 'center' });
        }
        doc.text(`${page} / ${pages}`, right, footerY, { align: 'right' });
    }

    // Herunterladen statt Vorschau-Fenster: das Fenster zeigte die PDF ueber
    // eine data:-URI, und die hat keinen Dateinamen - Chrome bot sie als
    // "Download.pdf" an. save() haengt den Namen ans Blob, wie beim CSV.
    doc.save(`pocketwatch-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Wortmarke fuer die Fusszeile: pocketwatch.svg als 128px-PNG, damit der PDF-Export
// ohne SVG-Renderer (svg2pdf o.ae.) auskommt. Neu erzeugen nur, wenn sich das Logo aendert.
const LOGO_PNG =
    "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";
