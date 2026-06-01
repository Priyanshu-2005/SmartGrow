"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertCircle, CheckCircle, XCircle, ShieldQuestion, Globe, Bot, ExternalLink, Info, HelpCircle, AlertTriangle } from "lucide-react";
import ScanLoader from "@/components/ScanLoader";

interface FactCheckResult {
  text?: string;
  claimant?: string;
  claim_date?: string;
  publisher?: string;
  rating?: string;
  url?: string;
}

interface FactCheckResponse {
  available: boolean;
  claims_found: number;
  top_reviews?: FactCheckResult[];
  error?: string;
}

interface LiveFactCheckResponse {
  available: boolean;
  rating?: string;
  short_answer?: string;
  reasoning?: string;
  confidence?: string;
  sources?: { title: string; snippet: string; url: string }[];
  error?: string;
}

export default function FactCheckPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [dbResults, setDbResults] = useState<FactCheckResponse | null>(null);
  const [liveResult, setLiveResult] = useState<LiveFactCheckResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 3) {
      setError("Please enter a longer query to fact-check.");
      return;
    }

    setError("");
    setLoading(true);
    setDbResults(null);
    setLiveResult(null);
    setHasSearched(true);

    try {
      // Run both fact checks simultaneously
      const [dbRes, liveRes] = await Promise.allSettled([
        fetch(`/api/v1/fact-check?query=${encodeURIComponent(query)}`).then(r => {
          if (!r.ok) throw new Error("Database search failed");
          return r.json();
        }),
        fetch(`/api/v1/fact-check/live?query=${encodeURIComponent(query)}`).then(r => {
          if (!r.ok) throw new Error("Live AI search failed");
          return r.json();
        })
      ]);

      if (liveRes.status === "fulfilled" && !liveRes.value.error) {
        setLiveResult(liveRes.value);
      } else {
        // Fallback or error state for live result
        setLiveResult({
          available: false,
          error: "AI Evaluation unavailable at this time."
        });
      }

      if (dbRes.status === "fulfilled" && !dbRes.value.error) {
        setDbResults(dbRes.value);
      } else {
        // Fallback for DB result
        setDbResults({
          available: false,
          claims_found: 0,
          error: "Independent database search unavailable."
        });
      }

    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Standardized badge colors for all verdicts
  const getBadgeStyling = (rating: string) => {
    const r = rating.toLowerCase();
    if (["true", "accurate", "correct"].some(k => r.includes(k))) {
      return { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20", icon: <CheckCircle className="w-4 h-4 shrink-0" /> };
    }
    if (["false", "fake", "incorrect"].some(k => r.includes(k))) {
      return { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20", icon: <XCircle className="w-4 h-4 shrink-0" /> };
    }
    if (["misleading", "partially true", "mixture", "half true"].some(k => r.includes(k))) {
      return { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", icon: <AlertTriangle className="w-4 h-4 shrink-0" /> };
    }
    // Unverified / Default
    return { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20", icon: <HelpCircle className="w-4 h-4 shrink-0" /> };
  };

  const isOldClaim = (dateStr?: string) => {
    if (!dateStr) return false;
    const claimDate = new Date(dateStr);
    const now = new Date();
    // If claim is older than 2 years from today, flag it
    const diffTime = Math.abs(now.getTime() - claimDate.getTime());
    const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365)); 
    return diffYears > 2;
  };

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 bg-background-dark text-text-primary">
      <div className="max-w-4xl mx-auto">
        
        {/* Header & Search */}
        <div className="mb-10 text-center">
          <div className="w-12 h-12 bg-surface-dark border border-border-color rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldQuestion className="w-6 h-6 text-text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Fact Check Portal</h1>
          <p className="text-text-muted mb-8">Enter a claim to get an instant AI verdict and view related historical fact-checks.</p>
          
          <div className="relative flex items-center max-w-2xl mx-auto shadow-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted z-10 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Did Rishi Kapoor die?"
              className="w-full bg-surface-dark border border-border-color text-text-primary rounded-lg pl-12 pr-28 py-4 focus:outline-none focus:border-text-primary transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 bg-text-primary text-black font-medium py-2 px-5 rounded-md hover:bg-text-secondary disabled:opacity-50 transition-colors"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500 text-sm max-w-2xl mx-auto"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ScanLoader />
            <p className="text-text-muted mt-4 text-sm">Evaluating claim and scanning databases...</p>
          </div>
        )}

        {/* Results Area */}
        <AnimatePresence>
          {hasSearched && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* AI Verdict Section (Primary) */}
              <section>
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-4">AI Verdict</h2>
                
                {liveResult && liveResult.available ? (
                  <div className="bg-surface-dark border border-border-color rounded-xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      
                      {/* Badge Column */}
                      <div className="shrink-0 w-full md:w-auto">
                        {(() => {
                          const badge = getBadgeStyling(liveResult.rating || "UNVERIFIED");
                          return (
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-bold tracking-wide uppercase text-sm ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.icon}
                              {liveResult.rating}
                            </div>
                          );
                        })()}
                        
                        {liveResult.confidence && (
                          <div className="mt-3 text-xs text-text-muted flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            Confidence: <span className="font-semibold text-text-secondary">{liveResult.confidence}</span>
                          </div>
                        )}
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-text-primary mb-3 leading-snug">
                          {liveResult.short_answer}
                        </h3>
                        <p className="text-text-secondary text-sm leading-relaxed mb-6">
                          {liveResult.reasoning}
                        </p>

                        {/* Sources Chips */}
                        {liveResult.sources && liveResult.sources.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-text-muted uppercase mb-2">Sources Consulted</p>
                            <div className="flex flex-wrap gap-2">
                              {liveResult.sources.map((source, idx) => (
                                <a 
                                  key={idx}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background-dark border border-border-color rounded-md text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
                                >
                                  {source.title.length > 35 ? source.title.substring(0, 35) + "..." : source.title}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-dark border border-border-color rounded-xl p-6 flex items-center justify-center text-text-muted text-sm">
                    <Bot className="w-5 h-5 mr-2" />
                    AI evaluation is currently unavailable.
                  </div>
                )}
              </section>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border-color"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background-dark px-4 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Related claims found in fact-check databases
                  </span>
                </div>
              </div>

              {/* Related Claims Section */}
              <section>
                {dbResults && dbResults.claims_found > 0 ? (
                  <div className="space-y-4">
                    {dbResults.top_reviews?.map((review, idx) => {
                      const badge = getBadgeStyling(review.rating || "Unknown");
                      const oldClaim = isOldClaim(review.claim_date);
                      
                      return (
                        <div key={idx} className="bg-surface-dark border border-border-color rounded-lg p-5 hover:border-white/10 transition-colors">
                          <div className="flex flex-col md:flex-row gap-5 items-start">
                            
                            <div className="flex-1 min-w-0">
                              {/* Contextual Note */}
                              <div className="inline-flex items-center gap-1.5 bg-background-dark px-2 py-1 rounded text-[10px] uppercase font-semibold text-text-muted mb-3 border border-border-color">
                                <AlertCircle className="w-3 h-3" />
                                Related claim — not a direct verdict on your query
                              </div>

                              <p className="text-text-primary font-medium italic border-l-2 border-border-color pl-3 py-0.5 mb-3">
                                "{review.text || "Unknown claim text"}"
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
                                <span>
                                  Claimed by <strong className="text-text-secondary">{review.claimant || "Unknown"}</strong>
                                </span>
                                {review.claim_date && (
                                  <span>• {new Date(review.claim_date).toLocaleDateString()}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  • <Globe className="w-3.5 h-3.5" /> Fact-checked by <strong className="text-text-secondary">{review.publisher}</strong>
                                </span>
                              </div>

                              {oldClaim && (
                                <div className="mt-3 text-xs text-warning flex items-center gap-1.5 bg-warning/10 inline-flex px-2 py-1 rounded-md border border-warning/20">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  This claim predates the event — may be a resurface of older content.
                                </div>
                              )}
                            </div>

                            {/* Badge and Link */}
                            <div className="shrink-0 flex flex-col items-start md:items-end w-full md:w-40 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-border-color md:pl-5">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border font-bold uppercase text-[11px] mb-3 ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.icon}
                                {review.rating}
                              </div>
                              {review.url && (
                                <a
                                  href={review.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                                >
                                  Source Link <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                    
                    <p className="text-center text-xs text-text-muted mt-6 max-w-xl mx-auto">
                      These claims are sourced from third-party fact-check databases (e.g. Google Fact Check Tools) and reflect verdicts by their respective independent journalistic organizations.
                    </p>
                  </div>
                ) : (
                  <div className="bg-surface-dark border border-border-color rounded-xl p-8 text-center shadow-sm">
                    <ShieldQuestion className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
                    <h3 className="text-base font-semibold text-text-secondary mb-1">No Related Claims Found</h3>
                    <p className="text-text-muted text-sm max-w-md mx-auto">
                      We couldn't find any historical claims in our independent databases that match your query. The AI Verdict above is your best source of truth.
                    </p>
                  </div>
                )}
              </section>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
