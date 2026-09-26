import { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { apiFetch } from "./api";

const GRAVITY_CM_PER_S2 = 980.665;
// Hip vertical velocity threshold (normalized units/sec) that marks takeoff/landing.
const VELOCITY_THRESHOLD = 0.9;

type Phase = "idle" | "loading_model" | "ready" | "airborne" | "result" | "error";

export function JumpMeasure() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number>();
  const takeoffTimeRef = useRef<number | null>(null);
  const lastHipYRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ heightCm: number; flightTimeMs: number } | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  async function start() {
    setError(null);
    setResult(null);
    setPhase("loading_model");
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm",
      );
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720, frameRate: 60 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      takeoffTimeRef.current = null;
      lastHipYRef.current = null;
      lastTimeRef.current = null;
      setPhase("ready");
      rafRef.current = requestAnimationFrame(detectLoop);
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  function detectLoop(now: number) {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker) return;

    const result = landmarker.detectForVideo(video, now);
    const landmarks = result.landmarks[0];
    if (landmarks) {
      // Average of left/right hip landmarks (indices 23, 24) as a stable body-center proxy.
      const hipY = (landmarks[23].y + landmarks[24].y) / 2;
      const t = now / 1000;

      if (lastHipYRef.current !== null && lastTimeRef.current !== null) {
        const dt = t - lastTimeRef.current;
        const velocity = (lastHipYRef.current - hipY) / dt; // positive = moving up (y decreases upward)

        if (takeoffTimeRef.current === null && velocity > VELOCITY_THRESHOLD) {
          takeoffTimeRef.current = t;
          setPhase("airborne");
        } else if (takeoffTimeRef.current !== null && velocity < -VELOCITY_THRESHOLD) {
          const flightTimeS = t - takeoffTimeRef.current;
          finish(flightTimeS);
          return;
        }
      }
      lastHipYRef.current = hipY;
      lastTimeRef.current = t;
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }

  async function finish(flightTimeS: number) {
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((track) => track.stop());

    const heightCm = (GRAVITY_CM_PER_S2 * flightTimeS * flightTimeS) / 8;
    const flightTimeMs = flightTimeS * 1000;
    setResult({ heightCm, flightTimeMs });
    setPhase("result");

    try {
      await apiFetch("/jumps", {
        method: "POST",
        body: JSON.stringify({ type: "standing_vertical", heightCm, flightTimeMs }),
      });
    } catch (e) {
      setError(`Замер посчитан, но не сохранён: ${(e as Error).message}`);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2>Замер прыжка</h2>
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Поставьте телефон вертикально на расстоянии ~2-3м, чтобы всё тело было в кадре. Прыгните
        вверх после нажатия кнопки.
      </p>
      <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 12 }} />
      {phase === "idle" && <button onClick={start}>Начать замер</button>}
      {phase === "loading_model" && <p>Загружаем модель распознавания позы…</p>}
      {phase === "ready" && <p>Ищем вас в кадре — прыгайте.</p>}
      {phase === "airborne" && <p>В полёте…</p>}
      {result && (
        <div>
          <p>
            <strong>Высота:</strong> {result.heightCm.toFixed(1)} см
          </p>
          <p>
            <strong>Время полёта:</strong> {result.flightTimeMs.toFixed(0)} мс
          </p>
          <button onClick={start}>Ещё раз</button>
        </div>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
