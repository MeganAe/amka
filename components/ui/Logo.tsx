"use client";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Logo({ className, iconOnly = false, size = "md" }: LogoProps) {
  const heightClasses = {
    sm: "h-10",
    md: "h-14",
    lg: "h-18",
  };

  const src = iconOnly ? "/amka_logo_icon.png" : "/amka_logo_full.png";
  const alt = iconOnly ? "AMKA Icon" : "AMKA Medical System";

  return (
    <div className={cn("flex items-center select-none", className)}>
      <img
        src={src}
        alt={alt}
        className={cn("object-contain w-auto", heightClasses[size])}
      />
    </div>
  );
}
