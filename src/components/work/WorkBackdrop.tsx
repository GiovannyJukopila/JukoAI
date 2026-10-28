"use client";

import { WarpGradient } from "@/components/ui/warp-gradient";
import { useTheme } from "@/lib/theme";

// the same slow warp in both themes: night indigo on dark, lavender mist on light
const COLORS = {
  dark: ["#050410", "#150a4f", "#5d40e6", "#050410"],
  light: ["#f7f6fd", "#dcd5ff", "#9d8bff", "#f7f6fd"],
};

/** The moving background of the work section, pinned while it scrolls. */
export function WorkBackdrop() {
  const theme = useTheme();
  return (
    <div className="work-bg" aria-hidden="true">
      <div className="work-bg__pin">
        <WarpGradient
          preset="abyss"
          colors={COLORS[theme]}
          density={0.16}
          warp={0.85}
          turbulence={0.15}
          scale={0.88}
          rotation={-20}
          speed={0.4}
          grain={theme === "light" ? 0.08 : 0.18}
        />
      </div>
    </div>
  );
}
