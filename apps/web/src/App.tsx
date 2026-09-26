import { ConsentGate } from "./ConsentGate";
import { JumpMeasure } from "./JumpMeasure";
import { isInsideTelegram } from "./telegram";

export function App() {
  return (
    <div>
      {!isInsideTelegram() && (
        <p style={{ background: "#fef3c7", padding: 8, textAlign: "center", fontSize: 13 }}>
          Вы открыли DunkHub вне Telegram — авторизация через Telegram недоступна, замеры не
          сохранятся в профиль.
        </p>
      )}
      <ConsentGate>
        <JumpMeasure />
      </ConsentGate>
    </div>
  );
}
