import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { CheckCircle2, AlertOctagon, AlertTriangle, Info } from "lucide-react";

const AuthContext = createContext(null);
const NotificationContext = createContext(null);

export function GlobalProvider({ children }) {
  // --- AUTH STATE ---
  const [user, setUser] = useState(api.auth.getCurrentUser());
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(api.auth.getCurrentUser());
    };

    window.addEventListener("auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const data = await api.auth.login(email, password);
      showNotification("Connexion réussie", "success");
      return data;
    } catch (error) {
      showNotification(error.message || "Échec de la connexion", "danger");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    showNotification("Déconnexion réussie", "info");
  };

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    }, 4000);
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout }}>
      <NotificationContext.Provider value={{ showNotification }}>
        {children}

        {/* Floating Notification Portal */}
        <div style={styles.toastContainer}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`alert-toast glass-card`}
              style={{
                ...styles.toast,
                borderLeft: `5px solid var(--${notif.type || "info"})`,
              }}
              onClick={() => dismissNotification(notif.id)}
            >
              <div style={styles.iconContainer}>
                {notif.type === "success" && <CheckCircle2 size={18} color="var(--success)" />}
                {notif.type === "danger" && <AlertOctagon size={18} color="var(--danger)" />}
                {notif.type === "warning" && <AlertTriangle size={18} color="var(--warning)" />}
                {notif.type === "info" && <Info size={18} color="var(--info)" />}
              </div>
              <div style={styles.message}>{notif.message}</div>
              <button style={styles.closeBtn}>×</button>
            </div>
          ))}
        </div>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
}

// Custom hooks to easily consume contexts
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a GlobalProvider");
  }
  return context;
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a GlobalProvider");
  }
  return context;
}

const styles = {
  toastContainer: {
    position: "fixed",
    top: "24px",
    right: "24px",
    zIndex: 99999,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "380px",
    width: "100%",
    pointerEvents: "none",
  },
  toast: {
    pointerEvents: "auto",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 20px",
    background: "rgba(20, 22, 33, 0.95)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
    borderRadius: "10px",
    transition: "all 0.3s ease",
  },
  iconContainer: {
    fontSize: "1.2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "#fff",
    lineHeight: "1.4",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0 4px",
  }
};
