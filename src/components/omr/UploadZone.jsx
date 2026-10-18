import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadZone({ previewUrl, onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-primary bg-accent/60" : "border-border hover:border-primary/50 hover:bg-accent/40",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={previewUrl}
            alt="OMR sheet preview"
            className="max-h-64 rounded-xl border border-border object-contain shadow-sm"
          />
          <p className="text-sm text-muted-foreground">Click to replace the image</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-base font-medium">Drop your OMR sheet here</p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse — PNG, JPG up to 25MB</p>
        </>
      )}
    </div>
  );
}