"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck, Upload, File, Shield, AlertTriangle, CheckCircle,
  Clock, Hash, Download, Eye, X, FileText, Loader2
} from "lucide-react";
import { Document } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/v1/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log(`[Upload] Sending file: name="${file.name}", type="${file.type}", size=${file.size}`);

      const res = await fetch("/api/v1/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log(`[Upload] Response status=${res.status}:`, data);

      if (data.success) {
        setDocuments((prev) => [data.document, ...prev]);
        setSelectedDoc(data.document);
      } else {
        console.error("[Upload] Upload failed:", data.error || "Unknown error");
        alert(data.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Network error during upload. Please try again.");
    } finally {
      setUploading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <span className="badge badge-success"><CheckCircle className="w-3 h-3 inline mr-1" />Verified</span>;
      case "flagged":
        return <span className="badge badge-danger"><AlertTriangle className="w-3 h-3 inline mr-1" />Flagged</span>;
      default:
        return <span className="badge badge-warning"><Clock className="w-3 h-3 inline mr-1" />Pending</span>;
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Document Verification</h1>
          <p className="text-text-muted text-sm mt-1">
            Upload documents for tamper detection and cryptographic signing
          </p>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`glass-card p-8 mb-8 text-center cursor-pointer transition-all duration-300 ${
            dragActive ? "border-white/20 shadow-lg shadow-white/5" : ""
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.png,.jpg,.jpeg,.docx";
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) handleUpload(target.files);
            };
            input.click();
          }}
        >
          {uploading ? (
            <div className="py-8">
              <Loader2 className="w-10 h-10 text-text-primary mx-auto mb-4 animate-spin" />
              <p className="text-text-primary font-medium">Analyzing document...</p>
              <p className="text-text-muted text-sm mt-1">Running tamper detection and integrity checks</p>
            </div>
          ) : (
            <div className="py-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: dragActive ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `2px dashed ${dragActive ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)"}`,
                }}>
                <Upload className={`w-7 h-7 ${dragActive ? "text-text-primary" : "text-text-secondary"}`} />
              </div>
              <p className="text-text-primary font-medium mb-1">
                {dragActive ? "Drop your file here" : "Drag & drop or click to upload"}
              </p>
              <p className="text-text-muted text-sm">
                Supports PDF, PNG, JPG, DOCX — Max 25MB
              </p>
            </div>
          )}
        </motion.div>

        {/* Documents List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-text-primary" />
            Your Documents
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-5 shimmer h-20 rounded-xl" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FileCheck className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Documents</h3>
              <p className="text-text-muted text-sm">
                Upload a document above to begin verification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, i) => (
                <motion.button
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedDoc(doc)}
                  className="glass-card glass-card-hover p-5 w-full text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                    <FileText className="w-6 h-6 text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{doc.filename}</p>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(doc.status)}
                  </div>
                  {doc.trustScore !== undefined && (
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold" style={{ color: doc.trustScore >= 70 ? "#10B981" : doc.trustScore >= 40 ? "#F59E0B" : "#EF4444" }}>
                        {doc.trustScore}
                      </p>
                      <p className="text-[10px] text-text-muted">Score</p>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Document Detail Modal */}
        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
              onClick={() => setSelectedDoc(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{selectedDoc.filename}</h3>
                    <p className="text-xs text-text-muted mt-1">
                      Uploaded {formatDate(selectedDoc.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score & Status */}
                <div className="flex items-center gap-4 mb-6">
                  {selectedDoc.trustScore !== undefined && (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${selectedDoc.trustScore >= 70 ? "#10B981" : selectedDoc.trustScore >= 40 ? "#F59E0B" : "#EF4444"}15`,
                      }}>
                      <span className="text-2xl font-bold"
                        style={{ color: selectedDoc.trustScore >= 70 ? "#10B981" : selectedDoc.trustScore >= 40 ? "#F59E0B" : "#EF4444" }}>
                        {selectedDoc.trustScore}
                      </span>
                    </div>
                  )}
                  <div>
                    {getStatusBadge(selectedDoc.status)}
                    <p className="text-xs text-text-muted mt-2">
                      {(selectedDoc.fileSize / 1024).toFixed(1)} KB • {selectedDoc.fileType}
                    </p>
                  </div>
                </div>

                {/* Hash */}
                <div className="p-4 rounded-lg mb-6" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-xs text-text-muted uppercase tracking-wider">SHA-256 Hash</span>
                  </div>
                  <p className="text-xs font-mono text-text-secondary break-all">{selectedDoc.hash}</p>
                </div>

                {/* Findings */}
                {selectedDoc.findings && selectedDoc.findings.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Analysis Findings</h4>
                    <div className="space-y-2">
                      {selectedDoc.findings.map((finding, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.02)" }}>
                          {finding.severity === "high" ? (
                            <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                          ) : finding.severity === "medium" ? (
                            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-text-secondary">{finding.type}</p>
                            <p className="text-xs text-text-muted mt-0.5">{finding.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signature */}
                {selectedDoc.signature && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-success" />
                      <span className="text-sm font-semibold text-success">TrueLens Verified</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      This document has been cryptographically signed by TrueLens.
                      Signature issued on {formatDate(selectedDoc.signature.timestamp)}.
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
