import { useState } from "react";
import { ConsentGate } from "./ConsentGate";
import { JumpMeasure } from "./JumpMeasure";
import { RecoveryCheckin } from "./RecoveryCheckin";
import { isInsideTelegram } from "./telegram";

type Tab = "jump" | "recovery";

export function App() {
  const [tab, setTab] = useState<Tab>("jump");

  return (
    <div>
      {!isInsideTelegram() && (
        <p style={{ background: "#fef3c7", padding: 8, textAlign: "center", fontSize: 13 }}>
          Вы открыли DunkHub вне Telegram — авторизация через Telegram недоступна, замеры не
          сохранятся в профиль.
        </p>
      )}
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
    </div>
  );
}
