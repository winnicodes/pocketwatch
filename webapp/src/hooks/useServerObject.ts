import { useEffect, useState, useCallback } from "react";
import { save } from "./persist";

export function useServerObject<T extends object>(file: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);

  useEffect(() => {
    fetch(`/api/read.php?file=${file}`)
      .then(r => r.json())
      .then(json => setData({ ...fallback, ...(json ?? {}) }))
      .catch(() => setData(fallback));
  }, [file]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
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
