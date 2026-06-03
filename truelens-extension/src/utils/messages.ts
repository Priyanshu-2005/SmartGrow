// ─── TrueLens Message Types ───

export type MessageAction =
  | "ANALYZE_TEXT"
  | "FACT_CHECK"
  | "PING";

export interface Message {
  action: MessageAction;
  payload?: unknown;
}

// ─── Text Analysis ───

export interface AnalyzeTextPayload {
  text: string;
}

export interface TextAnalysisResult {
  success: boolean;
  trust_score: number;    // 0-100, higher = more trustworthy
  ai_score: number;       // 0-100, higher = more likely AI
  confidence: number;
  verdict: string;        // "AI-Generated" | "Mixed Signals" | "Likely Human"
  label: string;
  highlights: string[];
  evidence: Record<string, unknown>;
}

// ─── Fact Check ───

export interface FactCheckPayload {
  query: string;
}

export interface FactCheckClaim {
  text?: string;
  claimant?: string;
  claim_date?: string;
  publisher?: string;
  rating?: string;
  url?: string;
}

export interface FactCheckDBResult {
  available: boolean;
  claims_found: number;
  top_reviews?: FactCheckClaim[];
  error?: string;
}

export interface FactCheckLiveResult {
  available: boolean;
  rating?: string;
  short_answer?: string;
  reasoning?: string;
  confidence?: string;
  sources?: { title: string; snippet: string; url: string }[];
  error?: string;
}

export interface FactCheckResult {
  db: FactCheckDBResult | null;
  live: FactCheckLiveResult | null;
}
