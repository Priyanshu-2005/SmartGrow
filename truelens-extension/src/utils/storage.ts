import type { ColorProfile } from "./messages";
import { DEFAULT_COLOR_PROFILES } from "./messages";

export const DEFAULT_REWRITE_PROMPT = `You are a cognitive accessibility rewriting assistant.

Task: Rewrite the given paragraph in simpler, clearer language for neurodivergent readers, including people with ADHD, autism, and dyslexia.

Rules:
- Preserve the original meaning.
- Use short, direct sentences.
- Replace complex words with simpler words.
- Remove unnecessary jargon, fluff, and repetition.
- Keep the tone neutral and helpful.
- Do not add new information.
- Do not explain your changes.
- Output only the simplified paragraph, and nothing else.
- Just output the rewritten paragraph. Do not start with "Rewritten paragraph:" or any other preamble.
`;

export interface StorageSchema {
  downloadedModels: string[];
  activeModel: string;
  colorProfile: ColorProfile;
  rewriteEnabled: boolean;
  rewritePrompt: string;
}

export const STORAGE_DEFAULTS: StorageSchema = {
  downloadedModels: [],
  activeModel: "",
  colorProfile: DEFAULT_COLOR_PROFILES.none,
  rewriteEnabled: false,
  rewritePrompt: DEFAULT_REWRITE_PROMPT,
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

export async function setStorage<K extends keyof StorageSchema>(
  data: Partial<StorageSchema>,
): Promise<void> {
  await chrome.storage.local.set(data);
}

export async function getAll(): Promise<StorageSchema> {
  return getStorage(
    Object.keys(STORAGE_DEFAULTS) as (keyof StorageSchema)[],
  ) as Promise<StorageSchema>;
}
