import { defineBackground } from "#imports";
import { getStorage } from "../utils/storage";
import type {
  AnalyzeTextPayload,
  FactCheckPayload,
  TextAnalysisResult,
  FactCheckResult,
} from "../utils/messages";

async function getBackendUrl(): Promise<string> {
  const { backendUrl } = await getStorage(["backendUrl"]);
  return backendUrl;
}

async function handleAnalyzeText(
  payload: AnalyzeTextPayload,
  sendResponse: (r: unknown) => void,
) {
  try {
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/text-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: payload.text }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      sendResponse({
        error: err.detail || `Backend error: ${response.status}`,
      });
      return;
    }

    const data: TextAnalysisResult = await response.json();
    sendResponse({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendResponse({ error: `Failed to connect to backend: ${message}` });
  }
}

async function handleFactCheck(
  payload: FactCheckPayload,
  sendResponse: (r: unknown) => void,
) {
  try {
    const backendUrl = await getBackendUrl();
    const encodedQuery = encodeURIComponent(payload.query);

    // Run both fact-check endpoints in parallel (same as website)
    const [dbRes, liveRes] = await Promise.allSettled([
      fetch(`${backendUrl}/api/v1/fact-check?query=${encodedQuery}`).then(
        (r) => {
          if (!r.ok) throw new Error(`DB check failed: ${r.status}`);
          return r.json();
        },
      ),
      fetch(
        `${backendUrl}/api/v1/fact-check/live?query=${encodedQuery}`,
      ).then((r) => {
        if (!r.ok) throw new Error(`Live check failed: ${r.status}`);
        return r.json();
      }),
    ]);

    const result: FactCheckResult = {
      db:
        dbRes.status === "fulfilled" && !dbRes.value.error
          ? dbRes.value
          : null,
      live:
        liveRes.status === "fulfilled" && !liveRes.value.error
          ? liveRes.value
          : null,
    };

    sendResponse({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendResponse({ error: `Fact check failed: ${message}` });
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action, payload } = message;

  if (action === "ANALYZE_TEXT") {
    handleAnalyzeText(
      payload as AnalyzeTextPayload,
      sendResponse,
    );
    return true; // async
  }

  if (action === "FACT_CHECK") {
    handleFactCheck(payload as FactCheckPayload, sendResponse);
    return true; // async
  }

  if (action === "PING") {
    (async () => {
      try {
        const backendUrl = await getBackendUrl();
        const r = await fetch(`${backendUrl}/api/v1/health`, {
          signal: AbortSignal.timeout(3000),
        });
        sendResponse({ ok: r.ok, backendUrl });
      } catch {
        const backendUrl = await getBackendUrl();
        sendResponse({ ok: false, backendUrl });
      }
    })();
    return true;
  }
  return false;
});

async function getWebsiteUrl(): Promise<string> {
  const { websiteUrl } = await getStorage(["websiteUrl"]);
  return websiteUrl;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default defineBackground(() => {
  console.log("[TrueLens] Background service worker started");

  // Register context menu — runs on every service worker startup
  // removeAll avoids duplicate errors on reload
  function registerContextMenu() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "truelens-verify-image",
        title: "Verify Image with TrueLens",
        contexts: ["image"],
      });
      console.log("[TrueLens] Context menu registered");
    });
  }

  // Register on install AND on every startup
  chrome.runtime.onInstalled.addListener(registerContextMenu);
  registerContextMenu();

  // Handle context menu click
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== "truelens-verify-image" || !info.srcUrl) return;

    try {
      // Fetch image and convert to base64
      const base64Data = await fetchImageAsBase64(info.srcUrl);

      // Open the TrueLens image-verify page
      const websiteUrl = await getWebsiteUrl();
      const tab = await chrome.tabs.create({
        url: `${websiteUrl}/image-verify?ext=1`,
      });

      if (!tab.id) return;

      // Wait for tab to finish loading, then send image data
      const tabId = tab.id;
      const listener = (
        updatedTabId: number,
        changeInfo: chrome.tabs.TabChangeInfo,
      ) => {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          // Small delay to ensure content script is ready
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
              action: "INJECT_IMAGE",
              payload: { imageData: base64Data },
            });
          }, 500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    } catch (err) {
      console.error("[TrueLens] Failed to fetch image for verification:", err);
    }
  });
});
