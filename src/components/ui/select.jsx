import React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("ui-select", className)} {...props}>
    {children}
  </select>
));

Select.displayName = "Select";
