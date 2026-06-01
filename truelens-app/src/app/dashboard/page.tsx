"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3, Shield, AlertTriangle, CheckCircle, TrendingUp,
  Clock, ExternalLink, Globe, FileText, Scan, ArrowRight
} from "lucide-react";
import { Scan as ScanType } from "@/lib/types";
import { formatDate, getScoreColor, getScoreLabel, getScoreBadgeClass } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanType[]>([]);
  const [stats, setStats] = useState({ totalScans: 0, avgScore: 0, flaggedCount: 0, authenticCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/v1/scans");
      const data = await res.json();
      setScans(data.scans || []);
      setStats(data.stats || { totalScans: 0, avgScore: 0, flaggedCount: 0, authenticCount: 0 });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: BarChart3,
      value: stats.totalScans,
      label: "Total Scans",
      color: "#8B5CF6",
    },
    {
      icon: TrendingUp,
      value: stats.avgScore,
      label: "Avg Trust Score",
      color: getScoreColor(stats.avgScore),
    },
    {
      icon: CheckCircle,
      value: stats.authenticCount,
      label: "Authentic",
      color: "#10B981",
    },
    {
      icon: AlertTriangle,
      value: stats.flaggedCount,
      label: "Flagged",
      color: "#EF4444",
    },
  ];

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-text-muted text-sm mt-1">Overview of your scan activity</p>
          </div>
          <button
            onClick={() => router.push("/scan")}
            className="btn-primary text-sm"
          >
            <Scan className="w-4 h-4 relative z-10" />
            <span>New Scan</span>
          </button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.color}15` }}
                >
                  <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Scan History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-text-primary" />
            Scan History
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 shimmer h-20 rounded-xl" />
              ))}
            </div>
          ) : scans.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Shield className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Scans Yet</h3>
              <p className="text-text-muted text-sm mb-6">
                Start scanning content to see your history here.
              </p>
              <button onClick={() => router.push("/scan")} className="btn-primary">
                <Scan className="w-4 h-4 relative z-10" />
                <span>Start Your First Scan</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan, i) => (
                <motion.button
                  key={scan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  onClick={() => router.push(`/results/${scan.id}`)}
                  className="glass-card glass-card-hover p-5 w-full text-left flex items-center gap-4 group"
                >
                  {/* Score */}
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${getScoreColor(scan.trustScore)}10`,
                      border: `1px solid ${getScoreColor(scan.trustScore)}25`,
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: getScoreColor(scan.trustScore) }}>
                      {scan.trustScore}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {scan.contentType === "url" ? (
                        <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      )}
                      <p className="text-sm font-medium text-text-primary truncate">
                        {scan.url || (scan.text ? scan.text.substring(0, 60) + "..." : "Text Analysis")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(scan.createdAt)}
                      </span>
                      <span>{scan.signals.length} signals</span>
                    </div>
                  </div>

                  {/* Verdict Badge */}
                  <span className={`badge ${getScoreBadgeClass(scan.trustScore)} shrink-0 hidden sm:inline-flex`}>
                    {getScoreLabel(scan.trustScore)}
                  </span>

                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
