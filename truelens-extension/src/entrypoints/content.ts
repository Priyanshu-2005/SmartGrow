import { defineContentScript } from "#imports";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main() {
    // ─── Constants ───
    const BRAND_ACCENT = "#6366f1"; // Indigo-500
    const BRAND_ACCENT_HOVER = "#818cf8"; // Indigo-400
    const DARK_BG = "#0f0f14";
    const DARK_SURFACE = "#1a1a24";
    const DARK_BORDER = "#2e2e48";
    const TEXT_PRIMARY = "#f0f0f5";
    const TEXT_MUTED = "#8888a8";
    const MIN_SELECTION_LENGTH = 20;

    // Track active result boxes to avoid duplicates
    const activeBoxes: Map<
      string,
      { box: HTMLElement; minimized: HTMLElement | null }
    > = new Map();
    let floatingToolbar: HTMLElement | null = null;
    let currentSelectionRect: DOMRect | null = null;

    // ─── Inject global styles for animations ───
    const animStyle = document.createElement("style");
    animStyle.textContent = `
      @keyframes tl-fade-in {
        0% { opacity: 0; transform: translateY(6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes tl-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes tl-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(animStyle);

    // ─── Utility: Create styled element ───
    function el(
      tag: string,
      styles: Partial<CSSStyleDeclaration>,
      attrs?: Record<string, string>,
    ): HTMLElement {
      const element = document.createElement(tag);
      Object.assign(element.style, styles);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          element.setAttribute(k, v);
        }
      }
      return element;
    }

    // ─── SVG Icons ───
    const ICONS = {
      analyze: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
      factCheck: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
      close: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      minimize: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      maximize: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      xCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      alertTriangle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      helpCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      externalLink: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    };

    // ─── Create loading spinner ───
    function createSpinner(): HTMLElement {
      const spinner = el("div", {
        width: "20px",
        height: "20px",
        border: `2px solid ${DARK_BORDER}`,
        borderTopColor: BRAND_ACCENT,
        borderRadius: "50%",
        animation: "tl-spin 0.6s linear infinite",
        flexShrink: "0",
      });
      return spinner;
    }

    // ─── Position a box relative to selection ───
    function positionBox(
      box: HTMLElement,
      rect: DOMRect,
      prefer: "below" | "above" = "below",
    ) {
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      const gap = 8;

      box.style.position = "absolute";
      box.style.zIndex = "2147483640";
      box.style.left = `${Math.max(8, rect.left + scrollX)}px`;
      box.style.maxWidth = `${Math.min(520, window.innerWidth - 32)}px`;
      box.style.width = "480px";

      if (prefer === "below") {
        const belowY = rect.bottom + scrollY + gap;
        // Check if there's enough room below
        if (
          rect.bottom + 300 >
          window.innerHeight
        ) {
          // Place above
          box.style.top = "auto";
          box.style.top = `${rect.top + scrollY - gap}px`;
          box.style.transform = "translateY(-100%)";
        } else {
          box.style.top = `${belowY}px`;
          box.style.transform = "none";
        }
      } else {
        box.style.top = `${rect.top + scrollY - gap}px`;
        box.style.transform = "translateY(-100%)";
      }
    }

    // ─── Floating toolbar on text selection ───
    function showFloatingToolbar(rect: DOMRect, selectedText: string) {
      removeFloatingToolbar();
      currentSelectionRect = rect;

      const toolbar = el("div", {
        position: "absolute",
        zIndex: "2147483646",
        display: "flex",
        gap: "4px",
        padding: "4px",
        background: DARK_SURFACE,
        border: `1px solid ${DARK_BORDER}`,
        borderRadius: "10px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(99,102,241,0.15)",
        animation: "tl-fade-in 0.15s ease-out",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      });

      // Position above selection
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      toolbar.style.left = `${rect.left + scrollX + rect.width / 2}px`;
      toolbar.style.top = `${rect.top + scrollY - 8}px`;
      toolbar.style.transform = "translate(-50%, -100%)";

      // If would go off top of screen, place below
      if (rect.top < 60) {
        toolbar.style.top = `${rect.bottom + scrollY + 8}px`;
        toolbar.style.transform = "translate(-50%, 0)";
      }

      const makeBtn = (
        icon: string,
        label: string,
        onClick: () => void,
      ) => {
        const btn = el("button", {
          all: "unset",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "7px 14px",
          fontSize: "12px",
          fontWeight: "600",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          borderRadius: "7px",
          color: TEXT_PRIMARY,
          cursor: "pointer",
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
          background: "transparent",
        });
        btn.innerHTML = `${icon} ${label}`;

        btn.addEventListener("mouseenter", () => {
          btn.style.background = `${BRAND_ACCENT}22`;
          btn.style.color = BRAND_ACCENT_HOVER;
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.background = "transparent";
          btn.style.color = TEXT_PRIMARY;
        });
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        });

        return btn;
      };

      const analyzeBtn = makeBtn(
        ICONS.analyze,
        "Text Analysis",
        () => {
          removeFloatingToolbar();
          handleTextAnalysis(selectedText, rect);
        },
      );
      const factCheckBtn = makeBtn(
        ICONS.factCheck,
        "Fact Check",
        () => {
          removeFloatingToolbar();
          handleFactCheck(selectedText, rect);
        },
      );

      toolbar.appendChild(analyzeBtn);

      // Vertical divider
      const divider = el("div", {
        width: "1px",
        background: DARK_BORDER,
        margin: "4px 0",
        flexShrink: "0",
      });
      toolbar.appendChild(divider);

      toolbar.appendChild(factCheckBtn);

      document.body.appendChild(toolbar);
      floatingToolbar = toolbar;
    }

    function removeFloatingToolbar() {
      if (floatingToolbar) {
        floatingToolbar.remove();
        floatingToolbar = null;
      }
    }

    // ─── Create result box shell ───
    function createResultBox(
      rect: DOMRect,
      boxId: string,
    ): { box: HTMLElement; contentArea: HTMLElement } {
      const box = el("div", {
        position: "absolute",
        zIndex: "2147483640",
        background: DARK_BG,
        border: `1px solid ${DARK_BORDER}`,
        borderRadius: "14px",
        boxShadow:
          "0 12px 48px rgba(0,0,0,0.55), 0 4px 16px rgba(99,102,241,0.1)",
        animation: "tl-fade-in 0.2s ease-out",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        overflow: "hidden",
        width: "480px",
        maxWidth: `${Math.min(520, window.innerWidth - 32)}px`,
      });

      positionBox(box, rect);

      // ─── Header bar ───
      const header = el("div", {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: `1px solid ${DARK_BORDER}`,
        background: DARK_SURFACE,
      });

      const headerLeft = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: TEXT_PRIMARY,
        fontSize: "13px",
        fontWeight: "600",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      });
      headerLeft.innerHTML = `${ICONS.logo} <span>TrueLens</span>`;

      const headerRight = el("div", {
        display: "flex",
        gap: "4px",
      });

      // Minimize button
      const minimizeBtn = el("button", {
        all: "unset",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        cursor: "pointer",
        color: TEXT_MUTED,
        transition: "all 0.15s",
      });
      minimizeBtn.innerHTML = ICONS.minimize;
      minimizeBtn.title = "Minimize";
      minimizeBtn.addEventListener("mouseenter", () => {
        minimizeBtn.style.background = `${BRAND_ACCENT}22`;
        minimizeBtn.style.color = BRAND_ACCENT_HOVER;
      });
      minimizeBtn.addEventListener("mouseleave", () => {
        minimizeBtn.style.background = "transparent";
        minimizeBtn.style.color = TEXT_MUTED;
      });
      minimizeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        minimizeBox(boxId, rect);
      });

      // Close button
      const closeBtn = el("button", {
        all: "unset",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        cursor: "pointer",
        color: TEXT_MUTED,
        transition: "all 0.15s",
      });
      closeBtn.innerHTML = ICONS.close;
      closeBtn.title = "Close";
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.background = "rgba(239,68,68,0.15)";
        closeBtn.style.color = "#ef4444";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.background = "transparent";
        closeBtn.style.color = TEXT_MUTED;
      });
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeBox(boxId);
      });

      headerRight.appendChild(minimizeBtn);
      headerRight.appendChild(closeBtn);
      header.appendChild(headerLeft);
      header.appendChild(headerRight);

      // ─── Content area ───
      const contentArea = el("div", {
        padding: "16px",
        color: TEXT_PRIMARY,
        fontSize: "13px",
        lineHeight: "1.6",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        maxHeight: "400px",
        overflowY: "auto",
      });

      box.appendChild(header);
      box.appendChild(contentArea);
      document.body.appendChild(box);

      activeBoxes.set(boxId, { box, minimized: null });

      return { box, contentArea };
    }

    // ─── Minimize / Restore ───
    function minimizeBox(boxId: string, rect: DOMRect) {
      const entry = activeBoxes.get(boxId);
      if (!entry) return;

      entry.box.style.display = "none";

      // Create minimized icon
      const icon = el("button", {
        all: "unset",
        position: "absolute",
        zIndex: "2147483641",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        background: BRAND_ACCENT,
        color: "white",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
        transition: "all 0.15s ease",
        animation: "tl-fade-in 0.15s ease-out",
      });
      icon.innerHTML = ICONS.maximize;
      icon.title = "Restore TrueLens result";

      // Position near the selection
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      icon.style.left = `${rect.right + scrollX + 6}px`;
      icon.style.top = `${rect.top + scrollY + rect.height / 2 - 16}px`;

      icon.addEventListener("mouseenter", () => {
        icon.style.transform = "scale(1.1)";
        icon.style.boxShadow = "0 4px 16px rgba(99,102,241,0.5)";
      });
      icon.addEventListener("mouseleave", () => {
        icon.style.transform = "scale(1)";
        icon.style.boxShadow = "0 4px 12px rgba(99,102,241,0.35)";
      });
      icon.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Restore
        entry.box.style.display = "";
        if (entry.minimized) {
          entry.minimized.remove();
          entry.minimized = null;
        }
      });

      document.body.appendChild(icon);
      entry.minimized = icon;
    }

    function removeBox(boxId: string) {
      const entry = activeBoxes.get(boxId);
      if (!entry) return;
      entry.box.remove();
      if (entry.minimized) entry.minimized.remove();
      activeBoxes.delete(boxId);
    }

    // ─── Show loading state in a content area ───
    function showLoading(
      contentArea: HTMLElement,
      message: string,
    ) {
      contentArea.innerHTML = "";
      const wrap = el("div", {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        gap: "12px",
      });
      wrap.appendChild(createSpinner());

      const text = el("p", {
        color: TEXT_MUTED,
        fontSize: "12px",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        margin: "0",
        textAlign: "center",
      });
      text.textContent = message;
      wrap.appendChild(text);

      contentArea.appendChild(wrap);
    }

    // ─── Show error in content area ───
    function showError(contentArea: HTMLElement, message: string) {
      contentArea.innerHTML = "";
      const wrap = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: "8px",
        color: "#ef4444",
        fontSize: "12px",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      });
      wrap.innerHTML = `${ICONS.xCircle} <span>${message}</span>`;
      contentArea.appendChild(wrap);
    }

    // ─── Trust Score Gauge ───
    function createTrustGauge(
      score: number,
      verdict: string,
    ): HTMLElement {
      const wrap = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        background: DARK_SURFACE,
        borderRadius: "10px",
        border: `1px solid ${DARK_BORDER}`,
        marginBottom: "12px",
      });

      // Circular gauge
      const size = 64;
      const strokeWidth = 5;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const progress = (score / 100) * circumference;

      let color = "#ef4444"; // red
      if (score >= 70) color = "#22c55e"; // green
      else if (score >= 40) color = "#f59e0b"; // amber

      const gaugeWrap = el("div", {
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: "0",
      });
      gaugeWrap.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${DARK_BORDER}" stroke-width="${strokeWidth}"/>
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - progress}" style="transition: stroke-dashoffset 0.6s ease;"/>
        </svg>
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: ${color}; font-family: 'Inter', system-ui, sans-serif;">
          ${score}
        </div>
      `;

      const textWrap = el("div", { flex: "1", minWidth: "0" });
      const verdictEl = el("div", {
        fontSize: "14px",
        fontWeight: "700",
        color: color,
        marginBottom: "4px",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      });
      verdictEl.textContent = verdict;

      const subtitle = el("div", {
        fontSize: "11px",
        color: TEXT_MUTED,
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      });
      subtitle.textContent = `Trust Score: ${score}/100`;

      textWrap.appendChild(verdictEl);
      textWrap.appendChild(subtitle);

      wrap.appendChild(gaugeWrap);
      wrap.appendChild(textWrap);
      return wrap;
    }

    // ─── Highlight Chips ───
    function createHighlights(highlights: string[]): HTMLElement {
      const wrap = el("div", {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginBottom: "12px",
      });

      const label = el("p", {
        fontSize: "10px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: TEXT_MUTED,
        margin: "0 0 4px 0",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      });
      label.textContent = "Key Signals";
      wrap.appendChild(label);

      for (const h of highlights) {
        const chip = el("div", {
          display: "flex",
          alignItems: "flex-start",
          gap: "6px",
          padding: "6px 10px",
          background: `${BRAND_ACCENT}0d`,
          border: `1px solid ${BRAND_ACCENT}22`,
          borderRadius: "6px",
          fontSize: "11px",
          color: TEXT_PRIMARY,
          lineHeight: "1.4",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        });
        chip.innerHTML = `<span style="color:${BRAND_ACCENT_HOVER};flex-shrink:0;margin-top:1px;">•</span> ${h}`;
        wrap.appendChild(chip);
      }

      return wrap;
    }

    // ─── Evidence details ───
    function createEvidenceDetails(
      evidence: Record<string, unknown>,
    ): HTMLElement {
      const wrap = el("div", {
        marginTop: "8px",
      });

      const toggle = el("button", {
        all: "unset",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: "600",
        color: TEXT_MUTED,
        cursor: "pointer",
        padding: "4px 0",
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        transition: "color 0.15s",
      });
      toggle.textContent = "▸ Show Details";
      toggle.addEventListener("mouseenter", () => {
        toggle.style.color = TEXT_PRIMARY;
      });
      toggle.addEventListener("mouseleave", () => {
        toggle.style.color = TEXT_MUTED;
      });

      const details = el("div", {
        display: "none",
        marginTop: "8px",
        padding: "10px",
        background: DARK_SURFACE,
        border: `1px solid ${DARK_BORDER}`,
        borderRadius: "8px",
        fontSize: "11px",
        color: TEXT_MUTED,
        fontFamily: '"Inter", monospace',
        lineHeight: "1.7",
        maxHeight: "150px",
        overflowY: "auto",
      });

      // Show relevant evidence fields
      const skipKeys = [
        "model_used",
        "ensemble_mode",
        "transformer_weight",
        "stylometry_weight",
      ];
      for (const [key, val] of Object.entries(evidence)) {
        if (skipKeys.includes(key)) continue;
        const row = el("div", {
          display: "flex",
          justifyContent: "space-between",
          padding: "2px 0",
          borderBottom: `1px solid ${DARK_BORDER}44`,
        });
        const keyEl = el("span", { color: TEXT_MUTED });
        keyEl.textContent = key.replace(/_/g, " ");
        const valEl = el("span", {
          color: TEXT_PRIMARY,
          fontWeight: "500",
        });
        valEl.textContent = String(val);
        row.appendChild(keyEl);
        row.appendChild(valEl);
        details.appendChild(row);
      }

      let isOpen = false;
      toggle.addEventListener("click", () => {
        isOpen = !isOpen;
        details.style.display = isOpen ? "block" : "none";
        toggle.textContent = isOpen ? "▾ Hide Details" : "▸ Show Details";
      });

      wrap.appendChild(toggle);
      wrap.appendChild(details);
      return wrap;
    }

    // ─── Handle Text Analysis ───
    async function handleTextAnalysis(text: string, rect: DOMRect) {
      const boxId = `analysis_${Date.now()}`;
      const { contentArea } = createResultBox(rect, boxId);

      showLoading(contentArea, "Analyzing text for AI-generated content…");

      const response: any = await chrome.runtime
        .sendMessage({
          action: "ANALYZE_TEXT",
          payload: { text },
        })
        .catch((e: Error) => ({ error: e.message }));

      if (response?.error) {
        showError(contentArea, response.error);
        return;
      }

      if (!response?.data) {
        showError(contentArea, "No results received from backend.");
        return;
      }

      const data = response.data;
      contentArea.innerHTML = "";

      // Trust score gauge
      contentArea.appendChild(
        createTrustGauge(data.trust_score, data.verdict),
      );

      // Highlights
      if (data.highlights && data.highlights.length > 0) {
        contentArea.appendChild(createHighlights(data.highlights));
      }

      // Evidence details
      if (data.evidence && Object.keys(data.evidence).length > 0) {
        contentArea.appendChild(
          createEvidenceDetails(data.evidence),
        );
      }
    }

    // ─── Fact Check: Rating badge ───
    function getRatingBadge(rating: string): {
      color: string;
      bg: string;
      border: string;
      icon: string;
    } {
      const r = rating.toLowerCase();
      if (
        ["true", "accurate", "correct"].some((k) => r.includes(k))
      ) {
        return {
          color: "#22c55e",
          bg: "rgba(34,197,94,0.1)",
          border: "rgba(34,197,94,0.2)",
          icon: ICONS.checkCircle,
        };
      }
      if (
        ["false", "fake", "incorrect"].some((k) => r.includes(k))
      ) {
        return {
          color: "#ef4444",
          bg: "rgba(239,68,68,0.1)",
          border: "rgba(239,68,68,0.2)",
          icon: ICONS.xCircle,
        };
      }
      if (
        ["misleading", "partially true", "mixture", "half true"].some((k) =>
          r.includes(k),
        )
      ) {
        return {
          color: "#3b82f6",
          bg: "rgba(59,130,246,0.1)",
          border: "rgba(59,130,246,0.2)",
          icon: ICONS.alertTriangle,
        };
      }
      // Default / unverified
      return {
        color: TEXT_MUTED,
        bg: "rgba(136,136,168,0.1)",
        border: "rgba(136,136,168,0.2)",
        icon: ICONS.helpCircle,
      };
    }

    // ─── Handle Fact Check ───
    async function handleFactCheck(text: string, rect: DOMRect) {
      const boxId = `factcheck_${Date.now()}`;
      const { contentArea } = createResultBox(rect, boxId);

      showLoading(
        contentArea,
        "Evaluating claim and searching fact-check databases…",
      );

      const response: any = await chrome.runtime
        .sendMessage({
          action: "FACT_CHECK",
          payload: { query: text },
        })
        .catch((e: Error) => ({ error: e.message }));

      if (response?.error) {
        showError(contentArea, response.error);
        return;
      }

      if (!response?.data) {
        showError(contentArea, "No results received from backend.");
        return;
      }

      const { db, live } = response.data;
      contentArea.innerHTML = "";

      // ─── AI Verdict Section ───
      if (live && live.available) {
        const badge = getRatingBadge(live.rating || "UNVERIFIED");

        const verdictSection = el("div", {
          marginBottom: "16px",
        });

        // Section header
        const sectionHeader = el("p", {
          fontSize: "10px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: TEXT_MUTED,
          margin: "0 0 8px 0",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        });
        sectionHeader.textContent = "AI Verdict";
        verdictSection.appendChild(sectionHeader);

        const card = el("div", {
          padding: "14px",
          background: DARK_SURFACE,
          border: `1px solid ${DARK_BORDER}`,
          borderRadius: "10px",
        });

        // Rating badge
        const badgeEl = el("div", {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "6px",
          border: `1px solid ${badge.border}`,
          background: badge.bg,
          color: badge.color,
          fontSize: "12px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          marginBottom: "10px",
        });
        badgeEl.innerHTML = `${badge.icon} ${live.rating}`;
        card.appendChild(badgeEl);

        // Confidence
        if (live.confidence) {
          const confEl = el("div", {
            fontSize: "10px",
            color: TEXT_MUTED,
            marginBottom: "10px",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          confEl.textContent = `Confidence: ${live.confidence}`;
          card.appendChild(confEl);
        }

        // Short answer
        if (live.short_answer) {
          const answerEl = el("p", {
            fontSize: "14px",
            fontWeight: "600",
            color: TEXT_PRIMARY,
            margin: "0 0 8px 0",
            lineHeight: "1.5",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          answerEl.textContent = live.short_answer;
          card.appendChild(answerEl);
        }

        // Reasoning
        if (live.reasoning) {
          const reasoningEl = el("p", {
            fontSize: "12px",
            color: TEXT_MUTED,
            margin: "0 0 12px 0",
            lineHeight: "1.6",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          reasoningEl.textContent = live.reasoning;
          card.appendChild(reasoningEl);
        }

        // Sources
        if (live.sources && live.sources.length > 0) {
          const sourcesLabel = el("p", {
            fontSize: "10px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: TEXT_MUTED,
            margin: "0 0 6px 0",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          sourcesLabel.textContent = "Sources Consulted";
          card.appendChild(sourcesLabel);

          const sourcesWrap = el("div", {
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          });

          for (const source of live.sources) {
            const chip = el("a", {
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              background: DARK_BG,
              border: `1px solid ${DARK_BORDER}`,
              borderRadius: "5px",
              fontSize: "10px",
              color: TEXT_MUTED,
              textDecoration: "none",
              transition: "all 0.15s",
              fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
              cursor: "pointer",
            });
            chip.setAttribute("href", source.url);
            chip.setAttribute("target", "_blank");
            chip.setAttribute("rel", "noopener noreferrer");
            const title =
              source.title.length > 30
                ? source.title.substring(0, 30) + "…"
                : source.title;
            chip.innerHTML = `${title} ${ICONS.externalLink}`;

            chip.addEventListener("mouseenter", () => {
              chip.style.color = TEXT_PRIMARY;
              chip.style.borderColor = `${BRAND_ACCENT}44`;
            });
            chip.addEventListener("mouseleave", () => {
              chip.style.color = TEXT_MUTED;
              chip.style.borderColor = DARK_BORDER;
            });

            sourcesWrap.appendChild(chip);
          }

          card.appendChild(sourcesWrap);
        }

        verdictSection.appendChild(card);
        contentArea.appendChild(verdictSection);
      } else {
        // AI unavailable
        const unavailable = el("div", {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px",
          background: DARK_SURFACE,
          border: `1px solid ${DARK_BORDER}`,
          borderRadius: "8px",
          color: TEXT_MUTED,
          fontSize: "12px",
          marginBottom: "16px",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        });
        unavailable.innerHTML = `${ICONS.helpCircle} <span>AI evaluation is currently unavailable.</span>`;
        contentArea.appendChild(unavailable);
      }

      // ─── Related Claims Section (Only visible if claims are found) ───
      if (db && db.claims_found > 0 && db.top_reviews) {
        // ─── Divider ───
        const dividerWrap = el("div", {
          position: "relative",
          margin: "16px 0",
        });
        const dividerLine = el("div", {
          position: "absolute",
          inset: "0",
          display: "flex",
          alignItems: "center",
        });
        dividerLine.innerHTML = `<div style="width: 100%; border-top: 1px solid ${DARK_BORDER}"></div>`;
        const dividerLabel = el("span", {
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: DARK_BG,
          padding: "0 10px",
          fontSize: "9px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: TEXT_MUTED,
          whiteSpace: "nowrap",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        });
        dividerLabel.textContent = "Related claims from fact-check databases";
        dividerWrap.appendChild(dividerLine);
        dividerWrap.appendChild(dividerLabel);
        contentArea.appendChild(dividerWrap);

        for (const review of db.top_reviews) {
          const badge = getRatingBadge(review.rating || "Unknown");
          const reviewCard = el("div", {
            padding: "12px",
            background: DARK_SURFACE,
            border: `1px solid ${DARK_BORDER}`,
            borderRadius: "8px",
            marginBottom: "8px",
            transition: "border-color 0.15s",
          });
          reviewCard.addEventListener("mouseenter", () => {
            reviewCard.style.borderColor = `${BRAND_ACCENT}33`;
          });
          reviewCard.addEventListener("mouseleave", () => {
            reviewCard.style.borderColor = DARK_BORDER;
          });

          // Context note
          const contextNote = el("div", {
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 6px",
            background: DARK_BG,
            border: `1px solid ${DARK_BORDER}`,
            borderRadius: "4px",
            fontSize: "9px",
            textTransform: "uppercase",
            fontWeight: "600",
            color: TEXT_MUTED,
            marginBottom: "8px",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          contextNote.textContent =
            "⚠ Related claim — not a direct verdict";
          reviewCard.appendChild(contextNote);

          // Claim text
          const claimText = el("p", {
            fontSize: "12px",
            color: TEXT_PRIMARY,
            fontStyle: "italic",
            borderLeft: `2px solid ${DARK_BORDER}`,
            paddingLeft: "10px",
            margin: "0 0 8px 0",
            lineHeight: "1.5",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          claimText.textContent = `"${review.text || "Unknown claim text"}"`;
          reviewCard.appendChild(claimText);

          // Meta info
          const meta = el("div", {
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "10px",
            color: TEXT_MUTED,
            marginBottom: "8px",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          if (review.claimant) {
            const claimant = el("span", {});
            claimant.innerHTML = `Claimed by <strong style="color:${TEXT_PRIMARY}">${review.claimant}</strong>`;
            meta.appendChild(claimant);
          }
          if (review.publisher) {
            const publisher = el("span", {});
            publisher.innerHTML = `• Checked by <strong style="color:${TEXT_PRIMARY}">${review.publisher}</strong>`;
            meta.appendChild(publisher);
          }
          reviewCard.appendChild(meta);

          // Rating badge and source link row
          const bottomRow = el("div", {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          });

          const ratingBadge = el("span", {
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "4px",
            border: `1px solid ${badge.border}`,
            background: badge.bg,
            color: badge.color,
            fontSize: "10px",
            fontWeight: "700",
            textTransform: "uppercase",
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          });
          ratingBadge.innerHTML = `${badge.icon} ${review.rating}`;
          bottomRow.appendChild(ratingBadge);

          if (review.url) {
            const link = el("a", {
              fontSize: "10px",
              fontWeight: "600",
              color: TEXT_MUTED,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              transition: "color 0.15s",
              fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
              cursor: "pointer",
            });
            link.setAttribute("href", review.url);
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener noreferrer");
            link.innerHTML = `Source ${ICONS.externalLink}`;
            link.addEventListener("mouseenter", () => {
              link.style.color = TEXT_PRIMARY;
            });
            link.addEventListener("mouseleave", () => {
              link.style.color = TEXT_MUTED;
            });
            bottomRow.appendChild(link);
          }

          reviewCard.appendChild(bottomRow);
          contentArea.appendChild(reviewCard);
        }
      }
    }

    // ─── Selection listener ───
    document.addEventListener("mouseup", (e) => {
      // Small delay to let selection finalize
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          removeFloatingToolbar();
          return;
        }

        const text = selection.toString().trim();
        if (text.length < MIN_SELECTION_LENGTH) {
          removeFloatingToolbar();
          return;
        }

        // Don't show toolbar if click was inside our own UI
        const target = e.target as HTMLElement;
        if (
          target.closest("[data-truelens]") ||
          target.closest('[style*="2147483"]')
        ) {
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        showFloatingToolbar(rect, text);
      }, 10);
    });

    // ─── Listen for image injection from background script ───
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "INJECT_IMAGE" && message.payload?.imageData) {
        // Forward image data to the webpage via postMessage
        window.postMessage(
          {
            type: "TRUELENS_IMAGE",
            imageData: message.payload.imageData,
          },
          "*",
        );
      }
    });

    // Dismiss toolbar on click elsewhere (but not on the toolbar itself)
    document.addEventListener("mousedown", (e) => {
      if (floatingToolbar && !floatingToolbar.contains(e.target as Node)) {
        // Don't immediately remove — let mouseup handler decide
      }
    });

    // Dismiss on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        removeFloatingToolbar();
      }
    });
  },
});
