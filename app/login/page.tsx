"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/client/apiClient";
import { saveAuth } from "../../lib/client/authClient";
import { useTheme, type Colors } from "../../lib/client/ThemeContext";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { token, userId, email: userEmail } = await login(
        email.trim(),
        password,
      );
      saveAuth(token, userId, userEmail);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const s = makeStyles(colors);

  return (
    <div style={s.root}>
      <div style={s.content}>
        <button style={s.backBtn} onClick={() => router.back()}>
          ← Back
        </button>

        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Log in to your Food Logger account.</p>

        <div style={s.form}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            autoCapitalize="none"
            autoCorrect="off"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            type="password"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />

          {error && <div style={s.error}>{error}</div>}

          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <button style={s.linkBtn} onClick={() => router.replace("/signup")}>
            Don&apos;t have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

function makeStyles(colors: Colors): Record<string, CSSProperties> {
  return {
    root: {
      height: "100%",
      backgroundColor: colors.bg,
      overflowY: "auto",
    },
    content: { padding: 24, display: "flex", flexDirection: "column" },
    backBtn: {
      alignSelf: "flex-start",
      background: "none",
      border: "none",
      cursor: "pointer",
      marginTop: 16,
      marginBottom: 24,
      fontSize: 14,
      color: colors.carbsText,
    },
    title: {
      fontSize: 30,
      fontWeight: 700,
      color: colors.textPrimary,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 1.6,
      marginBottom: 32,
    },
    form: { display: "flex", flexDirection: "column", gap: 12 },
    label: {
      fontSize: 13,
      fontWeight: 500,
      color: colors.textPrimary,
      marginBottom: -4,
    },
    input: {
      border: `0.5px solid ${colors.inputBorder}`,
      borderRadius: 16,
      padding: 13,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
    },
    error: { fontSize: 13, color: colors.error },
    btn: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      borderRadius: 16,
      padding: 16,
      border: "none",
      cursor: "pointer",
      marginTop: 8,
      fontWeight: 600,
      fontSize: 15,
      boxShadow: "0 6px 16px rgba(16,24,40,0.18)",
    },
    btnDisabled: { opacity: 0.4, cursor: "default", boxShadow: "none" },
    linkBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 8,
      fontSize: 13,
      color: colors.carbsText,
    },
  };
}
