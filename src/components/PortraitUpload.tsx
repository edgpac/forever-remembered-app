import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";

// ─── Canvas crop helper ───────────────────────────────────────────────────────

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas empty"))), "image/jpeg", 0.92)
  );
}

// ─── Crop modal ───────────────────────────────────────────────────────────────

type AspectOption = { label: string; value: number };
const ASPECTS: AspectOption[] = [
  { label: "16:10", value: 16 / 10 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
];

function CropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (cropped: Area) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<AspectOption>(ASPECTS[0]);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-white/60 hover:text-white transition"
        >
          ← Cancel
        </button>
        <div className="flex items-center gap-1.5">
          {ASPECTS.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => setAspect(a)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                aspect.label === a.label
                  ? "bg-accent text-foreground font-medium"
                  : "text-white/50 hover:text-white border border-white/20"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => croppedArea && onConfirm(croppedArea)}
          disabled={!croppedArea}
          className="rounded-full bg-accent text-foreground px-5 py-1.5 text-sm font-medium disabled:opacity-40 transition hover:opacity-90"
        >
          Use photo
        </button>
      </div>

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect.value}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            containerStyle: { background: "#0a0a12" },
            cropAreaStyle: { borderColor: "var(--accent, #c9a96e)", borderWidth: 2 },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-8 py-4 shrink-0 border-t border-white/10">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[#c9a96e]"
        />
        <p className="text-center text-[10px] tracking-widest uppercase text-white/30 mt-1">
          Pinch or drag to adjust · scroll to zoom
        </p>
      </div>
    </div>
  );
}

// ─── Main upload component ────────────────────────────────────────────────────

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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => setPreview(value), [value]);

  function openFile(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG, or WebP files are accepted");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCropConfirm(pixels: Area) {
    if (!cropSrc) return;
    setCropSrc(null);
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, pixels);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("portraits")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
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
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) openFile(file);
  }

  function remove(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(undefined);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); if (inputRef.current) inputRef.current.value = ""; }}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) openFile(f);
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
          "group w-full aspect-[16/10] rounded-2xl border-2 border-dashed transition-all duration-200 flex items-center justify-center overflow-hidden relative",
          preview
            ? "border-border bg-card cursor-default"
            : dragging
              ? "border-accent bg-accent/10 scale-[1.01] shadow-warm cursor-copy"
              : "border-border bg-muted/30 hover:border-accent/60 hover:bg-muted/50 cursor-pointer",
        ].join(" ")}
      >
        {preview ? (
          <>
            <img src={preview} alt="Portrait" className="w-full h-full object-cover object-top" />

            {/* Overlay buttons */}
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="opacity-0 group-hover:opacity-100 bg-white/90 text-foreground text-xs font-medium px-4 py-2 rounded-full transition"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                aria-label="Remove photo"
                className="opacity-0 group-hover:opacity-100 bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-full border border-white/30 transition"
              >
                Remove
              </button>
            </div>
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
                <div className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP · up to 20MB</div>
                <div className="text-xs text-accent mt-1">You'll be able to crop before it's saved.</div>
              </>
            )}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-card/70 flex items-center justify-center">
            <div className="text-sm text-muted-foreground font-serif italic animate-pulse">Uploading…</div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
    </>
  );
}
