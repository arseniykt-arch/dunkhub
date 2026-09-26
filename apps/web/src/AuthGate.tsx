import { useState } from "react";
import { apiFetch } from "./api";
import { getToken, setToken, clearToken } from "./auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState(() => getToken());
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    return (
      <div>
        <div style={{ textAlign: "right", padding: 8 }}>
          <button
            onClick={() => {
              clearToken();
              setTokenState(null);
            }}
          >
            Выйти
          </button>
        </div>
        {children}
      </div>
    );
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login" ? { email, password } : { email, password, displayName };
      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      setToken(res.token);
      setTokenState(res.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: "0 auto" }}>
      <h1>DunkHub</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode("login")} disabled={mode === "login"}>
          Войти
        </button>
        <button onClick={() => setMode("register")} disabled={mode === "register"}>
          Регистрация
        </button>
      </div>
      {mode === "register" && (
        <input
          placeholder="Имя"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />
      )}
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />
      <input
        placeholder="Пароль (минимум 8 символов)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button onClick={submit} disabled={loading}>
        {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
      </button>
    </div>
  );
}
