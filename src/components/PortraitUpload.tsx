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
  const inputRef = useRef<HTMLInputElement>(null);

  // Reflect external value (e.g. when navigating back to step 1)
  const [preview, setPreview] = useState<string | undefined>(value);
  useEffect(() => setPreview(value), [value]);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
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

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group w-full aspect-[4/5] max-w-xs mx-auto rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:border-accent hover:bg-muted/50 transition-colors flex items-center justify-center overflow-hidden relative"
      >
        {preview ? (
          <>
            <img src={preview} alt="Portrait" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-primary-foreground text-sm">
                Replace photo
              </span>
            </div>
          </>
        ) : (
          <div className="text-center px-6">
            <div className="font-display text-3xl text-muted-foreground mb-2">+</div>
            <div className="text-sm text-foreground">Add their portrait</div>
            <div className="text-xs text-muted-foreground mt-1">
              {uploading ? "Uploading…" : "JPG or PNG, up to 10MB"}
            </div>
          </div>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
