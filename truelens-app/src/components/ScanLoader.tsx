"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function ScanLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-8">
      {/* Pulsing logo */}
      <motion.div
        className="relative"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
          style={{ background: "rgba(255, 255, 255, 0.05)" }}>
          <Shield className="w-12 h-12 text-text-primary" />
          
          {/* Scanning ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(255, 255, 255, 0.1)" }}
            animate={{
              scale: [1, 1.5],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(255, 255, 255, 0.1)" }}
            animate={{
              scale: [1, 1.5],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(255, 255, 255, 0.1)" }}
            animate={{
              scale: [1, 1.5],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 1,
            }}
          />
        </div>
      </motion.div>

      {/* Status text */}
      <div className="text-center">
        <motion.h3
          className="text-xl font-semibold text-text-primary mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyzing Content...
        </motion.h3>
        <p className="text-text-muted text-sm">
          Running multi-signal analysis pipeline
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {[
          { label: "Fetching content", delay: 0 },
          { label: "Text analysis", delay: 0.5 },
          { label: "Domain verification", delay: 1 },
          { label: "Computing trust score", delay: 1.5 },
        ].map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: step.delay, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-text-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: step.delay,
              }}
            />
            <span className="text-sm text-text-muted">{step.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
