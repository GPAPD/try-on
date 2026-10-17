
"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

type Point = {
  x: number;
  y: number;
  z: number;
};

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [hands, setHands] = useState<Point[][]>([]);
  const [status, setStatus] = useState("Upload an image to begin");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const [sizeFactor, setSizeFactor] = useState(0.70);
  const [angleFactor, setAngleFactor] = useState(-45);
  const [positionFactor, setPositionFactor] = useState(0.70);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }

      landmarkerRef.current?.close();
    };
  }, []);

  async function getLandmarker() {
    if (landmarkerRef.current) {
      return landmarkerRef.current;
    }

    const vision = await FilesetResolver.forVisionTasks(
      // path/to/wasm/root
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const handLandmarker = await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "/models/hand_landmarker.task",
        },
        runningMode: "IMAGE",
        numHands: 2,
      }
    );

    landmarkerRef.current = handLandmarker;
    return handLandmarker;
  }

  async function handleFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Please select a valid image.");
      return;
    }

    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    imageUrlRef.current = url;

    setImage(url);
    setFileName(file.name);
    setHands([]);
    setLoading(true);
    setStatus("Loading hand detection model...");

    try {
      const detector = await getLandmarker();
      const bitmap = await createImageBitmap(file);

      setImageSize({
        width: bitmap.width,
        height: bitmap.height,
      });

      setStatus("Analyzing image...");

      const result = detector.detect(bitmap);
      bitmap.close();

      const detectedHands = result.landmarks as Point[][];
      setHands(detectedHands);

      if (detectedHands.length > 0) {
        setStatus(
          `Detected ${detectedHands.length} hand${detectedHands.length === 1 ? "" : "s"
          }`
        );
      } else {
        setStatus("No hand detected. Try another image.");
      }
    } catch (error: unknown) {
      console.error("Hand detection failed:", error);

      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        setStatus(`Detection failed: ${error.message}`);
      } else {
        setStatus(`Detection failed: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function removeImage() {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }

    setImage(null);
    setFileName("");
    setHands([]);
    setImageSize({ width: 0, height: 0 });
    setStatus("Upload an image to begin");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const connections = HandLandmarker.HAND_CONNECTIONS;

  function getRingOverlay(landmarks: Point[], sizeFactor = 0.70, angleFactor = -45, positionFactor = 0.70) {
    const mcp = landmarks[13]; // Ring finger base knuckle
    const pip = landmarks[14]; // Next ring finger joint

    if (!mcp || !pip || imageSize.width === 0 || imageSize.height === 0) {
      return null;
    }

    // Convert normalized MediaPipe coordinates into image coordinates.
    const x1 = mcp.x * imageSize.width;
    const y1 = mcp.y * imageSize.height;
    const x2 = pip.x * imageSize.width;
    const y2 = pip.y * imageSize.height;

    // Position the ring between the two joints, nearer the finger base.
    const t = positionFactor;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;

    // Calculate finger direction and the overlay's rotation.
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = (Math.atan2(dy, dx) * angleFactor) / Math.PI;

    // Estimate ring size from the length of the finger segment.
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    const size = segmentLength * sizeFactor;

    return {
      x,
      y,
      angle,
      size,
    };
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
            Computer Vision
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Hand Tracker
          </h1>

          <p className="mt-3 text-slate-400">
            Upload a photo and let AI detect your hand.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
          <label className="mb-4 block text-sm font-semibold">
            Upload your photo
          </label>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {!image ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${isDragging
                ? "border-violet-400 bg-violet-500/10"
                : "border-slate-700 bg-slate-950/50 hover:border-violet-500"
                }`}
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl text-violet-400">
                ↑
              </div>

              <p className="text-base font-semibold">
                Drop your image here
              </p>

              <p className="mt-2 text-sm text-slate-400">
                or click to browse files
              </p>

              <span className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500">
                Choose image
              </span>

              <p className="mt-5 text-xs text-slate-500">
                PNG, JPG, WEBP
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <div className="flex min-h-64 items-center justify-center overflow-auto p-4">
                <div className="relative inline-block max-w-full">
                  <img
                    src={image}
                    alt="Uploaded photo"
                    onLoad={(e) => {
                      setImageSize({
                        width: e.currentTarget.naturalWidth,
                        height: e.currentTarget.naturalHeight,
                      });
                    }}
                    className="block max-h-[32rem] max-w-full rounded-lg object-contain"
                  />

                  {imageSize.width > 0 && imageSize.height > 0 && (
                    <svg
                      viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      {hands.map((landmarks, handIndex) => (
                        <g key={handIndex}>
                          {/* {connections.map((connection, i) => {
                            const start = landmarks[connection.start];
                            const end = landmarks[connection.end];

                            if (!start || !end) return null;

                            return (
                              <line
                                key={i}
                                x1={start.x * imageSize.width}
                                y1={start.y * imageSize.height}
                                x2={end.x * imageSize.width}
                                y2={end.y * imageSize.height}
                                stroke="#a78bfa"
                                strokeWidth={Math.max(
                                  imageSize.width * 0.004,
                                  2
                                )}
                                strokeLinecap="round"
                              />
                            );
                          })}

                          {landmarks.map((point, i) => (
                            <circle
                              key={i}
                              cx={point.x * imageSize.width}
                              cy={point.y * imageSize.height}
                              r={Math.max(imageSize.width * 0.006, 3)}
                              fill="#34d399"
                              stroke="#ffffff"
                              strokeWidth={Math.max(
                                imageSize.width * 0.0015,
                                1
                              )}
                            />
                          ))} */}

                          {(() => {

                            const ring = getRingOverlay(
                              landmarks,
                              sizeFactor,
                              angleFactor,
                              positionFactor
                            );

                            if (!ring) return null;

                            return (
                              <image
                                href="/rings/ring.png"
                                x={ring.x - ring.size / 2}
                                y={ring.y - ring.size / 2}
                                width={ring.size}
                                height={ring.size}
                                preserveAspectRatio="xMidYMid meet"
                                transform={`rotate(${ring.angle}, ${ring.x}, ${ring.y})`}
                                pointerEvents="none"
                              />
                            );
                          })()}
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-800 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${loading
                    ? "bg-violet-500/10 text-violet-400"
                    : hands.length > 0
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                    }`}
                >
                  {loading ? "…" : hands.length > 0 ? "✓" : "•"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fileName}</p>
                  <p
                    aria-live="polite"
                    className={`mt-1 text-xs ${loading
                      ? "text-violet-400"
                      : hands.length > 0
                        ? "text-emerald-400"
                        : "text-slate-400"
                      }`}
                  >
                    {status}
                  </p>

                  {hands.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">
                      {hands.length * 21} landmark points detected
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                >
                  Change
                </button>

                <button
                  type="button"
                  onClick={removeImage}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>

              <div className="mt-6 space-y-5 rounded-xl border border-slate-700 bg-slate-950 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Ring adjustments</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Tune the ring overlay while viewing your detected hand.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="sizeFactor" className="text-sm font-medium">
                      Ring size
                    </label>
                    <span className="text-sm text-violet-300">
                      {sizeFactor.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="sizeFactor"
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.01"
                    value={sizeFactor}
                    onChange={(e) => setSizeFactor(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="angleFactor" className="text-sm font-medium">
                      Rotation
                    </label>
                    <span className="text-sm text-violet-300">
                      {angleFactor}°
                    </span>
                  </div>
                  <input
                    id="angleFactor"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={angleFactor}
                    onChange={(e) => setAngleFactor(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="positionFactor" className="text-sm font-medium">
                      Position along finger
                    </label>
                    <span className="text-sm text-violet-300">
                      {positionFactor.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="positionFactor"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={positionFactor}
                    onChange={(e) => setPositionFactor(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>Base joint</span>
                    <span>Next joint</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSizeFactor(0.70);
                    setAngleFactor(-45);
                    setPositionFactor(0.70);
                  }}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                >
                  Reset adjustments
                </button>
              </div>
            </div>

          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Powered by MediaPipe. Image processing runs in your browser.
        </p>
      </div>
    </main>
  );
}
