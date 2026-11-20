import { useState, useEffect, useCallback, useRef } from "react";
import { save, reportStorageError } from "./persist";

export function useServerArray<T>(file: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Never overwrite data that failed to load.
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
