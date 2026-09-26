import { useState } from "react";
import { AuthGate } from "./AuthGate";
import { ConsentGate } from "./ConsentGate";
import { JumpMeasure } from "./JumpMeasure";
import { RecoveryCheckin } from "./RecoveryCheckin";

type Tab = "jump" | "recovery";

export function App() {
  const [tab, setTab] = useState<Tab>("jump");

  return (
    <AuthGate>
      <ConsentGate>
        <nav style={{ display: "flex", gap: 8, padding: 12, justifyContent: "center" }}>
          <button onClick={() => setTab("jump")} disabled={tab === "jump"}>
            Замер прыжка
          </button>
          <button onClick={() => setTab("recovery")} disabled={tab === "recovery"}>
            Самочувствие
          </button>
        </nav>
        {tab === "jump" ? <JumpMeasure /> : <RecoveryCheckin />}
      </ConsentGate>
    </AuthGate>
  );
}
