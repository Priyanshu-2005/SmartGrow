"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield, Scan, FileCheck, Code2, ArrowRight, Zap,
  Eye, Bot, Globe, Lock, BarChart3, Sparkles,
  CheckCircle, AlertTriangle, Search
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <div className="relative">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        
        {/* Floating orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <Sparkles className="w-4 h-4 text-text-primary" />
            <span className="text-sm text-text-primary font-medium">AI-Powered Content Verification Platform</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            {...fadeInUp}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight mb-6"
          >
            <span className="text-text-primary">Verify </span>
            <span className="text-text-secondary">
              Authenticity
            </span>
            <br />
            <span className="text-text-primary">in the Age of </span>
            <span className="text-text-primary">AI</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Detect AI-generated content, fake reviews, manipulated images, and fraudulent documents. 
            Get a trust score for any content on the internet.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/scan" className="btn-primary text-base !py-4 !px-8 group">
              <Scan className="w-5 h-5 relative z-10" />
              <span>Start Scanning</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/developers" className="btn-secondary text-base !py-4 !px-8">
              <Code2 className="w-5 h-5" />
              <span>View API Docs</span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { value: "99.2%", label: "Accuracy" },
              { value: "<3s", label: "Analysis Time" },
              { value: "5+", label: "Signal Types" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090B] to-transparent" />
      </section>

      {/* ===== PROBLEM STATEMENT ===== */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-text-secondary text-sm font-semibold uppercase tracking-widest mb-3">
              The Problem
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold text-text-primary mb-6">
              The Internet Has a Trust Crisis
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-text-muted text-lg max-w-2xl mx-auto">
              AI-generated content is flooding the web. Fake reviews, manipulated images, and forged documents are indistinguishable from authentic content. TrueLens changes that.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                stat: "85%",
                title: "AI Content Online",
                desc: "of internet content may be AI-generated by 2026",
                color: "#EF4444",
              },
              {
                icon: AlertTriangle,
                stat: "40%",
                title: "Fake Reviews",
                desc: "of online reviews are estimated to be fraudulent",
                color: "#F59E0B",
              },
              {
                icon: Eye,
                stat: "72%",
                title: "Can't Distinguish",
                desc: "of people can't tell AI content from human content",
                color: "#A3A3A3",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="glass-card glass-card-hover p-8 text-center"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}
                >
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <p className="text-4xl font-bold mb-2" style={{ color: item.color }}>{item.stat}</p>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-text-secondary text-sm font-semibold uppercase tracking-widest mb-3">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold text-text-primary mb-6">
              Three Steps to Truth
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Search,
                title: "Submit Content",
                desc: "Paste a URL, enter text, or upload a document. TrueLens accepts any content format for analysis.",
              },
              {
                step: "02",
                icon: Zap,
                title: "AI Analysis",
                desc: "Our multi-signal ML pipeline analyzes text patterns, image forensics, domain trust, and more in seconds.",
              },
              {
                step: "03",
                icon: Shield,
                title: "Get Trust Score",
                desc: "Receive a comprehensive trust score with detailed evidence breakdown and actionable insights.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="relative"
              >
                <div className="glass-card glass-card-hover p-8 h-full">
                  <span className="text-6xl font-bold text-white/10 absolute top-4 right-6">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <item.icon className="w-6 h-6 text-text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-3">{item.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CORE CAPABILITIES ===== */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-text-secondary text-sm font-semibold uppercase tracking-widest mb-3">
              Capabilities
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold text-text-primary mb-6">
              Comprehensive Detection Suite
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-text-muted text-lg max-w-2xl mx-auto">
              TrueLens uses an ensemble of ML models and heuristic signals to deliver accurate, explainable authenticity verdicts.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: "AI Text Detection",
                desc: "Identify AI-generated text using fine-tuned transformer models with stylometry analysis.",
                features: ["GPT/Claude detection", "Paragraph-level breakdown", "Stylometry features"],
              },
              {
                icon: Eye,
                title: "Image Forensics",
                desc: "Detect manipulated and AI-generated images through GAN fingerprinting and error level analysis.",
                features: ["GAN fingerprint detection", "EXIF metadata analysis", "Error Level Analysis"],
              },
              {
                icon: Globe,
                title: "Domain Trust",
                desc: "Assess website credibility through domain age, reputation databases, and traffic analysis.",
                features: ["WHOIS age check", "Reputation scoring", "SSL verification"],
              },
              {
                icon: BarChart3,
                title: "Fake Review Detection",
                desc: "Flag fraudulent reviews using NLP analysis and behavioral patterns.",
                features: ["Sentiment analysis", "Review velocity", "Stylometry patterns"],
              },
              {
                icon: Lock,
                title: "Document Signing",
                desc: "Cryptographically sign verified documents with tamper-evident signatures.",
                features: ["SHA-256 hashing", "Digital signatures", "QR verification"],
              },
              {
                icon: Code2,
                title: "Public API",
                desc: "Integrate TrueLens into your workflows with our comprehensive REST API.",
                features: ["RESTful endpoints", "Webhook delivery", "SDK packages"],
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-card glass-card-hover p-7 group"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors"
                  style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  <item.icon className="w-6 h-6 text-text-primary group-hover:text-text-secondary transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted mb-4 leading-relaxed">{item.desc}</p>
                <ul className="space-y-2">
                  {item.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                      <CheckCircle className="w-3.5 h-3.5 text-text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="glass-card p-12 md:p-16">
              <Shield className="w-14 h-14 text-text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Ready to Verify?
              </h2>
              <p className="text-text-muted text-lg mb-8 max-w-md mx-auto">
                Start scanning content for authenticity. Free to use, no sign-up required.
              </p>
              <Link href="/scan" className="btn-primary text-lg !py-4 !px-10 group">
                <Scan className="w-5 h-5 relative z-10" />
                <span>Scan Now — It&apos;s Free</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
