import { useEffect } from 'react';

/**
 * Escape schliesst den obersten Dialog. Stand in jedem Dialog als eigener
 * useEffect - dreimal dieselben acht Zeilen.
 *
 * Rueckfragen sind native dialogs: dort schliesst Escape nur sie selbst, das
 * Event erreicht window trotzdem und wuerde sonst den Dialog dahinter gleich
 * mit zumachen. Deshalb hier zentral ausgenommen.
 */
export function useEscape(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      onEscape();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onEscape, active]);
}
