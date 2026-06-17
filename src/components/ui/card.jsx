import React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-card", className)} {...props} />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-card-header", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("ui-card-title", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("ui-card-description", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardAction = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-card-action", className)} {...props} />
));
CardAction.displayName = "CardAction";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-card-content", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-card-footer", className)} {...props} />
));
CardFooter.displayName = "CardFooter";
