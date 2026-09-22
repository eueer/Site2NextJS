import React from "react";

export function SiteLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      srcSet="/logo.png 1x, /logo@2x.png 2x"
      alt="Site2NextJS logo"
      width={60}
      height={40}
      className={`object-contain inline-block shrink-0 select-none ${className}`}
    />
  );
}

export function SparkleIcon({ className = "w-4 h-4 text-[#F65023]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L14.2 8.8L21 11L14.2 13.2L12 20L9.8 13.2L3 11L9.8 8.8L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
