import React from "react";
import { History, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScanHistory({ scans, onSelect, onDelete, selectedId }) {
  if (!scans || scans.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Recent scans
        </h2>
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {scans.map((s) => {
          const answered = (s.answers || []).filter(
            (a) => a.option && !["BLANK", "UNCLEAR", "MULTIPLE"].includes(a.option)
          ).length;
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                selectedId === s.id ? "bg-accent/60" : "hover:bg-accent/40"
              )}
            >
              <button
                onClick={() => onSelect(s)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
                  {s.question_count}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {s.question_count} questions · {s.options_count} options
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {answered} marked · {new Date(s.created_date).toLocaleString()}
                  </p>
                </div>
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Delete scan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    </section>
  );
}