"use client";
import { useSyncExternalStore } from "react";
import { LiquidGradientShader } from "./LiquidGradientShader";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export function HeroBackground() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  return (
    <div className="hero-background" aria-hidden="true">
      {!reduced && <LiquidGradientShader />}
    </div>
  );
}
