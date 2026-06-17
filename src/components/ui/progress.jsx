import React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value = 0, className, ...props }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("ui-progress", className)} {...props}>
      <div className="ui-progress-bar" style={{ width: `${width}%` }} />
    </div>
  );
}
