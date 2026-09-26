import { useEffect, useState } from "react";
import { apiFetch } from "./api";

interface Jump {
  id: string;
  heightCm: number;
  flightTimeMs: number;
  capturedAt: string;
}

interface InjuryRisk {
  acwr: number | null;
  workloadBand: "insufficient_data" | "undertraining" | "optimal" | "caution" | "high_risk";
  acuteJumpCount7d: number;
  chronicWeeklyAvg28d: number;
  kneeAsymmetry: { avgAsymmetry: number | null; flag: boolean; sampleSize: number };
}

const BAND_LABEL: Record<InjuryRisk["workloadBand"], string> = {
  insufficient_data: "недостаточно данных",
  undertraining: "недогруз",
  optimal: "оптимально",
  caution: "осторожно — рост нагрузки",
  high_risk: "высокий риск травмы",
};

const BAND_COLOR: Record<InjuryRisk["workloadBand"], string> = {
  insufficient_data: "#94a3b8",
  undertraining: "#60a5fa",
  optimal: "#22c55e",
  caution: "#f59e0b",
  high_risk: "#ef4444",
};

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 320;
  const height = 80;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block", margin: "0 auto" }}>
      <polyline points={points} fill="none" stroke="#22c55e" strokeWidth={2} />
    </svg>
  );
}

export function Dashboard() {
  const [jumps, setJumps] = useState<Jump[] | null>(null);
  const [risk, setRisk] = useState<InjuryRisk | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiFetch("/jumps"), apiFetch("/injury-risk")])
      .then(([jumpsRes, riskRes]) => {
        setJumps(jumpsRes);
        setRisk(riskRes);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p style={{ padding: 16, color: "crimson" }}>{error}</p>;
  if (!jumps || !risk) return <p style={{ padding: 16 }}>Загрузка…</p>;

  const personalRecord = jumps.length > 0 ? Math.max(...jumps.map((j) => j.heightCm)) : null;
  const last5Avg =
    jumps.length > 0
      ? jumps.slice(0, 5).reduce((sum, j) => sum + j.heightCm, 0) / Math.min(5, jumps.length)
      : null;
  const chronological = [...jumps].reverse().map((j) => j.heightCm);

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2>Прогресс</h2>

      {jumps.length === 0 ? (
        <p>Замеров пока нет — сделайте первый прыжок на вкладке «Замер прыжка».</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{personalRecord?.toFixed(1)} см</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>рекорд</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{last5Avg?.toFixed(1)} см</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>средний за 5 последних</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{jumps.length}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>всего замеров</div>
            </div>
          </div>

          <Sparkline values={chronological} />
        </>
      )}

      <h3 style={{ marginTop: 24 }}>Риск перетренированности</h3>
      <div
        style={{
          padding: 12,
          borderRadius: 8,
          background: BAND_COLOR[risk.workloadBand] + "22",
          border: `1px solid ${BAND_COLOR[risk.workloadBand]}`,
        }}
      >
        <div style={{ fontWeight: 700, color: BAND_COLOR[risk.workloadBand] }}>
          {BAND_LABEL[risk.workloadBand]}
        </div>
        {risk.acwr !== null && (
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            ACWR: {risk.acwr.toFixed(2)} ({risk.acuteJumpCount7d} прыжков за 7 дней против{" "}
            {risk.chronicWeeklyAvg28d.toFixed(1)} в среднем за неделю)
          </div>
        )}
      </div>

      {risk.kneeAsymmetry.sampleSize > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3>Асимметрия колен при приземлении</h3>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            {risk.kneeAsymmetry.flag
              ? "⚠️ Заметная асимметрия между левой и правой ногой при приземлении — стоит обратить внимание на технику или проконсультироваться со специалистом."
              : "Асимметрия в пределах нормы."}{" "}
            (по последним {risk.kneeAsymmetry.sampleSize} прыжкам)
          </p>
        </div>
      )}

      {jumps.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>История</h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th>Дата</th>
                <th>Высота</th>
                <th>Полёт</th>
              </tr>
            </thead>
            <tbody>
              {jumps.slice(0, 10).map((j) => (
                <tr key={j.id}>
                  <td>{new Date(j.capturedAt).toLocaleDateString()}</td>
                  <td>{j.heightCm.toFixed(1)} см</td>
                  <td>{j.flightTimeMs.toFixed(0)} мс</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
