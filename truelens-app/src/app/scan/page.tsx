"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, FileText, Scan, AlertCircle, ArrowRight, Link2, Type } from "lucide-react";
import ScanLoader from "@/components/ScanLoader";

type TabType = "url" | "text";

export default function ScanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (activeTab === "url" && !url.trim()) {
      setError("Please enter a URL to analyze.");
      return;
    }
    if (activeTab === "text" && text.trim().length < 50) {
      setError("Please enter at least 50 characters for meaningful analysis.");
      return;
    }

    // Validate URL format
    if (activeTab === "url") {
      try {
        new URL(url);
      } catch {
        setError("Please enter a valid URL (e.g., https://example.com).");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: activeTab === "url" ? url : undefined,
          text: activeTab === "text" ? text : undefined,
          contentType: activeTab,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Analysis failed. Please try again.");
        setLoading(false);
        return;
      }

      router.push(`/results/${data.scan.id}`);
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <ScanLoader />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <Scan className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
            Analyze Content
          </h1>
          <p className="text-text-muted text-lg">
            Submit a URL or paste text to receive a comprehensive trust score
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-2 flex mb-6"
        >
          {[
            { id: "url" as TabType, label: "URL Analysis", icon: Link2 },
            { id: "text" as TabType, label: "Text Analysis", icon: Type },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white/10 text-text-primary border border-white/20"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mb-6"
        >
          <AnimatePresence mode="wait">
            {activeTab === "url" ? (
              <motion.div
                key="url"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="input-field !pl-12"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Enter any public URL — news articles, product pages, social media posts
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Text Content
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the text you want to analyze for AI-generated content..."
                  rows={8}
                  className="input-field resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-text-muted">
                    Minimum 50 characters required
                  </p>
                  <p className={`text-xs ${text.length >= 50 ? "text-success" : "text-text-muted"}`}>
                    {text.length} characters
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-xl"
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <AlertCircle className="w-5 h-5 text-danger shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleSubmit}
            className="btn-primary w-full justify-center text-base !py-4 group"
          >
            <Scan className="w-5 h-5 relative z-10" />
            <span>Analyze {activeTab === "url" ? "URL" : "Text"}</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Example suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-text-muted mb-3">Try these examples:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {activeTab === "url"
              ? [
                  "https://www.bbc.com/news",
                  "https://suspicious-site.xyz/deals",
                  "https://github.com/about",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setUrl(example)}
                    className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    {example}
                  </button>
                ))
              : [
                  "The implications of quantum computing on modern cryptography are profound. As quantum processors become more powerful, traditional encryption methods may become vulnerable. Researchers are actively developing post-quantum cryptographic algorithms to address these emerging challenges in cybersecurity.",
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setText(example)}
                    className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors text-left max-w-md"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    {example.substring(0, 80)}...
                  </button>
                ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
