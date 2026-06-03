import { defineContentScript } from "#imports";
import { DEFAULT_REWRITE_PROMPT } from "@/utils/storage";
import type { ColorProfile } from "../utils/messages";
import { DEFAULT_COLOR_PROFILES } from "../utils/messages";
import { computeAccessibilityScore } from "../utils/cognitiveScore";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main() {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&family=Comic+Neue:wght@400;700&display=swap";
    document.head.appendChild(fontLink);

    const odLink = document.createElement("link");
    odLink.rel = "stylesheet";
    odLink.href = "https://fonts.cdnfonts.com/css/opendyslexic";
    document.head.appendChild(odLink);

    const animStyle = document.createElement("style");
    animStyle.textContent = `
      @keyframes nf-fade-in {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(animStyle);

    /* -------------------- Font Override ------------------- */
    let fontStyleEl: HTMLStyleElement | null = null;

    function applyFontOverride(fontFamily: string) {
      if (!fontStyleEl) {
        fontStyleEl = document.createElement("style");
        fontStyleEl.id = "__graymatter_font__";
        document.head.appendChild(fontStyleEl);
      }
      if (!fontFamily || fontFamily === "default") {
        fontStyleEl.textContent = "";
        return;
      }

      let fontStack = `"${fontFamily}", sans-serif`;
      if (fontFamily === "Comic Sans MS")
        fontStack = `"Comic Sans MS", "Comic Sans", "Comic Neue", cursive`;

      // apply to every element but skip known icon-font carriers
      fontStyleEl.textContent = `
        *:not([class*="icon"]):not([class*="fa-"]):not([class*="material-"]):not([class*="glyphicon"]):not([class*="bi-"]):not([class*="codicon"]):not([class*="nf-"]):not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.bi):not(.material-icons) {
          font-family: ${fontStack} !important;
        }
      `;
    }

    chrome.storage.local.get({ activeFont: "default" }, (res) => {
      applyFontOverride(res.activeFont as string);
    });

    /* -------------------- Color Profile ------------------- */
    let colorStyleEl: HTMLStyleElement | null = null;

    function applyColorProfile(profile: ColorProfile) {
      if (!colorStyleEl) {
        colorStyleEl = document.createElement("style");
        colorStyleEl.id = "__graymatter_colors__";
        document.head.appendChild(colorStyleEl);
      }
      if (profile.id === "none") {
        colorStyleEl.textContent = "";
        return;
      }
      // console.log("profileeeeee", profile);
      colorStyleEl.textContent = `html { filter: saturate(${profile.saturation}%) brightness(${profile.brightness}%) contrast(${profile.contrast}%) hue-rotate(${profile.hueRotate}deg) !important; }`;
    }

    chrome.storage.local.get(
      { colorProfile: DEFAULT_COLOR_PROFILES.none, dictEnabled: false },
      (res) => {
        applyColorProfile(res.colorProfile as ColorProfile);
        (window as any).__graymatter_dictEnabled = res.dictEnabled;
      },
    );

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.dictEnabled !== undefined) {
        (window as any).__graymatter_dictEnabled = changes.dictEnabled.newValue;
      }
      if (changes.colorProfile) {
        applyColorProfile(changes.colorProfile.newValue as ColorProfile);
      }
      if (changes.rewriteEnabled !== undefined) {
        toggleRewriteButtons(changes.rewriteEnabled.newValue as boolean); // called once ✅
      }
      if (changes.activeFont !== undefined) {
        applyFontOverride(changes.activeFont.newValue as string);
      }
      if (changes.rulerAutoSnap !== undefined) {
        rulerAutoSnap = changes.rulerAutoSnap.newValue as boolean;
      }
      if (changes.rulerBackdropMode !== undefined) {
        rulerBackdropMode = changes.rulerBackdropMode.newValue as string;
        syncBackdrop();
      }
    });

    // listen for read mode and ruler toggles
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.action === "GET_TAB_STATE") {
        sendResponse({ rulerEnabled, readModeEnabled });
      }
      if (msg.action === "SET_RULER_ENABLED") {
        rulerEnabled = msg.value as boolean;
        applyRuler();
      }
      if (msg.action === "SET_READ_MODE_ENABLED") {
        readModeEnabled = msg.value as boolean;
        applyReadMode();
      }
      if (msg.action === "GET_ACCESSIBILITY_SCORE") {
        computeAccessibilityScore()
          .then((score) => sendResponse(score))
          .catch((err) => sendResponse({ error: String(err) }));
        return true; // keeps message channel open for async response
      }
    });

    /* ------------------ Simplify Button ------------------- */
    let rewriteEnabled = false;
    const injectedParagraphs = new WeakSet<Element>();

    function injectButtonsIntoParagraphs() {
      const paragraphs = document.querySelectorAll("p");
      paragraphs.forEach((para) => {
        if (injectedParagraphs.has(para)) return;

        // skip if paragraph is an input box or inside an editor
        if (
          para.isContentEditable ||
          para.closest('[contenteditable="true"]') ||
          para.querySelector("input, textarea, select")
        ) {
          return;
        }

        const text = para.innerText?.trim() ?? "";
        if (text.length < 80) return;
        injectedParagraphs.add(para);

        // button wrapper
        const wrapper = document.createElement("div");
        wrapper.className = "__nf_simplify_wrapper__";
        wrapper.style.cssText =
          'margin:6px 0 2px 0;font-family:"Lexend",system-ui,-apple-system,sans-serif;';

        const btn = document.createElement("button");
        btn.innerHTML = '<span style="font-size:11px">✦</span> Simplify';
        btn.style.cssText = [
          "all:unset",
          "display:inline-flex",
          "align-items:center",
          "gap:5px",
          "padding:3px 12px",
          "font-size:11px",
          "font-weight:600",
          "border-radius:20px",
          "background:rgba(124,106,247,0.12)",
          "color:#a78bfa",
          "border:1px solid rgba(124,106,247,0.3)",
          "cursor:pointer",
          "transition:all 0.15s ease",
          "letter-spacing:0.02em",
        ].join(";");

        btn.addEventListener("mouseenter", () => {
          btn.style.background = "rgba(124,106,247,0.22)";
          btn.style.borderColor = "#7c6af7";
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.background = "rgba(124,106,247,0.12)";
          btn.style.borderColor = "rgba(124,106,247,0.3)";
        });

        // output div
        const outputDiv = document.createElement("div");
        outputDiv.className = "__nf_output__";
        outputDiv.style.cssText = [
          "display:none",
          "margin:6px 0 8px 0",
          "padding:12px 16px",
          "background:rgba(124,106,247,0.07)",
          "border:1px solid rgba(124,106,247,0.2)",
          "border-radius:10px",
          "font-size:14px",
          "line-height:1.7",
          'font-family:"Lexend",system-ui,-apple-system,sans-serif',
          "white-space:pre-wrap",
        ].join(";");

        let isLoading = false;
        let currentRequestId: string | null = null;
        let wasInterrupted = false;

        btn.addEventListener("click", async () => {
          if (isLoading) {
            if (currentRequestId) {
              wasInterrupted = true;
              chrome.runtime
                .sendMessage({ action: "STOP_GENERATION" })
                .catch(() => {});
              btn.innerHTML = "⏹ Stopping...";
            }
            return;
          }
          const text = para.innerText.trim();
          if (!text || text.length < 20) return;

          isLoading = true;
          wasInterrupted = false;

          btn.innerHTML = "⏹ Stop simplifying";
          btn.style.opacity = "1";
          btn.style.color = "#f87171";
          btn.style.borderColor = "rgba(248,113,113,0.3)";
          btn.style.background = "rgba(248,113,113,0.08)";

          outputDiv.style.display = "block";
          outputDiv.textContent = "";
          outputDiv.style.color = "";

          const storageResult = await chrome.storage.local.get({
            rewritePrompt: DEFAULT_REWRITE_PROMPT,
          });
          const rewritePrompt = storageResult.rewritePrompt as string;
          currentRequestId = `rw_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const localRequestId = currentRequestId;

          type ChunkMsg = {
            action: string;
            payload: {
              chunk?: string;
              done?: boolean;
              requestId?: string;
              progress?: number;
              text?: string;
              modelId?: string;
            };
          };
          const chunkListener = (msg: ChunkMsg) => {
            if (msg.action === "PROGRESS_UPDATE" && isLoading) {
              // Update UI to show downloading/loading progress
              if (
                msg.payload.progress !== undefined &&
                msg.payload.progress < 100
              ) {
                btn.innerHTML = `⏳ Loading AI: ${msg.payload.progress}%`;
                btn.style.color = "#fbbf24";
                btn.style.borderColor = "rgba(251,191,36,0.3)";
                btn.style.background = "rgba(251,191,36,0.08)";
              } else if (msg.payload.progress === 100) {
                btn.innerHTML = "⏹ Stop simplifying";
                btn.style.color = "#f87171";
                btn.style.borderColor = "rgba(248,113,113,0.3)";
                btn.style.background = "rgba(248,113,113,0.08)";
              }
              return;
            }

            if (
              msg.action !== "REWRITE_CHUNK" ||
              msg.payload.requestId !== localRequestId
            )
              return;
            if (msg.payload.done) {
              chrome.runtime.onMessage.removeListener(
                chunkListener as Parameters<
                  typeof chrome.runtime.onMessage.addListener
                >[0],
              );
              isLoading = false;
              if (wasInterrupted) {
                btn.innerHTML =
                  '<span style="font-size:11px">✦</span> Simplify';
                btn.style.color = "#a78bfa";
                btn.style.borderColor = "rgba(124,106,247,0.3)";
                btn.style.background = "rgba(124,106,247,0.12)";
                outputDiv.appendChild(document.createTextNode("\n\n[Stopped]"));
              } else {
                btn.innerHTML =
                  '<span style="font-size:11px">✦</span> Simplified ✓';
                btn.style.color = "#34d399";
                btn.style.borderColor = "rgba(52,211,153,0.3)";
                btn.style.background = "rgba(52,211,153,0.08)";
              }
              btn.style.opacity = "1";
            } else {
              const span = document.createElement("span");
              span.textContent = msg.payload.chunk ?? "";
              span.style.animation = "nf-fade-in 0.1s ease-out forwards"; // animation speed
              outputDiv.appendChild(span);
            }
          };

          chrome.runtime.onMessage.addListener(
            chunkListener as Parameters<
              typeof chrome.runtime.onMessage.addListener
            >[0],
          );

          const resp = await chrome.runtime
            .sendMessage({
              action: "REWRITE_TEXT",
              payload: {
                text,
                prompt: rewritePrompt,
                requestId: localRequestId,
              },
            })
            .catch((e: Error) => ({ error: e.message }));

          if (resp?.error) {
            chrome.runtime.onMessage.removeListener(
              chunkListener as Parameters<
                typeof chrome.runtime.onMessage.addListener
              >[0],
            );
            isLoading = false;

            if (
              wasInterrupted ||
              resp.error.includes("AbortError") ||
              resp.error.includes("interrupted")
            ) {
              outputDiv.appendChild(document.createTextNode("\n\n[Stopped]"));
            } else {
              outputDiv.textContent = `⚠️ ${resp.error}`;
              outputDiv.style.color = "#f87171";
            }

            btn.innerHTML = '<span style="font-size:11px">✦</span> Simplify';
            btn.style.opacity = "1";
            btn.style.color = "#a78bfa";
            btn.style.borderColor = "rgba(124,106,247,0.3)";
            btn.style.background = "rgba(124,106,247,0.12)";
          }
        });

        wrapper.appendChild(btn);
        para.after(outputDiv);
        para.after(wrapper);
      });
    }

    function removeAllButtons() {
      document
        .querySelectorAll(".__nf_simplify_wrapper__, .__nf_output__")
        .forEach((el) => el.remove());
    }

    const observer = new MutationObserver(() => {
      if (rewriteEnabled) injectButtonsIntoParagraphs();
    });

    function toggleRewriteButtons(enabled: boolean) {
      rewriteEnabled = enabled;
      if (enabled) {
        injectButtonsIntoParagraphs();
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        removeAllButtons();
        observer.disconnect();
      }
    }

    chrome.storage.local.get({ rewriteEnabled: false }, (res) => {
      toggleRewriteButtons(res.rewriteEnabled as boolean);
    });

    // will prolly rename this feature to "highlight line" or "spotlight" idk.
    /* -------------------- Reading Ruler ------------------- */
    let rulerEnabled = false;
    let rulerAutoSnap = false;
    let rulerEl: HTMLDivElement | null = null;
    let rulerBackdropEl: HTMLDivElement | null = null;
    let rulerToolbarEl: HTMLDivElement | null = null;
    let currentRulerY = 200;
    let rulerHeight = 44;
    let isSnapped = false;
    let documentRulerY = 0;
    let documentRulerX = 0;
    let rulerBackdropMode = "dim";

    function getMatchedBg() {
      const isTransparent = (c: string) =>
        c === "rgba(0, 0, 0, 0)" || c === "transparent";
      // Walk: body → html → fallback white
      for (const el of [document.body, document.documentElement]) {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (!isTransparent(bg)) return bg;
      }
      return "#ffffff";
    }

    function syncBackdrop() {
      if (!rulerEnabled) return;

      /* -------------------- Toolbar setup ------------------- */
      if (!rulerToolbarEl) {
        rulerToolbarEl = document.createElement("div");
        rulerToolbarEl.id = "__graymatter_ruler_tb__";
        document.body.appendChild(rulerToolbarEl);
        rulerToolbarEl.addEventListener("mousedown", (e) =>
          e.stopPropagation(),
        );
        rulerToolbarEl.addEventListener("click", (e) => e.stopPropagation());
      }

      if (isSnapped && rulerEl) {
        /**
         * Snapped mode: use SVG mask for rounded cutout
         */
        if (!rulerBackdropEl) {
          rulerBackdropEl = document.createElement("div");
          rulerBackdropEl.id = "__graymatter_ruler_bg__";
          rulerBackdropEl.style.cssText =
            "position: fixed; inset: 0; pointer-events: none; z-index: 2147483645; transition: background 0.15s, backdrop-filter 0.15s;";
          document.body.appendChild(rulerBackdropEl);
        }

        const scrollEl = readModeEl || window;
        const scrollY = readModeEl ? readModeEl.scrollTop : window.scrollY;
        const scrollX = readModeEl ? 0 : window.scrollX;

        const vx = documentRulerX - scrollX;
        const vy = documentRulerY - scrollY;
        const vw = parseFloat(rulerEl.style.width || "0");
        const vh = rulerHeight;
        const W = window.innerWidth;
        const H = window.innerHeight;

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><mask id="m"><rect width="${W}" height="${H}" fill="white"/><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="6" ry="6" fill="black"/></mask></defs><rect width="${W}" height="${H}" fill="white" mask="url(#m)"/></svg>`;
        const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;
        (rulerBackdropEl.style as any).webkitMaskImage = `url("${encoded}")`;
        rulerBackdropEl.style.maskImage = `url("${encoded}")`;
        rulerBackdropEl.style.maskSize = "auto";
        rulerBackdropEl.style.maskPosition = "0 0";

        // Hide old box-shadow on ruler (we have the separate overlay)
        rulerEl.style.boxShadow = "none";

        // Toolbar
        const toolbarTop = Math.max(0, vy - 44);
        const toolbarLeft = Math.max(0, vx + vw - 146);
        rulerToolbarEl.style.cssText = `position: fixed; top: ${toolbarTop}px; left: ${toolbarLeft}px; z-index: 2147483647; pointer-events: auto; display: flex; gap: 4px; padding: 6px; background: #1a1a24; border: 1px solid #2e2e48; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: system-ui, sans-serif;`;
        rulerToolbarEl.innerHTML = `
          <button data-mode="dim" style="all:unset; cursor:pointer; padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background: ${rulerBackdropMode === "dim" ? "#7c6af7" : "transparent"}; color: ${rulerBackdropMode === "dim" ? "white" : "#8888a8"}; transition: all 0.2s;">Dim</button>
          <button data-mode="blur" style="all:unset; cursor:pointer; padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background: ${rulerBackdropMode === "blur" ? "#7c6af7" : "transparent"}; color: ${rulerBackdropMode === "blur" ? "white" : "#8888a8"}; transition: all 0.2s;">Blur</button>
          <button data-mode="hide" style="all:unset; cursor:pointer; padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background: ${rulerBackdropMode === "hide" ? "#7c6af7" : "transparent"}; color: ${rulerBackdropMode === "hide" ? "white" : "#8888a8"}; transition: all 0.2s;">Hide</button>
        `;
        rulerToolbarEl.querySelectorAll("button").forEach((b) => {
          b.onclick = () => {
            rulerBackdropMode = b.dataset.mode!;
            chrome.storage.local.set({ rulerBackdropMode });
            syncBackdrop();
          };
        });
      } else {
        /**
         * Normal mode: use box-shadow on the ruler itself (hardware smooth)
         */
        if (rulerBackdropEl) {
          rulerBackdropEl.remove();
          rulerBackdropEl = null;
        }
        rulerToolbarEl.style.display = "none";

        if (rulerEl) {
          rulerEl.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.5)";
          (rulerEl.style as any).webkitMaskImage = "none";
          rulerEl.style.maskImage = "none";
        }
        return; // No further overlay needed
      }

      if (rulerBackdropMode === "blur") {
        rulerBackdropEl!.style.background = "rgba(0,0,0,0.45)";
        rulerBackdropEl!.style.backdropFilter = "blur(10px)";
        (rulerBackdropEl!.style as any).webkitBackdropFilter = "blur(10px)";
      } else if (rulerBackdropMode === "hide") {
        rulerBackdropEl!.style.background = getMatchedBg();
        rulerBackdropEl!.style.backdropFilter = "none";
        (rulerBackdropEl!.style as any).webkitBackdropFilter = "none";
      } else {
        rulerBackdropEl!.style.background = "rgba(0,0,0,0.5)";
        rulerBackdropEl!.style.backdropFilter = "none";
        (rulerBackdropEl!.style as any).webkitBackdropFilter = "none";
      }
    }

    function syncRulerPosition() {
      if (rulerEnabled && isSnapped && rulerEl) {
        const scrollY = readModeEl ? readModeEl.scrollTop : window.scrollY;
        const scrollX = readModeEl ? 0 : window.scrollX;
        currentRulerY = documentRulerY - scrollY;
        rulerEl.style.top = `${currentRulerY}px`;
        rulerEl.style.left = `${documentRulerX - scrollX}px`;
        syncBackdrop();
      }
    }

    window.addEventListener("scroll", syncRulerPosition, { passive: true });

    function guessLineHeight(): number {
      const el = document.querySelector("p") || document.body;
      if (!el) return 44;
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight);
      if (!isNaN(lineHeight)) return Math.max(20, lineHeight);
      const fontSize = parseFloat(style.fontSize);
      if (!isNaN(fontSize)) return Math.max(20, fontSize * 1.5);
      return 44;
    }

    function applyRuler() {
      if (rulerEnabled) {
        if (!rulerEl) {
          rulerEl = document.createElement("div");
          rulerEl.id = "__graymatter_ruler__";
          rulerEl.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            height: ${rulerHeight}px;
            background: transparent;
            border-top: 2px solid #7c6af7;
            border-bottom: 2px solid #7c6af7;
            pointer-events: none;
            z-index: 2147483647;
            transition: top 0.1s ease-out, height 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out;
            box-sizing: border-box;
          `;
          document.body.appendChild(rulerEl);

          currentRulerY = Math.max(window.innerHeight / 2 - rulerHeight / 2, 0);
          rulerEl.style.top = `${currentRulerY}px`;
        }
        syncBackdrop();
      } else {
        isSnapped = false; // Reset so re-enabling always starts in normal mode
        if (rulerEl) {
          rulerEl.remove();
          rulerEl = null;
        }
        if (rulerBackdropEl) {
          rulerBackdropEl.remove();
          rulerBackdropEl = null;
        }
        if (rulerToolbarEl) {
          rulerToolbarEl.remove();
          rulerToolbarEl = null;
        }
      }
    }

    // Toggle via Alt+R or options page, move with Up/Down/Left/Right
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.altKey && e.code === "KeyR") {
          e.preventDefault();
          rulerEnabled = !rulerEnabled;
          applyRuler();
          return;
        }

        if (rulerEnabled) {
          if (e.key === "Escape") {
            if (isSnapped && rulerEl) {
              e.preventDefault();
              isSnapped = false;
              // Restore smooth transition now that we're back to free-form mode
              rulerEl.style.transition =
                "top 0.1s ease-out, height 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out";
              rulerEl.style.left = "0";
              rulerEl.style.right = "0";
              rulerEl.style.width = "auto";
              rulerEl.style.top = `${currentRulerY}px`;
              rulerEl.style.borderLeft = "none";
              rulerEl.style.borderRight = "none";
              rulerEl.style.borderRadius = "0";
              syncBackdrop();
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.ctrlKey ? 5 : guessLineHeight();
            currentRulerY -= step;
            if (isSnapped) documentRulerY -= step;
            if (currentRulerY < window.innerHeight * 0.15) {
              const scrollTarget = readModeEl || window;
              scrollTarget.scrollBy({ top: -step * 2, behavior: "instant" });
              currentRulerY += step * 2;
            }
            if (rulerEl) rulerEl.style.top = `${currentRulerY}px`;
            syncBackdrop();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const step = e.ctrlKey ? 5 : guessLineHeight();
            currentRulerY += step;
            if (isSnapped) documentRulerY += step;
            if (currentRulerY > window.innerHeight * 0.85 - rulerHeight) {
              const scrollTarget = readModeEl || window;
              scrollTarget.scrollBy({ top: step * 2, behavior: "instant" });
              currentRulerY -= step * 2;
            }
            if (rulerEl) rulerEl.style.top = `${currentRulerY}px`;
            syncBackdrop();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            rulerHeight = Math.max(10, rulerHeight - 4);
            if (rulerEl) rulerEl.style.height = `${rulerHeight}px`;
            syncBackdrop();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            rulerHeight = Math.min(window.innerHeight * 0.8, rulerHeight + 4);
            if (rulerEl) rulerEl.style.height = `${rulerHeight}px`;
            syncBackdrop();
          }
        }
      },
      { capture: true },
    );

    // Click to move ruler
    window.addEventListener(
      "mousedown",
      (e) => {
        if (rulerToolbarEl && rulerToolbarEl.contains(e.target as Node)) {
          return;
        }
        if (rulerEnabled && e.button === 0) {
          if (e.ctrlKey || rulerAutoSnap) {
            const target = e.target as HTMLElement;
            if (target && rulerEl) {
              isSnapped = true;
              // Disable CSS transition so border and SVG mask stay frame-perfect in sync
              rulerEl.style.transition = "none";
              const rect = target.getBoundingClientRect();
              const p = 6; // padding
              currentRulerY = rect.top - p;
              const scrollY = readModeEl
                ? readModeEl.scrollTop
                : window.scrollY;
              const scrollX = readModeEl ? 0 : window.scrollX;
              documentRulerY = currentRulerY + scrollY;
              documentRulerX = rect.left - p + scrollX;
              rulerHeight = rect.height + p * 2;
              rulerEl.style.left = `${rect.left - p}px`;
              rulerEl.style.right = "auto";
              rulerEl.style.width = `${rect.width + p * 2}px`;
              rulerEl.style.height = `${rulerHeight}px`;
              rulerEl.style.top = `${currentRulerY}px`;
              rulerEl.style.borderLeft = "2px solid #7c6af7";
              rulerEl.style.borderRight = "2px solid #7c6af7";
              rulerEl.style.borderRadius = "6px";
            }
          } else {
            isSnapped = false;
            currentRulerY = e.clientY - rulerHeight / 2;
            if (rulerEl) {
              // Restore smooth transition for free-form ruler movement
              rulerEl.style.transition =
                "top 0.1s ease-out, height 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out";
              rulerEl.style.left = "0";
              rulerEl.style.right = "0";
              rulerEl.style.width = "auto";
              rulerEl.style.height = `${rulerHeight}px`;
              rulerEl.style.top = `${currentRulerY}px`;
              rulerEl.style.borderLeft = "none";
              rulerEl.style.borderRight = "none";
              rulerEl.style.borderRadius = "0";
            }
          }
          syncBackdrop();
        }
      },
      { capture: true, passive: true },
    );

    chrome.storage.local.get(
      { rulerAutoSnap: false, rulerBackdropMode: "dim" },
      (res) => {
        rulerAutoSnap = res.rulerAutoSnap as boolean;
        rulerBackdropMode = res.rulerBackdropMode as string;
      },
    );

    /* ---------------------- Read Mode --------------------- */
    // built using mozilla's readability library
    let readModeEnabled = false;
    let readModeEl: HTMLDivElement | null = null;

    /* -------------------- Read Aloud (TTS) ---------------- */
    let ttsActive = false;
    let ttsPaused = false;
    let ttsWordSpans: HTMLElement[] = [];
    let ttsLineEls: (HTMLElement | null)[] = [];
    let ttsActiveWordEl: HTMLElement | null = null;
    let ttsActiveLineEl: HTMLElement | null = null;
    let ttsUtterance: SpeechSynthesisUtterance | null = null;
    let ttsRate = 1.0;
    let ttsVoice: SpeechSynthesisVoice | null = null;
    let ttsPlayBtn: HTMLButtonElement | null = null;
    let ttsWordOffset = 0; // char offset into the plain text
    let ttsFullText = ""; // plain-text of current article, set once after spanify
    let ttsVersion = 0; // incremented on each new utterance; stale utterances bail on their callbacks

    function clearTtsHighlights() {
      ttsActiveWordEl?.classList.remove("__rm_word_active__");
      ttsActiveLineEl?.classList.remove("__rm_line_active__");
      ttsActiveWordEl = null;
      ttsActiveLineEl = null;
    }

    function stopTts() {
      ttsVersion++; // invalidate any in-flight utterance
      speechSynthesis.cancel();
      ttsActive = false;
      ttsPaused = false;
      clearTtsHighlights();
      ttsWordOffset = 0;
      if (ttsPlayBtn) {
        ttsPlayBtn.innerHTML = "▶";
        ttsPlayBtn.title = "Play";
      }
    }

    function buildTtsUtterance(text: string) {
      const myVersion = ++ttsVersion; // each utterance owns its generation
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = ttsRate;
      if (ttsVoice) utt.voice = ttsVoice;

      utt.onboundary = (e) => {
        if (myVersion !== ttsVersion) return; // stale utterance
        if (e.name !== "word") return;
        clearTtsHighlights();

        // Find the span whose char range includes this boundary
        const charIdx = ttsWordOffset + e.charIndex;
        let best: HTMLElement | null = null;
        let bestDist = Infinity;
        for (const span of ttsWordSpans) {
          const start = parseInt(span.dataset.start ?? "0", 10);
          const end = parseInt(span.dataset.end ?? "0", 10);
          if (charIdx >= start && charIdx <= end) {
            best = span;
            break;
          }
          const dist = Math.min(
            Math.abs(charIdx - start),
            Math.abs(charIdx - end),
          );
          if (dist < bestDist) {
            bestDist = dist;
            best = span;
          }
        }

        if (best) {
          ttsActiveWordEl = best;
          best.classList.add("__rm_word_active__");
          // Line = closest block-level ancestor inside contentWrap
          const line = best.closest<HTMLElement>(
            "p, h1, h2, h3, h4, h5, h6, li, blockquote, td",
          ) as HTMLElement | null;
          if (line && line !== ttsActiveLineEl) {
            ttsActiveLineEl?.classList.remove("__rm_line_active__");
            ttsActiveLineEl = line;
            line.classList.add("__rm_line_active__");
          }
          // Teleprompter scroll: bring word to ~45% from top when near bottom edge
          {
            const scrollEl = readModeEl ?? document.documentElement;
            const containerH = readModeEl
              ? readModeEl.clientHeight
              : window.innerHeight;
            const wordRect = best.getBoundingClientRect();
            const containerTop = readModeEl
              ? readModeEl.getBoundingClientRect().top
              : 0;
            const relBottom = wordRect.bottom - containerTop;
            // Only scroll when the word enters the bottom 30% of the container
            if (relBottom > containerH * 0.7 || wordRect.top < containerTop) {
              const currentScroll = readModeEl
                ? readModeEl.scrollTop
                : window.scrollY;
              const wordTopInDoc =
                wordRect.top - containerTop + currentScroll;
              const targetScroll =
                wordTopInDoc -
                containerH * 0.45 +
                wordRect.height / 2;
              scrollEl.scrollTo({ top: targetScroll, behavior: "smooth" });
            }
          }
        }
      };

      utt.onend = () => {
        if (myVersion !== ttsVersion) return; // stale — another utterance took over
        ttsActive = false;
        ttsPaused = false;
        ttsWordOffset = 0;
        clearTtsHighlights();
        if (ttsPlayBtn) {
          ttsPlayBtn.innerHTML = "▶";
          ttsPlayBtn.title = "Play";
        }
      };

      utt.onerror = () => {
        if (myVersion !== ttsVersion) return; // stale
        ttsActive = false;
        ttsPaused = false;
        clearTtsHighlights();
        if (ttsPlayBtn) {
          ttsPlayBtn.innerHTML = "▶";
          ttsPlayBtn.title = "Play";
        }
      };

      return utt;
    }

    /** Wrap every word-token in contentWrap with a <span data-start data-end> */
    function spanifyWords(container: HTMLElement): string {
      // Collect plain text and build span map
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
      );
      type Seg = { node: Text; parentEl: HTMLElement; text: string };
      const segments: Seg[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const t = node as Text;
        const parent = t.parentElement;
        if (!parent) continue;
        // Skip invisible / already-spanified
        if (parent.classList.contains("__rm_word__")) continue;
        segments.push({ node: t, parentEl: parent, text: t.textContent ?? "" });
      }

      ttsWordSpans = [];
      ttsLineEls = [];

      // Build one big plain-text string with accurate offsets for each token
      let fullText = "";
      const wordRe = /\S+/g;

      for (const seg of segments) {
        const segStart = fullText.length;
        fullText += seg.text;
        // Replace this text node with span-wrapped words + preserved whitespace
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        seg.text.replace(wordRe, (match, offset) => {
          // Whitespace before the match
          if (offset > lastIdx) {
            frag.appendChild(
              document.createTextNode(seg.text.slice(lastIdx, offset)),
            );
          }
          const span = document.createElement("span");
          span.className = "__rm_word__";
          span.textContent = match;
          span.dataset.start = String(segStart + offset);
          span.dataset.end = String(segStart + offset + match.length - 1);
          frag.appendChild(span);
          ttsWordSpans.push(span);
          lastIdx = offset + match.length;
          return match;
        });
        // Remaining whitespace after last word
        if (lastIdx < seg.text.length) {
          frag.appendChild(document.createTextNode(seg.text.slice(lastIdx)));
        }
        seg.node.replaceWith(frag);
      }

      return fullText;
    }

    async function applyReadMode() {
      if (readModeEnabled) {
        if (readModeEl) return; // already open

        // Disable body scroll while read mode is open
        const originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Dynamically import to avoid bloating the main content script on every page load
        const { Readability } = await import("@mozilla/readability");
        const DOMPurify = (await import("dompurify")).default;

        // Clone document to not mutate live DOM during parsing
        const documentClone = document.cloneNode(true) as Document;
        const reader = new Readability(documentClone);
        const article = reader.parse();

        if (!article) {
          // If Readability fails to find content, fallback gracefully or show an error
          readModeEnabled = false;
          alert(
            "GrayMatter: Could not find readable article content on this page.",
          );
          return;
        }

        // Sanitize the HTML output
        const cleanHtml = DOMPurify.sanitize(article.content ?? "", {
          USE_PROFILES: { html: true },
          FORBID_TAGS: [
            "style",
            "script",
            "iframe",
            "form",
            "input",
            "textarea",
            "button",
          ],
          RETURN_TRUSTED_TYPE: false,
        }) as string;

        // Reading time estimate (based on plain text length)
        const wordCount = (article.textContent || "")
          .split(/\s+/)
          .filter(Boolean).length;
        const readMins = Math.max(1, Math.round(wordCount / 200));

        chrome.storage.local.get(
          {
            activeFont: "default",
            rmTheme: "dark",
            rmFontSize: 20,
          },
          ({ activeFont, rmTheme, rmFontSize }) => {
            const fontFamily =
              (activeFont as string) === "default"
                ? "'Lexend', sans-serif, system-ui"
                : `"${activeFont}", sans-serif, system-ui`;

            readModeEl = document.createElement("div");
            readModeEl.id = "__graymatter_readmode__";
            readModeEl.dataset.theme = rmTheme as string;
            readModeEl.style.cssText = [
              "position: fixed",
              "inset: 0",
              "z-index: 2147483640", // Lowered below ruler elements
              "background: var(--rm-bg)",
              "overflow-y: auto",
              "box-sizing: border-box",
              "animation: nf-fade-in 0.2s ease-out",
              "transition: background 0.3s ease",
            ].join(";");

            // Internal scroll listener for ruler sync
            readModeEl.addEventListener(
              "scroll",
              () => {
                if (rulerEnabled) syncRulerPosition();
              },
              { passive: true },
            );

            // CSS Variable setup for themes
            const themeStyle = document.createElement("style");
            themeStyle.textContent = `
            #__graymatter_readmode__[data-theme="dark"] {
              --rm-bg: #111116; --rm-text: #d1d1d6; --rm-heading: #e8e8e8; --rm-meta: #a0a0a0;
              --rm-link: #00ddff; --rm-border: #333333; --rm-panel-bg: #1a1a1a; --rm-code-bg: #222222;
              --rm-accent: rgba(124,106,247,0.2);
            }
            #__graymatter_readmode__[data-theme="light"] {
              --rm-bg: #f8f9fa; --rm-text: #333333; --rm-heading: #111111; --rm-meta: #666666;
              --rm-link: #0066cc; --rm-border: #e2e8f0; --rm-panel-bg: #ffffff; --rm-code-bg: #f1f5f9;
              --rm-accent: rgba(0,102,204,0.1);
            }
            #__graymatter_readmode__[data-theme="sepia"] {
              --rm-bg: #f4ecd8; --rm-text: #5b4636; --rm-heading: #433422; --rm-meta: #826c59;
              --rm-link: #b26818; --rm-border: #e3d3b7; --rm-panel-bg: #faeedf; --rm-code-bg: #eaddc5;
              --rm-accent: rgba(178,104,24,0.1);
            }
            #__graymatter_readmode__[data-theme="warm"] {
              --rm-bg: #2a221f; --rm-text: #e0d0c1; --rm-heading: #f0e6d2; --rm-meta: #b09c8d;
              --rm-link: #ff9966; --rm-border: #4a3c36; --rm-panel-bg: #362c28; --rm-code-bg: #231c19;
              --rm-accent: rgba(255,153,102,0.15);
            }
          `;
            readModeEl.appendChild(themeStyle);

            // Left Sidebar for Controls
            const sidebar = document.createElement("div");
            sidebar.style.cssText = [
              "position: fixed",
              "top: 60px",
              "left: 20px",
              "width: 48px",
              "display: flex",
              "flex-direction: column",
              "gap: 12px",
              "background: var(--rm-panel-bg)",
              "border: 1px solid var(--rm-border)",
              "border-radius: 24px",
              "padding: 12px 0",
              "align-items: center",
              "box-shadow: 0 4px 16px rgba(0,0,0,0.1)",
              "transition: all 0.3s ease",
              "z-index: 10",
            ].join(";");

            const createBtn = (
              icon: string,
              onClick: () => void,
              tooltip: string,
            ) => {
              const btn = document.createElement("button");
              btn.innerHTML = icon;
              btn.title = tooltip;
              btn.style.cssText = [
                "all: unset",
                "width: 32px",
                "height: 32px",
                "display: flex",
                "align-items: center",
                "justify-content: center",
                "border-radius: 50%",
                "cursor: pointer",
                "color: var(--rm-text)",
                "font-size: 16px",
                "transition: background 0.15s",
              ].join(";");
              btn.addEventListener(
                "mouseenter",
                () => (btn.style.background = "var(--rm-accent)"),
              );
              btn.addEventListener(
                "mouseleave",
                () => (btn.style.background = "transparent"),
              );
              btn.addEventListener("click", onClick);
              return btn;
            };

            // Exit Button
            sidebar.appendChild(
              createBtn(
                "✕",
                () => {
                  readModeEnabled = false;
                  applyReadMode();
                },
                "Exit Read Mode",
              ),
            );

            // Separator
            const sep1 = document.createElement("div");
            sep1.style.cssText =
              "width: 24px; height: 1px; background: var(--rm-border); margin: 4px 0;";
            sidebar.appendChild(sep1);

            // Font controls
            let currentFontSize = rmFontSize as number;
            sidebar.appendChild(
              createBtn(
                "A+",
                () => {
                  currentFontSize = Math.min(32, currentFontSize + 2);
                  panel.style.fontSize = `${currentFontSize}px`;
                  chrome.storage.local.set({ rmFontSize: currentFontSize });
                },
                "Increase Font Size",
              ),
            );

            sidebar.appendChild(
              createBtn(
                "A-",
                () => {
                  currentFontSize = Math.max(14, currentFontSize - 2);
                  panel.style.fontSize = `${currentFontSize}px`;
                  chrome.storage.local.set({ rmFontSize: currentFontSize });
                },
                "Decrease Font Size",
              ),
            );

            // Separator
            const sep2 = document.createElement("div");
            sep2.style.cssText =
              "width: 24px; height: 1px; background: var(--rm-border); margin: 4px 0;";
            sidebar.appendChild(sep2);

            // Theme controls
            const createThemeDot = (
              themeName: string,
              bg: string,
              border: string,
            ) => {
              const dot = document.createElement("button");
              dot.title = `${themeName} theme`;
              dot.style.cssText = [
                "all: unset",
                "width: 20px",
                "height: 20px",
                "border-radius: 50%",
                `background: ${bg}`,
                `border: 2px solid ${border}`,
                "cursor: pointer",
                "box-sizing: border-box",
                "transition: transform 0.1s",
              ].join(";");
              dot.addEventListener(
                "mouseenter",
                () => (dot.style.transform = "scale(1.15)"),
              );
              dot.addEventListener(
                "mouseleave",
                () => (dot.style.transform = "scale(1)"),
              );
              dot.addEventListener("click", () => {
                if (readModeEl) readModeEl.dataset.theme = themeName;
                chrome.storage.local.set({ rmTheme: themeName });
              });
              return dot;
            };

            sidebar.appendChild(createThemeDot("dark", "#111116", "#333"));
            sidebar.appendChild(createThemeDot("light", "#f8f9fa", "#ccc"));
            sidebar.appendChild(createThemeDot("sepia", "#f4ecd8", "#d6caaf"));
            sidebar.appendChild(createThemeDot("warm", "#2a221f", "#4a3c36"));

            // Inner panel (just for centering content, no borders)
            const panel = document.createElement("div");
            panel.style.cssText = [
              "max-width: 680px",
              "margin: 0 auto",
              "padding: 72px 24px 120px",
              `font-family: ${fontFamily}`,
              `font-size: ${currentFontSize}px`,
              "line-height: 1.6",
              "color: var(--rm-text)",
              "position: relative",
              "transition: font-size 0.2s",
            ].join(";");

            // top Meta bar (title + reading time)
            const meta = document.createElement("div");
            meta.style.cssText =
              "margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--rm-border);";
            meta.innerHTML = `
            ${article.title ? `<h1 style="margin:0 0 16px 0;font-size:36px;font-weight:700;color:var(--rm-heading);line-height:1.2;">${article.title}</h1>` : ""}
            <div style="font-size:15px;color:var(--rm-meta);display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
              ${article.byline ? `<span>By ${article.byline}</span>` : ""}
              <span>·</span>
              <span>~${readMins} min read</span>
            </div>
          `;

            // TTS highlight styles
            const ttsStyle = document.createElement("style");
            ttsStyle.textContent = `
              .__rm_word_active__ {
                text-decoration: underline;
                text-decoration-color: #888888;
                text-decoration-thickness: 3px;
                text-underline-offset: 3px;
                border-radius: 2px;
              }
              .__rm_line_active__ {
                background: rgba(136, 136, 136, 0.15);
                border-radius: 6px;
                transition: background 0.15s;
              }
            `;
            readModeEl!.appendChild(ttsStyle);

            // Content styles wrapper
            const contentWrap = document.createElement("div");
            contentWrap.className = "__nf_rm_body__";
            contentWrap.innerHTML = cleanHtml;

            // Scoped styles for the parsed HTML
            const scopeStyle = document.createElement("style");
            scopeStyle.textContent = `
              .__nf_rm_body__, .__nf_rm_body__ p, .__nf_rm_body__ div, 
              .__nf_rm_body__ li, .__nf_rm_body__ span, .__nf_rm_body__ td,
              .__nf_rm_body__ th, .__nf_rm_body__ blockquote {
                color: var(--rm-text) !important;
                font-size: 1em !important;
                font-family: inherit !important;
              }

            .__nf_rm_body__ h1, .__nf_rm_body__ h2,
            .__nf_rm_body__ h3, .__nf_rm_body__ h4,
            .__nf_rm_body__ h5, .__nf_rm_body__ h6 {
              color: var(--rm-heading) !important; margin-top: 1.8em; margin-bottom: 0.6em; line-height: 1.35; font-weight: 600;
              font-size: revert; /* let the specific rules below override */
            }
            .__nf_rm_body__ h1 { font-size: 1.8em; }
            .__nf_rm_body__ h2 { font-size: 1.5em; }
            .__nf_rm_body__ h3 { font-size: 1.25em; border-bottom: 1px solid var(--rm-border); padding-bottom: 0.3em; }
            .__nf_rm_body__ h4 { font-size: 1.1em; }
            .__nf_rm_body__ p  { margin: 0 0 1.2em 0; }
            .__nf_rm_body__ p:last-child  { margin-bottom: 0; }
            .__nf_rm_body__ a  { color: var(--rm-link) !important; text-decoration: none; border-bottom: 1px solid var(--rm-link); }
            .__nf_rm_body__ a:hover { opacity: 0.8; }
            .__nf_rm_body__ a:has(img) { border-bottom: none; display: block; width: fit-content; margin: 24px auto; }
            .__nf_rm_body__ img, .__nf_rm_body__ video, .__nf_rm_body__ picture { 
              max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto; background: var(--rm-code-bg); 
            }
            .__nf_rm_body__ figure { margin: 24px 0; }
            .__nf_rm_body__ figcaption { font-size: 14px; color: var(--rm-meta); text-align: center; margin-top: 8px; font-style: italic; }
            .__nf_rm_body__ blockquote {
              border-left: 4px solid var(--rm-meta); margin: 1.6em 0;
              padding: 4px 0 4px 24px; color: var(--rm-meta); font-style: italic;
            }
            .__nf_rm_body__ code {
              background: var(--rm-code-bg); border-radius: 4px; padding: 2px 6px;
              font-size: 0.9em; font-family: ui-monospace, 'Cascadia Code', monospace; color: var(--rm-text);
            }
            .__nf_rm_body__ pre {
              background: var(--rm-panel-bg); border-radius: 6px; padding: 16px; border: 1px solid var(--rm-border);
              overflow-x: auto; margin: 1.4em 0;
            }
            .__nf_rm_body__ pre code { background: transparent; padding: 0; font-size: 0.85em; border: none; }
            .__nf_rm_body__ ul, .__nf_rm_body__ ol { padding-left: 2em; margin-bottom: 1.2em; }
            .__nf_rm_body__ li { margin-bottom: 0.5em; }
            .__nf_rm_body__ hr { border: none; border-top: 1px solid var(--rm-border); margin: 3em 0; }
            .__nf_rm_body__ table { width: 100%; margin: 1.5em 0; border-collapse: collapse; font-size: 0.9em; }
            .__nf_rm_body__ th, .__nf_rm_body__ td { border: 1px solid var(--rm-border); padding: 10px 14px; text-align: left; }
            .__nf_rm_body__ th { background: var(--rm-panel-bg); font-weight: 600; color: var(--rm-heading); }
          `;

            panel.appendChild(meta);
            panel.appendChild(scopeStyle);
            panel.appendChild(contentWrap);

            // Separator before TTS
            const sep3 = document.createElement("div");
            sep3.style.cssText =
              "width: 24px; height: 1px; background: var(--rm-border); margin: 4px 0;";
            sidebar.appendChild(sep3);

            // TTS Speaker Button
            let ttsControlPanel: HTMLDivElement | null = null;
            ttsPlayBtn = null;

            const speakerBtn = createBtn(
              "🔊",
              () => {
                if (ttsControlPanel) {
                  ttsControlPanel.style.display =
                    ttsControlPanel.style.display === "none" ? "flex" : "none";
                  return;
                }

                // Build controls panel
                ttsControlPanel = document.createElement("div");
                ttsControlPanel.style.cssText = [
                  "position: fixed",
                  "top: 60px",
                  "left: 80px",
                  "background: var(--rm-panel-bg)",
                  "border: 1px solid var(--rm-border)",
                  "border-radius: 16px",
                  "padding: 16px",
                  "display: flex",
                  "flex-direction: column",
                  "gap: 12px",
                  "z-index: 20",
                  "min-width: 240px",
                  "box-shadow: 0 8px 24px rgba(0,0,0,0.2)",
                  "font-family: 'Lexend', system-ui, sans-serif",
                  "font-size: 13px",
                  "color: var(--rm-text)",
                ].join(";");

                // Label helper
                const mkLabel = (text: string) => {
                  const l = document.createElement("div");
                  l.textContent = text;
                  l.style.cssText =
                    "font-size: 11px; font-weight: 600; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.06em;";
                  return l;
                };

                // Voice selector
                ttsControlPanel.appendChild(mkLabel("Voice"));
                const voiceSel = document.createElement("select");
                voiceSel.style.cssText = [
                  "all: unset",
                  "display: block",
                  "width: 100%",
                  "background: var(--rm-code-bg)",
                  "border: 1px solid var(--rm-border)",
                  "border-radius: 8px",
                  "padding: 6px 10px",
                  "font-size: 13px",
                  "font-family: inherit",
                  "color: var(--rm-text)",
                  "cursor: pointer",
                  "box-sizing: border-box",
                ].join(";");

                const populateVoices = () => {
                    const voices = speechSynthesis.getVoices().filter(v => !v.name.includes('Google'));
                  voiceSel.innerHTML = "";
                  voices.forEach((v, i) => {
                    const opt = document.createElement("option");
                    opt.value = String(i);
                    opt.textContent = `${v.name} (${v.lang})`;
                    voiceSel.appendChild(opt);
                  });
                  // Pre-select saved voice
                  if (ttsVoice) {
                    const idx = voices.findIndex(
                      (v) => v.name === ttsVoice!.name,
                    );
                    if (idx >= 0) voiceSel.value = String(idx);
                  }
                };
                populateVoices();
                if (speechSynthesis.onvoiceschanged !== undefined) {
                  speechSynthesis.onvoiceschanged = populateVoices;
                }
                voiceSel.addEventListener("change", () => {
                  ttsVoice =
                    speechSynthesis.getVoices()[parseInt(voiceSel.value, 10)] ??
                    null;

                  // If currently speaking, restart from current word position
                  if (ttsActive && !ttsPaused) {
                    const resumeOffset = ttsActiveWordEl
                      ? parseInt(ttsActiveWordEl.dataset.start ?? "0", 10)
                      : ttsWordOffset;
                    // Cancel old utterance — its onend will be ignored (stale version)
                    speechSynthesis.cancel();
                    // Use rAF to let cancel() clear the queue before speaking again
                    requestAnimationFrame(() => {
                      ttsWordOffset = resumeOffset;
                      ttsUtterance = buildTtsUtterance(
                        ttsFullText.slice(resumeOffset),
                      );
                      speechSynthesis.speak(ttsUtterance);
                    });
                  }
                });
                ttsControlPanel.appendChild(voiceSel);

                // Speed slider
                ttsControlPanel.appendChild(
                  mkLabel(`Speed — ${ttsRate.toFixed(1)}×`),
                );
                const speedRow = document.createElement("div");
                speedRow.style.cssText =
                  "display:flex; align-items:center; gap:8px;";

                const speedLabel = document.createElement("span");
                speedLabel.style.cssText =
                  "font-size:12px; min-width:30px; text-align:right; opacity:0.7;";
                speedLabel.textContent = `${ttsRate.toFixed(1)}×`;

                const speedSlider = document.createElement("input");
                speedSlider.type = "range";
                speedSlider.min = "0.5";
                speedSlider.max = "2";
                speedSlider.step = "0.1";
                speedSlider.value = String(ttsRate);
                speedSlider.style.cssText =
                  "flex:1; accent-color: #7c6af7; cursor:pointer;";
                speedSlider.addEventListener("input", () => {
                  ttsRate = parseFloat(speedSlider.value);
                  speedLabel.textContent = `${ttsRate.toFixed(1)}×`;
                  // Update active utterance rate on the fly by restarting
                  if (ttsActive && !ttsPaused) {
                    // Restart will pick up new rate
                    speechSynthesis.pause();
                    speechSynthesis.resume();
                  }
                });
                speedRow.appendChild(speedSlider);
                speedRow.appendChild(speedLabel);
                ttsControlPanel.appendChild(speedRow);

                // Playback buttons
                const btnRow = document.createElement("div");
                btnRow.style.cssText =
                  "display:flex; gap:8px; align-items:center; justify-content:center; margin-top:4px;";

                const mkCtrlBtn = (
                  label: string,
                  title: string,
                  onClick: () => void,
                ) => {
                  const b = document.createElement(
                    "button",
                  ) as HTMLButtonElement;
                  b.innerHTML = label;
                  b.title = title;
                  b.style.cssText = [
                    "all: unset",
                    "width: 40px",
                    "height: 40px",
                    "display: flex",
                    "align-items: center",
                    "justify-content: center",
                    "border-radius: 50%",
                    "cursor: pointer",
                    "font-size: 18px",
                    "background: var(--rm-accent)",
                    "color: var(--rm-text)",
                    "transition: opacity 0.15s",
                  ].join(";");
                  b.addEventListener(
                    "mouseenter",
                    () => (b.style.opacity = "0.75"),
                  );
                  b.addEventListener(
                    "mouseleave",
                    () => (b.style.opacity = "1"),
                  );
                  b.addEventListener("click", onClick);
                  return b;
                };

                // Play / Pause
                const playBtn = mkCtrlBtn("▶", "Play", () => {
                  if (!ttsActive) {
                    // Ensure spanify has run (rAF may have already done it)
                    if (ttsWordSpans.length === 0) {
                      ttsFullText = spanifyWords(contentWrap);
                    }
                    ttsWordOffset = 0;
                    ttsUtterance = buildTtsUtterance(ttsFullText);
                    ttsActive = true;
                    ttsPaused = false;
                    speechSynthesis.speak(ttsUtterance);
                    playBtn.innerHTML = "⏸";
                    playBtn.title = "Pause";
                  } else if (ttsPaused) {
                    speechSynthesis.resume();
                    ttsPaused = false;
                    playBtn.innerHTML = "⏸";
                    playBtn.title = "Pause";
                  } else {
                    speechSynthesis.pause();
                    ttsPaused = true;
                    playBtn.innerHTML = "▶";
                    playBtn.title = "Resume";
                  }
                }) as HTMLButtonElement;
                ttsPlayBtn = playBtn;

                // Stop
                const stopBtn = mkCtrlBtn("⏹", "Stop", () => {
                  stopTts();
                });
                stopBtn.style.fontSize = "15px";

                btnRow.appendChild(playBtn);
                btnRow.appendChild(stopBtn);
                ttsControlPanel.appendChild(btnRow);

                readModeEl!.appendChild(ttsControlPanel);

                // Click-outside: hide panel when clicking outside it or the speaker btn
                readModeEl!.addEventListener(
                  "pointerdown",
                  (ev) => {
                    if (!ttsControlPanel) return;
                    if (ttsControlPanel.style.display === "none") return;
                    const target = ev.target as Node;
                    if (
                      !ttsControlPanel.contains(target) &&
                      !speakerBtn.contains(target)
                    ) {
                      ttsControlPanel.style.display = "none";
                    }
                  },
                  { capture: true },
                );
              },
              "Read Aloud",
            );
            sidebar.appendChild(speakerBtn);

            readModeEl.appendChild(sidebar);
            readModeEl.appendChild(panel);
            document.body.appendChild(readModeEl);

            // Save original overflow on the readModeEl for teardown
            readModeEl.dataset.origOverflow = originalBodyOverflow;

            // Spanify after DOM insertion so TreeWalker traverses live nodes
            // (deferred so the panel renders first)
            requestAnimationFrame(() => {
              if (ttsWordSpans.length === 0) {
                ttsFullText = spanifyWords(contentWrap);
              }
            });
          },
        );
      } else {
        // Stop TTS before tearing down
        stopTts();
        ttsWordSpans = [];
        ttsLineEls = [];
        ttsPlayBtn = null;
        if (readModeEl) {
          // Restore body overflow
          document.body.style.overflow = readModeEl.dataset.origOverflow || "";
          readModeEl.remove();
          readModeEl = null;
        }
      }
    }

    // Escape key exits read mode
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && readModeEnabled && readModeEl) {
          readModeEnabled = false;
          applyReadMode();
        }
      },
      { capture: true },
    );

    /* -------------------- Dictionary Mode ------------------- */
    let activeDictPopup: HTMLElement | null = null;
    let currentDictRequestId = "";

    function removeDictPopup() {
      if (activeDictPopup) {
        activeDictPopup.remove();
        activeDictPopup = null;
        chrome.runtime
          .sendMessage({ action: "STOP_GENERATION" })
          .catch(() => {});
      }
    }

    document.addEventListener("dblclick", async (e) => {
      // We read the global `window.__graymatter_dictEnabled` state mapped below
      if (!(window as any).__graymatter_dictEnabled) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const word = selection.toString().trim();
      // Only process single words (ignore multi-word selection or tiny words)
      if (!word || word.includes(" ") || word.length < 2) return;

      removeDictPopup();

      const popup = document.createElement("div");
      popup.style.cssText = `
        position: absolute;
        top: ${e.pageY + 15}px;
        left: ${e.pageX + 10}px;
        z-index: 2147483647;
        background: #0a0a0a;
        color: #f8fafc;
        border: 1px solid #363636;
        border-radius: 8px;
        padding: 12px;
        width: 280px;
        font-family: "Lexend", system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
      `;
      popup.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px; color: #fafafa; font-size: 16px;">${word}</div>
        <div id="gray-matter-dict-api-content" style="font-size: 13.5px; margin-bottom: 8px; display: none;"></div>
        <div id="gray-matter-dict-content" style="opacity: 0.8; font-size: 13px;">Loading definition...</div>
      `;

      document.body.appendChild(popup);
      activeDictPopup = popup;

      // fetch from API
      try {
        const apiRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          const firstMeaning = data[0]?.meanings[0];
          if (firstMeaning) {
            const apiDiv = popup.querySelector("#gray-matter-dict-api-content") as HTMLElement;
            if (apiDiv) {
              const partOfSpeech = firstMeaning.partOfSpeech;
              const definition = firstMeaning.definitions[0]?.definition;
              apiDiv.innerHTML = `<span style="font-style: italic; opacity: 0.7; font-size: 12px;">${partOfSpeech}</span><br/>${definition}`;
              apiDiv.style.display = "block";
              
              const aiDiv = popup.querySelector("#gray-matter-dict-content") as HTMLElement;
              if (aiDiv) {
                aiDiv.style.borderTop = "1px solid #363636";
                aiDiv.style.paddingTop = "8px";
              }
            }
          }
        }
      } catch (err) {
        // Ignore API errors
      }

      currentDictRequestId = "define-" + Date.now();
      try {
        const res = await chrome.runtime.sendMessage({
          action: "DEFINE_WORD",
          payload: { word, requestId: currentDictRequestId },
        });

        if (res?.error) {
          const contentEl = popup.querySelector(
            "#gray-matter-dict-content",
          ) as HTMLElement;
          if (contentEl) contentEl.innerText = res.error;
        }
      } catch (err) {
        const contentEl = popup.querySelector(
          "#gray-matter-dict-content",
        ) as HTMLElement;
        if (contentEl)
          contentEl.innerText = "Error: Could not connect to WebLLM engine.";
      }
    });

    // Close on click outside
    document.addEventListener("pointerdown", (e) => {
      if (!activeDictPopup) return;
      if (!activeDictPopup.contains(e.target as Node)) {
        removeDictPopup();
      }
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (!activeDictPopup) return;

      if (msg.action === "PROGRESS_UPDATE") {
        const contentEl = activeDictPopup.querySelector(
          "#gray-matter-dict-content",
        ) as HTMLElement;
        if (contentEl && currentDictRequestId) {
          if (msg.payload?.text && msg.payload?.progress !== -1) {
            contentEl.innerText = `Loading Engine: ${msg.payload.text} (${msg.payload.progress}%)`;
            contentEl.style.opacity = "0.6";
          }
        }
      }

      if (msg.action === "DEFINE_CHUNK") {
        if (msg.payload.requestId !== currentDictRequestId) return;
        const contentEl = activeDictPopup.querySelector(
          "#gray-matter-dict-content",
        ) as HTMLElement;
        if (contentEl) {
          if (
            contentEl.innerText === "Loading definition..." ||
            contentEl.innerText.startsWith("Loading Engine:")
          ) {
            contentEl.innerText = "";
          }
          contentEl.innerText += msg.payload.chunk;
          contentEl.style.opacity = "1";
        }
      }
    });

    // Keep service worker alive
    setInterval(() => {
      chrome.runtime.sendMessage({ action: "PING" }).catch(() => {});
    }, 20000);
  },
});
