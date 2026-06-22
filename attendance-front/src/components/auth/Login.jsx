import React, { useState } from "react";
import { useAuth } from "../../context/GlobalContext";
import { Mail, Lock, ShieldAlert, Fingerprint } from "lucide-react";

export default function Login() {
  const { login, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Email ou mot de passe incorrect");
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated Glowing Orb inside login container */}
      <div style={styles.orb}></div>
      <div style={styles.orb2}></div>

      <div className="glass-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src="/favicon.svg" alt="Logo" style={{ width: "44px", height: "44px" }} />
          </div>
          <h2 style={styles.title}>ATTENDANCE</h2>
          <p style={styles.subtitle}>Système Intelligent de Gestion de Présence</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={18} color="var(--danger)" />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">
              Adresse Email
            </label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={styles.inputPadding}
                placeholder="nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={authLoading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Mot de passe
            </label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                className="form-input"
                style={styles.inputPadding}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={authLoading}
          >
            {authLoading ? (
              <span style={styles.spinner}></span>
            ) : (
              "Se Connecter"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    padding: "20px",
    background: "#07080c",
    position: "fixed",
    top: 0,
    left: 0,
    overflow: "hidden",
    zIndex: 1000,
  },
  orb: {
    position: "absolute",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)",
    top: "15%",
    left: "25%",
    filter: "blur(40px)",
    animation: "float 6s ease-in-out infinite alternate",
    pointerEvents: "none",
  },
  orb2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
    bottom: "15%",
    right: "20%",
    filter: "blur(45px)",
    animation: "float2 8s ease-in-out infinite alternate-reverse",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    padding: "40px",
    borderRadius: "20px",
    background: "rgba(18, 20, 29, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    textAlign: "center",
    zIndex: 10,
    animation: "fadeInUp 0.6s ease-out",
  },
  header: {
    marginBottom: "32px",
  },
  logoContainer: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "72px",
    height: "72px",
    borderRadius: "18px",
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    marginBottom: "16px",
    boxShadow: "0 0 20px rgba(139, 92, 246, 0.15)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "800",
    color: "#fff",
    letterSpacing: "0.05em",
    fontFamily: "var(--font-heading)",
    marginBottom: "6px",
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    borderRadius: "8px",
    marginBottom: "24px",
    textAlign: "left",
  },
  errorText: {
    fontSize: "0.85rem",
    color: "#fca5a5",
    fontWeight: "500",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
  },
  inputPadding: {
    paddingLeft: "44px",
  },
  submitBtn: {
    marginTop: "12px",
    padding: "14px",
    fontSize: "1rem",
    borderRadius: "10px",
  },
  footer: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  },
  footerText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    lineHeight: "1.5",
  },
  spinner: {
    display: "inline-block",
    width: "20px",
    height: "20px",
    border: "2.5px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "50%",
    borderTopColor: "#fff",
    animation: "spin 1s ease infinite",
  }
};
