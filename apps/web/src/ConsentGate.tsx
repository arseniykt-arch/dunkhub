import { useState } from "react";
import { apiFetch } from "./api";

const CONSENT_STORAGE_KEY = "dunkhub_consent_given";

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const [given, setGiven] = useState(() => localStorage.getItem(CONSENT_STORAGE_KEY) === "true");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (given) return <>{children}</>;

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/consent", {
        method: "POST",
        body: JSON.stringify({ scope: "anonymized_data_research" }),
      });
      localStorage.setItem(CONSENT_STORAGE_KEY, "true");
      setGiven(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h2>Прежде чем начать</h2>
      <p>
        DunkHub замеряет высоту прыжка через камеру телефона и хранит результаты (число, не видео)
        в вашем профиле. Обезличенные данные (без имени и username) могут использоваться для
        исследований, улучшения алгоритмов и агрегированной аналитики. Видео с камеры
        обрабатывается на вашем устройстве и никуда не отправляется, если вы сами не поделитесь
        им в комьюнити.
      </p>
      <p>Согласие можно отозвать в любой момент в настройках профиля.</p>
      {error && <p style={{ color: "crimson" }}>Ошибка: {error}</p>}
      <button onClick={accept} disabled={loading}>
        {loading ? "Сохраняем..." : "Согласен(на), продолжить"}
      </button>
    </div>
  );
}
