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

export default defineBackground(() => {
  console.log("[TrueLens] Background service worker started");
});
