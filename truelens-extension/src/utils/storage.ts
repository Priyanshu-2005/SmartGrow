// ─── TrueLens Storage ───

export interface StorageSchema {
  backendUrl: string;
}

export const STORAGE_DEFAULTS: StorageSchema = {
  backendUrl: "http://127.0.0.1:8000",
};

export async function getStorage<K extends keyof StorageSchema>(
  keys: K[],
): Promise<Pick<StorageSchema, K>> {
  const defaults = keys.reduce(
    (acc, k) => {
      (acc as Record<string, unknown>)[k] = STORAGE_DEFAULTS[k];
      return acc;
    },
    {} as Pick<StorageSchema, K>,
  );
  const result = await chrome.storage.local.get(
    defaults as Record<string, unknown>,
  );
  return result as Pick<StorageSchema, K>;
}

export async function setStorage(
  data: Partial<StorageSchema>,
): Promise<void> {
  await chrome.storage.local.set(data);
}
