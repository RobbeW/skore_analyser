import React from "react";
import { cn } from "@/lib/utils";

export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="ui-table-wrap">
    <table ref={ref} className={cn("ui-table", className)} {...props} />
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("ui-table-header", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("ui-table-body", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("ui-table-row", className)} {...props} />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("ui-table-head", className)} {...props} />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("ui-table-cell", className)} {...props} />
));
TableCell.displayName = "TableCell";
