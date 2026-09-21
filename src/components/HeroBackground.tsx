"use client";

import React from "react";
import { LiquidGradientShader } from "./LiquidGradientShader";

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute top-0 left-0 w-full h-[880px] sm:h-[940px] overflow-hidden">
      {/* Exact Framer Liquid Gradient WebGL Shader */}
      <LiquidGradientShader />

      {/* Subtle top ambient accent glow matching brand orange */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full bg-[#F65023]/15 blur-[140px] pointer-events-none" />

      {/* Subtle ambient grid overlay with radial vignette */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 85%)",
        }}
      />
    </div>
  );
}
