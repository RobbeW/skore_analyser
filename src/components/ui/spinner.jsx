import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }) {
  return <Loader2 className={cn("ui-spinner", className)} aria-hidden="true" {...props} />;
}
