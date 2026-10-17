
"use client";

import { useEffect, useRef, useState } from "react";

export default function RemoveBackgroundPage() {
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Upload a ring image to begin");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function createPreviewUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    return url;
  }

  async function handleUpload(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Please select an image file.");
      return;
    }

    setOriginal(createPreviewUrl(file));
    setResult(null);
    setFileName(file.name);
    setProgress(0);
    setStatus("Preparing image...");
  }

  async function removeBackground() {
    if (!original || !fileName || loading) return;

    setLoading(true);
    setProgress(0);
    setStatus("Loading AI model...");

    try {
      const file = inputRef.current?.files?.[0];

      if (!file) {
        setStatus("Please upload your image again.");
        return;
      }

        const { removeBackground: removeBg } = await import(
        "@imgly/background-removal"
        );

      setStatus("Removing background... This may take a while.");

        const transparentBlob = await removeBg(file, {
        model: "isnet",
        output: {
            format: "image/png",
            quality: 1, 
        },
        progress: (key, current, total) => {
            if (total > 0) {
            setProgress(Math.round((current / total) * 100));
            }
        },
        });

      setResult(createPreviewUrl(transparentBlob));
      setProgress(100);
      setStatus("Background removed successfully!");
    } catch (error) {
      console.error("Background removal failed:", error);

      setStatus(
        error instanceof Error
          ? `Failed: ${error.message}`
          : "Background removal failed. Check the console."
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setOriginal(null);
    setResult(null);
    setFileName("");
    setProgress(0);
    setStatus("Upload a ring image to begin");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
            Image Studio
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Background Remover
          </h1>

          <p className="mt-3 text-slate-400">
            Remove the background from your ring photo and prepare it
            for your virtual try-on.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />

          {!original ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleUpload(e.dataTransfer.files?.[0]);
              }}
              className="flex min-h-72 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 px-6 py-10 transition hover:border-violet-500"
            >
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl text-violet-400">
                ↑
              </span>

              <span className="font-semibold">
                Upload your ring image
              </span>

              <span className="mt-2 text-sm text-slate-400">
                Click to browse or drag and drop
              </span>

              <span className="mt-5 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold">
                Choose image
              </span>

              <span className="mt-4 text-xs text-slate-500">
                JPG, PNG or WEBP
              </span>
            </button>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{fileName}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Original image selected
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={loading}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Change image
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-slate-300">
                    Original
                  </h2>

                  <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <img
                      src={original}
                      alt="Original ring"
                      className="max-h-96 max-w-full object-contain"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="mb-3 text-sm font-semibold text-slate-300">
                    Transparent result
                  </h2>

                  <div
                    className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-slate-800 p-4"
                    style={{
                      backgroundColor: "#ffffff",
                      backgroundImage:
                        "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
                      backgroundSize: "20px 20px",
                      backgroundPosition:
                        "0 0,0 10px,10px -10px,-10px 0px",
                    }}
                  >
                    {result ? (
                      <img
                        src={result}
                        alt="Ring with background removed"
                        className="max-h-96 max-w-full object-contain"
                      />
                    ) : (
                      <p className="px-4 text-center text-sm text-slate-500">
                        Your transparent ring image will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {loading && (
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-violet-300">{status}</span>
                    <span className="text-slate-400">{progress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Progress reflects available asset-download updates;
                    model processing may take additional time.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={removeBackground}
                  disabled={loading}
                  className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Remove Background"}
                </button>

                {result && (
                  <a
                    href={result}
                    download={`${fileName.replace(/\.[^.]+$/, "")}-transparent.png`}
                    className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500"
                  >
                    Download transparent PNG
                  </a>
                )}

                <button
                  type="button"
                  onClick={reset}
                  disabled={loading}
                  className="rounded-lg border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </>
          )}

          <p aria-live="polite" className="mt-5 text-sm text-slate-400">
            {status}
          </p>
        </section>

        <p className="mt-5 text-center text-xs text-slate-500">
          Image processing runs in your browser. Model assets are
          downloaded when needed.
        </p>
      </div>
    </main>
  );
}
