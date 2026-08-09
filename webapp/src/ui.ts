/**
 * Umrandeter Knopf auf Kartenflaeche: Kopfzeile und die Kreuze der Dialoge.
 * Hover hellt die Flaeche auf - so macht es der Rest der App (Verlaufszeilen,
 * Kalenderpanel, Einstellungszeilen). Vorher stand die Kette in fuenf Dateien
 * und war in dreien schon auseinandergelaufen.
 *
 * Groesse, Radius und Anordnung bleiben beim Aufrufer - das ist Layout, kein
 * Aussehen.
 */
export const CARD_BUTTON =
  'border border-border-color bg-card text-muted hover:bg-elevated hover:text-light transition-colors';

/** Ueberschrift eines Abschnitts oder einer Spalte. Stand 4x da, unter 3 Namen. */
export const SECTION_LABEL = 'text-[11px] font-bold uppercase tracking-[0.14em] text-dim';

/**
 * Hauptaktion eines Dialogs oder Bereichs. Nur Farbe und Schrift - Groesse und
 * Radius bleiben beim Aufrufer, die sind mobil bewusst andere als am Desktop.
 */
export const PRIMARY_BUTTON =
  'bg-primary hover:bg-primary-dark text-on-primary font-semibold transition-colors';

/**
 * Hintergrund eines Dialogs, der mobil den ganzen Schirm einnimmt und ab lg
 * mittig schwebt. Der Einstellungsdialog nutzt ihn nicht - den gibt es nur am
 * Desktop, mobil stehen dieselben Felder im "Mehr"-Bereich.
 */
export const MODAL_BACKDROP =
  'fixed inset-0 z-50 bg-darker lg:bg-black/70 lg:backdrop-blur-sm flex flex-col lg:justify-center lg:items-center';
