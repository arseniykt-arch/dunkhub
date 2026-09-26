import { useState } from "react";
import { apiFetch } from "./api";

export function RecoveryCheckin() {
  const [sorenessLevel, setSorenessLevel] = useState(1);
  const [sleepHours, setSleepHours] = useState(8);
  const [rpe, setRpe] = useState(5);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit() {
    setStatus("saving");
    try {
      await apiFetch("/recovery-checkins", {
        method: "POST",
        body: JSON.stringify({ sorenessLevel, sleepHours, rpe }),
      });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2>Как самочувствие сегодня?</h2>
      <label style={{ display: "block", marginBottom: 12 }}>
        Мышечная боль (1 — нет, 5 — сильная): {sorenessLevel}
        <input
          type="range"
          min={1}
          max={5}
          value={sorenessLevel}
          onChange={(e) => setSorenessLevel(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: 12 }}>
        Сон, часов: {sleepHours}
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={sleepHours}
          onChange={(e) => setSleepHours(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>
      <label style={{ display: "block", marginBottom: 12 }}>
        Насколько тяжёлой была вчерашняя тренировка (1-10): {rpe}
        <input
          type="range"
          min={1}
          max={10}
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>
      <button onClick={submit} disabled={status === "saving"}>
        {status === "saving" ? "Сохраняем..." : "Сохранить"}
      </button>
      {status === "saved" && <p>Сохранено.</p>}
      {status === "error" && <p style={{ color: "crimson" }}>Не удалось сохранить.</p>}
    </div>
  );
}
