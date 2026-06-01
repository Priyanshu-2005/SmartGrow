"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Code2, Key, Zap, BookOpen, Terminal, Copy, Check,
  Globe, FileText, Shield, BarChart3, ArrowRight
} from "lucide-react";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/scans",
    description: "Submit content for analysis",
    body: '{\n  "url": "https://example.com",\n  "contentType": "url"\n}',
    response: '{\n  "success": true,\n  "scan": {\n    "id": "scan_abc123",\n    "trustScore": 82,\n    "verdict": "Authentic",\n    "signals": [...]\n  }\n}',
  },
  {
    method: "GET",
    path: "/api/v1/scans/:id",
    description: "Retrieve scan results by ID",
    body: null,
    response: '{\n  "scan": {\n    "id": "scan_abc123",\n    "trustScore": 82,\n    "verdict": "Authentic",\n    "signals": [...],\n    "scanDuration": 3.2\n  }\n}',
  },
  {
    method: "POST",
    path: "/api/v1/documents",
    description: "Upload a document for verification",
    body: "FormData with 'file' field",
    response: '{\n  "success": true,\n  "document": {\n    "id": "doc_xyz789",\n    "hash": "a3f2b8c9...",\n    "trustScore": 92,\n    "status": "verified"\n  }\n}',
  },
  {
    method: "POST",
    path: "/api/v1/verify",
    description: "Verify a document by hash or scan ID",
    body: '{\n  "hash": "a3f2b8c9d1e4f5..."\n}',
    response: '{\n  "verified": true,\n  "message": "Document verified",\n  "document": { ... }\n}',
  },
  {
    method: "GET",
    path: "/api/v1/health",
    description: "Health check endpoint",
    body: null,
    response: '{\n  "status": "healthy",\n  "version": "1.0.0"\n}',
  },
];

const codeExamples = {
  curl: `curl -X POST https://api.truelens.app/v1/scans \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "url": "https://example.com/article",
    "contentType": "url"
  }'`,
  nodejs: `const response = await fetch('https://api.truelens.app/v1/scans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    url: 'https://example.com/article',
    contentType: 'url'
  })
});

const { scan } = await response.json();
console.log(\`Trust Score: \${scan.trustScore}\`);
console.log(\`Verdict: \${scan.verdict}\`);`,
  python: `import requests

response = requests.post(
    'https://api.truelens.app/v1/scans',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'url': 'https://example.com/article',
        'contentType': 'url'
    }
)

data = response.json()
print(f"Trust Score: {data['scan']['trustScore']}")
print(f"Verdict: {data['scan']['verdict']}")`,
};

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<"curl" | "nodejs" | "python">("curl");
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "#10B981";
      case "POST": return "#8B5CF6";
      case "PUT": return "#F59E0B";
      case "DELETE": return "#EF4444";
      default: return "#71717A";
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <Code2 className="w-6 h-6 text-text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Developer Portal</h1>
              <p className="text-text-muted text-sm">Integrate TrueLens into your applications</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 mb-8"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-text-primary" />
            Quick Start
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: Key,
                title: "Get API Key",
                desc: "Sign up and generate your API key from the dashboard",
              },
              {
                step: "2",
                icon: Terminal,
                title: "Make a Request",
                desc: "Send a POST request with your content to analyze",
              },
              {
                step: "3",
                icon: BarChart3,
                title: "Get Results",
                desc: "Receive trust score, verdict, and detailed signal breakdown",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-text-primary"
                  style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                  <p className="text-xs text-text-muted mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Code Examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card mb-8 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border-color">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-text-primary" />
              Code Examples
            </h2>
            <div className="flex gap-1">
              {(["curl", "nodejs", "python"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === tab
                      ? "bg-white/10 text-text-secondary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {tab === "nodejs" ? "Node.js" : tab === "curl" ? "cURL" : "Python"}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => handleCopy(codeExamples[activeTab], "code")}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/5 text-text-muted z-10"
            >
              {copiedEndpoint === "code" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="p-5 overflow-x-auto text-sm font-mono text-text-secondary leading-relaxed">
              {codeExamples[activeTab]}
            </pre>
          </div>
        </motion.div>

        {/* API Endpoints */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-text-primary" />
            API Endpoints
          </h2>

          <div className="space-y-4">
            {endpoints.map((endpoint, i) => (
              <motion.div
                key={endpoint.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="glass-card overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase"
                      style={{
                        background: `${getMethodColor(endpoint.method)}15`,
                        color: getMethodColor(endpoint.method),
                      }}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-text-secondary">{endpoint.path}</code>
                  </div>
                  <p className="text-sm text-text-muted">{endpoint.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border-color">
                  {endpoint.body && (
                    <div className="p-4 border-r border-border-color">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Request Body</p>
                      <pre className="text-xs font-mono text-text-secondary overflow-x-auto">{endpoint.body}</pre>
                    </div>
                  )}
                  <div className={`p-4 ${!endpoint.body ? "md:col-span-2" : ""}`}>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Response</p>
                    <pre className="text-xs font-mono text-text-secondary overflow-x-auto">{endpoint.response}</pre>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pricing Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-text-primary" />
            API Pricing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "₹0",
                period: "/month",
                features: [
                  "50 scans/month",
                  "Text + URL analysis",
                  "7-day history",
                  "Community support",
                ],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Pro",
                price: "₹499",
                period: "/month",
                features: [
                  "5,000 scans/month",
                  "All signals incl. image + document",
                  "1 year history",
                  "1,000 API calls/day",
                  "Priority support",
                ],
                cta: "Upgrade to Pro",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                features: [
                  "Unlimited scans",
                  "SLA guarantee",
                  "Dedicated support",
                  "On-premise ML option",
                  "Custom webhook",
                ],
                cta: "Contact Sales",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`glass-card p-7 ${plan.highlight ? "gradient-border" : ""}`}
              >
                {plan.highlight && (
                  <span className="badge badge-success mb-4 inline-block">Most Popular</span>
                )}
                <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="text-3xl font-bold text-text-primary">{plan.price}</span>
                  <span className="text-text-muted text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full justify-center ${plan.highlight ? "btn-primary" : "btn-secondary"}`}>
                  <span>{plan.cta}</span>
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
