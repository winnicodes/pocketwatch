import { useState, useEffect, useCallback, useRef } from "react";
import { save, reportStorageError } from "./persist";

export function useServerArray<T>(file: string) {
  const [data, setData] = useState<T[]>([]);
  // Leer und "noch nicht geladen" sehen im Datensatz gleich aus. Ohne diese
  // Unterscheidung behauptet der Verlauf waehrend des Abrufs, es gebe keine
  // Eintraege - bei einer grossen times.json sekundenlang.
  const [loading, setLoading] = useState(true);
  // ... und "leer" und "Lesen fehlgeschlagen" sehen ebenfalls gleich aus. Ohne
  // diese Sperre zeigt die App nach einem 502 (php-fpm startet noch) oder einem
  // Rechtefehler auf data/ einen leeren Verlauf, und der erste Klick auf Clock In
  // schreibt genau einen Eintrag ueber alle bestehenden.
  const failed = useRef(false);

  useEffect(() => {
    setLoading(true);
    failed.current = false;
    fetch(`/api/read.php?file=${file}`)
      .then(r => r.json())
      .then(json => {
        if (!Array.isArray(json)) throw new Error("keine Liste erhalten");
        setData(json);
      })
      .catch(err => {
        failed.current = true;
        reportStorageError(`Laden von ${file} fehlgeschlagen:`, err);
      })
      .finally(() => setLoading(false));
  }, [file]);

  const update = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      // Nie ueber Daten schreiben, die nie gelesen werden konnten.
      if (failed.current) return;

      setData(prev => {
        const value =
          typeof updater === "function" ? updater(prev) : updater;

        save(file, value);

        return value;
      });
    },
    [file]
  );

  return [data, update, loading] as const;
}
