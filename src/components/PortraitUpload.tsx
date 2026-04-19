import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PortraitUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => setPreview(value), [value]);

  async function handleFile(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPG and PNG files are accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("portraits")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("portraits").getPublicUrl(path);
      setPreview(data.publicUrl);
      onChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragging(false);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function remove(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(undefined);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload portrait"
        onClick={() => !preview && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !preview && inputRef.current?.click()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={[
          "group w-full aspect-[4/5] max-w-xs mx-auto rounded-2xl border-2 border-dashed transition-all duration-200 flex items-center justify-center overflow-hidden relative",
          preview
            ? "border-border bg-card cursor-default"
            : dragging
              ? "border-accent bg-accent/10 scale-[1.02] shadow-warm cursor-copy"
              : "border-border bg-muted/30 hover:border-accent/60 hover:bg-muted/50 cursor-pointer",
        ].join(" ")}
      >
        {preview ? (
          <>
            <img src={preview} alt="Portrait" className="w-full h-full object-cover" />

            {/* Replace overlay */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center"
              aria-label="Replace photo"
            >
              <span className="opacity-0 group-hover:opacity-100 text-primary-foreground text-sm font-medium">
                Replace photo
              </span>
            </button>

            {/* Remove X */}
            <button
              type="button"
              onClick={remove}
              aria-label="Remove photo"
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-foreground/70 hover:bg-foreground text-primary-foreground flex items-center justify-center text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              ×
            </button>
          </>
        ) : (
          <div className="text-center px-6 pointer-events-none select-none">
            {dragging ? (
              <>
                <div className="font-display text-4xl text-accent mb-2">↓</div>
                <div className="text-sm text-accent font-medium">Drop to upload</div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0-3 3m3-3 3 3M6.5 19h11a2.5 2.5 0 0 0 0-5h-.172a5 5 0 1 0-9.656 0H6.5a2.5 2.5 0 0 0 0 5Z" />
                  </svg>
                </div>
                <div className="text-sm text-foreground font-medium">
                  {uploading ? "Uploading…" : "Drag & drop or click to upload"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">JPG or PNG · up to 10MB</div>
              </>
            )}
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-card/70 flex items-center justify-center">
            <div className="text-sm text-muted-foreground font-serif italic animate-pulse">
              Uploading…
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
