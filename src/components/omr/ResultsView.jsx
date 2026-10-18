import React from "react";
import { cn } from "@/lib/utils";

function optionStyle(option) {
  if (!option || option === "BLANK")
    return { label: "Blank", cls: "bg-muted text-muted-foreground border-border" };
  if (option === "MULTIPLE")
    return { label: "Multi", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (option === "UNCLEAR")
    return { label: "?", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: option, cls: "bg-emerald-600 text-white border-emerald-600" };
}

export default function ResultsView({ answers, questionCount, optionsCount, imageUrl }) {
  const byQ = {};
  answers.forEach((a) => {
    byQ[a.question] = a.option;
  });
  const answered = answers.filter(
    (a) => a.option && !["BLANK", "UNCLEAR", "MULTIPLE"].includes(a.option)
  ).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {imageUrl && (
        <div className="self-start lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <img
              src={imageUrl}
              alt="Scanned OMR sheet"
              className="max-h-[70vh] w-full bg-muted/30 object-contain"
            />
          </div>
        </div>
      )}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Detected answers</h3>
          <span className="text-sm text-muted-foreground">
            {answered} of {questionCount} marked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: questionCount }, (_, i) => i + 1).map((q) => {
            const s = optionStyle(byQ[q]);
            return (
              <div
                key={q}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">
                  {q}
                </span>
                <span
                  className={cn(
                    "ml-auto inline-flex min-w-7 items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                    s.cls
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}