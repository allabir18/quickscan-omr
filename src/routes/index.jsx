import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Download, FileText, Loader2, Scissors, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { imposePdfs } from "@/lib/pdf-impose";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "PDF Imposer — N pages per page" }] }),
  component: PdfImposer,
});

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function PdfImposer() {
  const [files, setFiles] = useState([]);
  const [perPage, setPerPage] = useState(4);
  const [autoTrim, setAutoTrim] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const pdfs = Array.from(incoming).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    setError(null);
    setFiles((prev) => [...prev, ...pdfs]);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const clearAll = () => setFiles([]);

  const handleDownload = async () => {
    if (!files.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { bytes } = await imposePdfs(files, perPage, autoTrim);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "combined-imposed.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Something went wrong while processing the PDFs.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
            <FileText className="h-3.5 w-3.5" />
            PDF Imposer
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            N pages per page, double-sided
          </h1>
          <p className="mt-3 max-w-xl text-neutral-600">
            Drop in any number of PDFs. Their pages are merged and packed — N pages per
            page, front and back — into a single file ready for double-sided printing.
            Choose how many pages go on each page below.
          </p>
        </header>

        {/* Pages-per-page selector */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-neutral-900">Pages per page</p>
          <div className="inline-flex rounded-full border border-neutral-300 bg-white p-1">
            {[4, 8].map((n) => (
              <button
                key={n}
                onClick={() => setPerPage(n)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  perPage === n ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {n} pages per page
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {perPage} pages on the front + {perPage} on the back = {perPage * 2} original pages per printed sheet.
          </p>
        </div>

        {/* Auto-trim toggle */}
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <Scissors className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">Auto-trim page margins</p>
              <p className="mt-1 text-xs text-neutral-500">
                Detects blank space around each page's content and crops it before packing,
                so pages fill even more of the sheet.
              </p>
            </div>
          </div>
          <Switch checked={autoTrim} onCheckedChange={setAutoTrim} aria-label="Auto-trim page margins" />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragging
              ? "border-neutral-900 bg-neutral-100"
              : "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform group-hover:scale-105">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-neutral-900">
            Drop PDFs here, or click to browse
          </p>
          <p className="mt-1 text-xs text-neutral-500">Add as many as you like — all combined into one output.</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">
                {files.length} file{files.length === 1 ? "" : "s"}
              </p>
              <button
                onClick={clearAll}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                Clear all
              </button>
            </div>
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{f.name}</p>
                      <p className="text-xs text-neutral-500">{formatSize(f.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Action */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Tip: print the result double-sided with <span className="font-medium text-neutral-700">flip on long edge</span>.
          </p>
          <Button
            onClick={handleDownload}
            disabled={!files.length || busy}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Combined PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}