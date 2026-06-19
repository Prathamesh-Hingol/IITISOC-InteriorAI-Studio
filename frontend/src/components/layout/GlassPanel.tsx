import React from "react";
import clsx from "clsx";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export function GlassPanel({ children, className, dark = false, ...props }: GlassPanelProps) {
  return (
    <motion.div
      className={clsx(
        dark ? "glass-panel-dark text-white" : "glass-panel text-on-surface",
        "rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
