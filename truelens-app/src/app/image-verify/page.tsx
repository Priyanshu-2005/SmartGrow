"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImageIcon, Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import TrustScoreGauge from "@/components/TrustScoreGauge";
import SignalCard from "@/components/SignalCard";

export default function ImageVerifyPage() {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleUpload = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/image-verify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        alert(data.error || data.detail || "Verification failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Network error during upload. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, []);

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <ImageIcon className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Image Deepfake Detection</h1>
          <p className="text-text-muted text-sm mt-2 max-w-xl mx-auto">
            Upload an image to detect AI generation, manipulation, and GAN fingerprints using our advanced SigLIP model.
          </p>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`glass-card p-10 mb-10 text-center cursor-pointer transition-all duration-300 ${dragActive ? "border-white/20 shadow-lg shadow-white/5" : ""
            }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".png,.jpg,.jpeg,.webp";
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) handleUpload(target.files);
            };
            input.click();
          }}
        >
          {loading ? (
            <div className="py-10">
              <Loader2 className="w-12 h-12 text-text-primary mx-auto mb-4 animate-spin" />
              <p className="text-text-primary font-medium text-lg">Analyzing image...</p>
              <p className="text-text-muted text-sm mt-2">Running deep learning models and forensic analysis</p>
            </div>
          ) : (
            <div className="py-10">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{
                  background: dragActive ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `2px dashed ${dragActive ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)"}`,
                }}>
                <Upload className={`w-8 h-8 ${dragActive ? "text-text-primary" : "text-text-secondary"}`} />
              </div>
              <p className="text-text-primary font-medium text-lg mb-2">
                {dragActive ? "Drop your image here" : "Drag & drop or click to upload"}
              </p>
              <p className="text-text-muted text-sm">
                Supports PNG, JPG, JPEG, WEBP — Max 10MB
              </p>
            </div>
          )}
        </motion.div>

        {/* Result Area */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="glass-card p-8 mb-8 text-center">
                <div className="flex flex-col items-center justify-center mb-6">
                  {result.verdict === "Authentic" ? (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 pulse-glow"
                      style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                      <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                  ) : result.verdict === "AI-Generated / Deepfake" ? (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 pulse-glow"
                      style={{ background: "rgba(239, 68, 68, 0.1)" }}>
                      <XCircle className="w-8 h-8 text-danger" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                      <AlertTriangle className="w-8 h-8 text-warning" />
                    </div>
                  )}
                  <h2 className={`text-2xl font-bold ${result.verdict === "Authentic" ? "text-success" :
                      result.verdict === "AI-Generated / Deepfake" ? "text-danger" : "text-warning"
                    }`}>
                    {result.verdict}
                  </h2>
                </div>

                <div className="flex justify-center mb-10">
                  <TrustScoreGauge score={result.trust_score} />
                </div>

                <h3 className="text-lg font-semibold text-text-primary mb-6 text-left border-b border-border-color pb-2">
                  Forensic Signals
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {result.signals.map((signal: any, idx: number) => (
                    <SignalCard key={idx} index={idx} signal={signal} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
