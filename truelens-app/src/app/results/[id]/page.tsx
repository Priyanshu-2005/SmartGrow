"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Share2, Download, Clock, Globe, FileText,
  ExternalLink, RotateCcw, Copy, Check
} from "lucide-react";
import TrustScoreGauge from "@/components/TrustScoreGauge";
import SignalCard from "@/components/SignalCard";
import ScanLoader from "@/components/ScanLoader";
import { Scan } from "@/lib/types";
import { formatDate, truncateText } from "@/lib/utils";

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchScan();
  }, [id]);

  const fetchScan = async () => {
    try {
      const res = await fetch(`/api/v1/scans/${id}`);
      const data = await res.json();
      if (data.scan) {
        setScan(data.scan);
      }
    } catch (err) {
      console.error("Error fetching scan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <ScanLoader />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center glass-card p-12 max-w-md">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Scan Not Found</h2>
          <p className="text-text-muted mb-6">
            The scan result you&apos;re looking for doesn&apos;t exist or has expired.
          </p>
          <button onClick={() => router.push("/scan")} className="btn-primary">
            <span>New Scan</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-secondary !py-2 !px-3 text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Share"}</span>
            </button>
            <button
              onClick={() => router.push("/scan")}
              className="btn-secondary !py-2 !px-3 text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Scan</span>
            </button>
          </div>
        </motion.div>

        {/* Scan Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              {scan.contentType === "url" ? (
                <Globe className="w-5 h-5 text-text-primary" />
              ) : (
                <FileText className="w-5 h-5 text-text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                {scan.contentType === "url" ? "Analyzed URL" : "Analyzed Text"}
              </p>
              {scan.url ? (
                <a
                  href={scan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-text-primary transition-colors text-sm flex items-center gap-1 break-all"
                >
                  {scan.url}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ) : (
                <p className="text-sm text-text-secondary break-words">
                  {truncateText(scan.text || scan.rawText || "", 200)}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(scan.createdAt)}
                </span>
                {scan.scanDuration && (
                  <span>Analysis took {scan.scanDuration.toFixed(1)}s</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 mb-6 flex flex-col items-center"
        >
          <TrustScoreGauge score={scan.trustScore} size={220} />
        </motion.div>

        {/* Signal Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-text-primary" />
            Signal Breakdown
          </h2>
          <div className="space-y-3">
            {scan.signals.map((signal, index) => (
              <SignalCard key={signal.id} signal={signal} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Scan ID */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-text-muted">
            Scan ID: <span className="font-mono text-text-secondary">{scan.id}</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
