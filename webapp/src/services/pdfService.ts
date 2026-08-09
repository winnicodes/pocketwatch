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
    "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" +
    "BklEQVQDAMC/NsOFXD46AAAAAElFTkSuQmCC";
