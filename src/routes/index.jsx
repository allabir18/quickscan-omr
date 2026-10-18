import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import React, { useEffect, useState } from "react";
import { ScanLine, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  processOMRScan,
  listScans,
  getScan,
  deleteScan,
} from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UploadZone from "@/components/omr/UploadZone";
import ResultsView from "@/components/omr/ResultsView";
import ScanHistory from "@/components/omr/ScanHistory";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OMR Scanner — Detect MCQ Answers" },
      {
        name: "description",
        content:
          "Upload an OMR answer sheet and instantly detect the marked option for each question.",
      },
    ],
  }),
  component: ScannerPage,
});

function ScannerPage() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [questionCount, setQuestionCount] = useState(25);
  const [optionsCount, setOptionsCount] = useState(4);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const process = useServerFn(processOMRScan);
  const list = useServerFn(listScans);
  const getOne = useServerFn(getScan);
  const remove = useServerFn(deleteScan);

  const refreshHistory = async () => {
    try {
      const res = await list();
      setHistory(res.items || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleFile = async (f) => {
    setError(null);
    setResults(null);
    setSelectedId(null);
    setPreviewUrl(URL.createObjectURL(f));
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
      setFileUri(file_uri);
    } catch {
      setError("Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleScan = async () => {
    if (!fileUri) return;
    setScanning(true);
    setError(null);
    setResults(null);
    try {
      const res = await process({
        data: {
          file_uri: fileUri,
          question_count: questionCount,
          options_count: optionsCount,
        },
      });
      setResults({
        answers: res.answers,
        questionCount,
        optionsCount,
        imageUrl: previewUrl,
      });
      setSelectedId(res.scan_id);
      refreshHistory();
    } catch {
      setError("Scan failed. Please ensure the image is clear and try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleSelect = async (s) => {
    setError(null);
    try {
      const full = await getOne({ data: { id: s.id } });
      if (!full) return;
      setResults({
        answers: full.answers || [],
        questionCount: full.question_count,
        optionsCount: full.options_count,
        imageUrl: full.image_url,
      });
      setSelectedId(s.id);
      setPreviewUrl(null);
      setFileUri(null);
    } catch {
      setError("Could not load that scan.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove({ data: { id } });
      if (selectedId === id) {
        setSelectedId(null);
        setResults(null);
      }
      refreshHistory();
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setFileUri(null);
    setResults(null);
    setError(null);
    setSelectedId(null);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered mark detection
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">OMR Scanner</h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
          Upload a filled MCQ answer sheet and instantly read the marked option for every
          question.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <UploadZone previewUrl={previewUrl} onFile={handleFile} disabled={scanning} />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="qcount" className="mb-1.5 block text-sm font-medium">
              Questions
            </Label>
            <Input
              id="qcount"
              type="number"
              min={1}
              max={200}
              value={questionCount}
              onChange={(e) =>
                setQuestionCount(
                  Math.max(1, Math.min(200, Number(e.target.value) || 1))
                )
              }
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Options per question
            </Label>
            <Select
              value={String(optionsCount)}
              onValueChange={(v) => setOptionsCount(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} options (A–{String.fromCharCode(65 + n - 1)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleScan}
            disabled={!fileUri || scanning || uploading}
            size="lg"
            className="gap-2"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
            {scanning ? "Scanning…" : "Scan sheet"}
          </Button>
          {(previewUrl || results) && (
            <Button onClick={reset} variant="ghost" className="gap-2">
              <RotateCcw className="h-4 w-4" /> Start over
            </Button>
          )}
          {uploading && (
            <span className="text-sm text-muted-foreground">Uploading image…</span>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      {scanning && !results && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Reading the marks on your sheet…
          </p>
        </div>
      )}

      {results && (
        <section className="mt-10">
          <ResultsView
            answers={results.answers}
            questionCount={results.questionCount}
            optionsCount={results.optionsCount}
            imageUrl={results.imageUrl}
          />
        </section>
      )}

      <ScanHistory
        scans={history}
        onSelect={handleSelect}
        onDelete={handleDelete}
        selectedId={selectedId}
      />
    </main>
  );
}