import { useState } from "react";
import { AuthGate } from "./AuthGate";
import { ConsentGate } from "./ConsentGate";
import { Dashboard } from "./Dashboard";
import { JumpMeasure } from "./JumpMeasure";
import { RecoveryCheckin } from "./RecoveryCheckin";

type Tab = "jump" | "recovery" | "progress";

export function App() {
  const [tab, setTab] = useState<Tab>("jump");

  return (
    <AuthGate>
      <ConsentGate>
        <nav style={{ display: "flex", gap: 8, padding: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setTab("jump")} disabled={tab === "jump"}>
            Замер прыжка
          </button>
          <button onClick={() => setTab("recovery")} disabled={tab === "recovery"}>
            Самочувствие
          </button>
          <button onClick={() => setTab("progress")} disabled={tab === "progress"}>
            Прогресс
          </button>
        </nav>
        {tab === "jump" && <JumpMeasure />}
        {tab === "recovery" && <RecoveryCheckin />}
        {tab === "progress" && <Dashboard />}
      </ConsentGate>
    </AuthGate>
  );
}
