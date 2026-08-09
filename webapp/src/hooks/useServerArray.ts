import { useState, useEffect, useCallback } from "react";
import { save } from "./persist";

export function useServerArray<T>(file: string) {
  const [data, setData] = useState<T[]>([]);
  // Leer und "noch nicht geladen" sehen im Datensatz gleich aus. Ohne diese
  // Unterscheidung behauptet der Verlauf waehrend des Abrufs, es gebe keine
  // Eintraege - bei einer grossen times.json sekundenlang.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/read.php?file=${file}`)
      .then(r => r.json())
      .then(json => setData(Array.isArray(json) ? json : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [file]);

  const update = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
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
