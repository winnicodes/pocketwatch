import { useEffect, useState, useCallback, useRef } from "react";
import { save, reportStorageError } from "./persist";

export function useServerObject<T extends object>(file: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const failed = useRef(false);

  useEffect(() => {
    failed.current = false;
    fetch(`/api/read.php?file=${file}`)
      .then(r => r.json())
      .then(json => setData({ ...fallback, ...(json ?? {}) }))
      .catch(err => {
        failed.current = true;
        setData(fallback);
        reportStorageError(`Laden von ${file} fehlgeschlagen:`, err);
      });
  }, [file]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
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

  return [data, update] as const;
}
