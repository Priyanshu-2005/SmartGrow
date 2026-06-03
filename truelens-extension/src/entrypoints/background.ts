import { defineBackground } from "#imports";
import { getStorage, setStorage } from "../utils/storage";
import type { MLCEngine } from "@mlc-ai/web-llm";

let MLCEngineClass: typeof import("@mlc-ai/web-llm").MLCEngine;
let engine: MLCEngine | null = null;
let currentModelId: string = "";
let engineLoading = false;
let engineReadyPromise: Promise<void> | null = null;
let activeGeneratingTabIds = new Set<number>();

async function getEngineClass() {
  if (!MLCEngineClass) {
    if (typeof window === "undefined" && typeof self === "undefined") {
      throw new Error("Not in runtime");
    }

    const mod = await import("@mlc-ai/web-llm");
    MLCEngineClass = mod.MLCEngine;
  }
  return MLCEngineClass;
}

interface ProgressEvent {
  progress: number;
  text: string;
}

async function ensureEngineReady() {
  if (engine && currentModelId) return;
  if (engineReadyPromise) return engineReadyPromise;

  engineReadyPromise = (async () => {
    const { activeModel } = await getStorage(["activeModel"]);
    if (!activeModel) throw new Error("No model loaded");

    await loadModel(activeModel);
  })().finally(() => {
    engineReadyPromise = null;
  });

  return engineReadyPromise;
}

// keep track of which models are "downloaded" (cached in browser storage)
async function getDownloadedModels(): Promise<string[]> {
  const { downloadedModels } = await getStorage(["downloadedModels"]);
  return downloadedModels;
}

async function broadcastProgress(
  modelId: string,
  progress: number,
  text: string,
) {
  const payload = { modelId, progress, text };
  try {
    await chrome.runtime.sendMessage({
      action: "PROGRESS_UPDATE",
      payload,
    });
  } catch {
    // options page may not be open
  }

  // also broadcast to tabs so they can show loading state natively
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "PROGRESS_UPDATE",
            payload,
          })
          .catch(() => {});
      }
    }
  } catch {}
}

async function loadModel(modelId: string) {
  if (engineLoading) return;
  engineLoading = true;

  try {
    console.log("[ENGINE] loadModel called", modelId);

    await broadcastProgress(modelId, 0, "Initializing engine…");

    console.log("[ENGINE] engine created?", !!engine);

    if (!engine) {
      const MLCEngine = await getEngineClass();
      engine = new MLCEngine();
    }

    engine.setInitProgressCallback((report: ProgressEvent) => {
      void broadcastProgress(
        modelId,
        Math.round(report.progress * 100),
        report.text,
      );
    });

    console.log("[ENGINE] reloading model...");
    await engine.reload(modelId);
    currentModelId = modelId;
    console.log("[ENGINE] model loaded successfully");

    const downloaded = await getDownloadedModels();
    if (!downloaded.includes(modelId)) {
      await setStorage({ downloadedModels: [...downloaded, modelId] });
    }
    await setStorage({ activeModel: modelId });

    await broadcastProgress(modelId, 100, "Model ready!");

    try {
      await chrome.runtime.sendMessage({
        action: "ENGINE_READY",
        payload: { modelId },
      });
    } catch {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GrayMatter] Engine error:", message);
    try {
      await chrome.runtime.sendMessage({
        action: "ENGINE_ERROR",
        payload: { error: message, modelId },
      });
    } catch {}
    throw err;
  } finally {
    engineLoading = false;
  }
}

async function deleteModel(modelId: string) {
  const downloaded = await getDownloadedModels();
  const updated = downloaded.filter((id) => id !== modelId);
  await setStorage({ downloadedModels: updated });

  if (currentModelId === modelId) {
    engine = null;
    currentModelId = "";
    await setStorage({ activeModel: "" });
  }

  try {
    const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
    await deleteModelAllInfoInCache(modelId);
  } catch (err) {
    console.warn("[GrayMatter] Could not clear model cache:", err);
  }

  try {
    await chrome.runtime.sendMessage({
      action: "PROGRESS_UPDATE",
      payload: { modelId, progress: -1, text: "Deleted" },
    });
  } catch {
    /* ignore */
  }
}

async function handleChat(
  messages: Array<{ role: string; content: string }>,
  requestId: string,
  senderTabId: number | undefined,
  sendResponse: (r: unknown) => void,
) {
  // console.log("[CHAT] START", { engine: !!engine, currentModelId });
  if (senderTabId) activeGeneratingTabIds.add(senderTabId);
  if (!engine || !currentModelId) {
    // console.log("[CHAT] Engine missing, trying restore...");
  }

  try {
    if (!engine || !currentModelId) {
      await ensureEngineReady();
      // console.log("[CHAT] After ensureEngineReady", {
      //   engine: !!engine,
      //   currentModelId,
      // });
    }

    if (!engine || !currentModelId) {
      sendResponse({ error: "No model loaded" });
      return;
    }

    // console.log("[CHAT] Creating stream...");

    const stream = await engine.chat.completions.create({
      messages: messages as Parameters<
        typeof engine.chat.completions.create
      >[0]["messages"],
      stream: true,
      temperature: 0.7,
      max_tokens: 512,
    });

    for await (const chunk of stream) {
      // console.log("[CHAT] chunk received");
      const delta = chunk.choices[0]?.delta?.content ?? "";
      try {
        await chrome.runtime.sendMessage({
          action: "CHAT_CHUNK",
          payload: { chunk: delta, done: false, requestId },
        });
      } catch {}
    }

    await chrome.runtime
      .sendMessage({
        action: "CHAT_CHUNK",
        payload: { chunk: "", done: true, requestId },
      })
      .catch(() => {});

    sendResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendResponse({ error: message });
  } finally {
    if (senderTabId) activeGeneratingTabIds.delete(senderTabId);
  }
}

async function handleRewrite(
  text: string,
  prompt: string,
  requestId: string,
  senderTabId: number | undefined,
  sendResponse: (r: unknown) => void,
) {
  if (senderTabId) activeGeneratingTabIds.add(senderTabId);

  try {
    if (!engine || !currentModelId) {
      await ensureEngineReady();
    }

    if (!engine || !currentModelId) {
      sendResponse({
        error: "No active model loaded. Please select a model in options.",
      });
      return;
    }

    const messages = [
      { role: "system", content: prompt },
      { role: "user", content: text },
    ];

    const stream = await engine.chat.completions.create({
      messages: messages as Parameters<
        typeof engine.chat.completions.create
      >[0]["messages"],
      stream: true,
      temperature: 0.5,
      max_tokens: 512,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      // broadcast to all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "REWRITE_CHUNK",
              payload: { chunk: delta, done: false, requestId },
            })
            .catch(() => {});
        }
      }
    }

    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "REWRITE_CHUNK",
            payload: { chunk: "", done: true, requestId },
          })
          .catch(() => {});
      }
    }

    sendResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendResponse({ error: message });
  } finally {
    if (senderTabId) activeGeneratingTabIds.delete(senderTabId);
  }
}

async function handleDefine(
  word: string,
  requestId: string,
  senderTabId: number | undefined,
  sendResponse: (r: unknown) => void,
) {
  if (senderTabId) activeGeneratingTabIds.add(senderTabId);

  try {
    if (!engine || !currentModelId) {
      await ensureEngineReady();
    }

    if (!engine || !currentModelId) {
      sendResponse({
        error: "No active model loaded. Please select a model in options.",
      });
      return;
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful dictionary for neurodivergent individuals. Define the following word in extremely simple, easy to understand English (1-2 short sentences maximum).",
      },
      { role: "user", content: word },
    ];

    const stream = await engine.chat.completions.create({
      messages: messages as Parameters<
        typeof engine.chat.completions.create
      >[0]["messages"],
      stream: true,
      temperature: 0.3,
      max_tokens: 150,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      // broadcast to all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "DEFINE_CHUNK",
              payload: { chunk: delta, done: false, requestId },
            })
            .catch(() => {});
        }
      }
    }

    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "DEFINE_CHUNK",
            payload: { chunk: "", done: true, requestId },
          })
          .catch(() => {});
      }
    }

    sendResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendResponse({ error: message });
  } finally {
    if (senderTabId) activeGeneratingTabIds.delete(senderTabId);
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;

  if (action === "DOWNLOAD_MODEL" || action === "LOAD_MODEL") {
    const { modelId } = payload as { modelId: string };
    loadModel(modelId).catch(console.error);
    sendResponse({ ok: true });
    return false;
  }

  if (action === "DELETE_MODEL") {
    const { modelId } = payload as { modelId: string };
    deleteModel(modelId)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ error: String(e) }));
    return true;
  }

  if (action === "CHAT_SEND") {
    const { messages, requestId } = payload as {
      messages: Array<{ role: string; content: string }>;
      requestId: string;
    };
    handleChat(messages, requestId, sender.tab?.id, sendResponse).catch(
      console.error,
    );
    return true;
  }

  if (action === "REWRITE_TEXT") {
    const { text, prompt, requestId } = payload as {
      text: string;
      prompt: string;
      requestId: string;
    };
    handleRewrite(text, prompt, requestId, sender.tab?.id, sendResponse).catch(
      console.error,
    );
    return true;
  }

  if (action === "DEFINE_WORD") {
    const { word, requestId } = payload as {
      word: string;
      requestId: string;
    };
    handleDefine(word, requestId, sender.tab?.id, sendResponse).catch(
      console.error,
    );
    return true;
  }

  if (action === "STOP_GENERATION") {
    if (engine) engine.interruptGenerate();
    sendResponse({ ok: true });
    return false;
  }

  if (action === "GET_STATE") {
    getStorage([
      "downloadedModels",
      "activeModel",
      "colorProfile",
      "rewriteEnabled",
      "rewritePrompt",
    ])
      .then((state) =>
        sendResponse({
          ok: true,
          state,
          engineLoaded: !!engine && !!currentModelId,
          currentModelId,
        }),
      )
      .catch((e) => sendResponse({ error: String(e) }));
    return true;
  }

  if (action === "SET_COLOR_PROFILE") {
    setStorage({
      colorProfile: payload as import("../utils/messages").ColorProfile,
    }).catch(console.error);
    sendResponse({ ok: true });
    return false;
  }

  if (action === "PING") {
    sendResponse({ pong: true });
    return false;
  }

  return false;
});

export default defineBackground(() => {
  console.log("[SW] Background started");
  getStorage(["activeModel"]).then((res) => {
    console.log("[SW] Stored active model:", res.activeModel);
  });

  // Keep service worker alive
  setInterval(() => {
    chrome.runtime.getPlatformInfo?.();
  }, 20000);

  // ensureEngineReady() is called lazily on chat/rewrite requests
  // void ensureEngineReady().catch(() => {
  //   // No active model yet, or restore failed; chat will retry lazily.
  // });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeGeneratingTabIds.has(tabId)) {
      if (engine) engine.interruptGenerate();
      activeGeneratingTabIds.delete(tabId);
    }
  });
});
