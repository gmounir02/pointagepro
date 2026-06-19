const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? `http://${window.location.hostname}:8082/api`
  : `https://pointagepro-ml6w.onrender.com/api`;

/**
 * Common request wrapper to inject headers and handle JSON responses
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if token expired or invalid (403 or 401)
    if (response.status === 401 || response.status === 403) {
      // If we are logged in, clear token and redirect to login
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-change"));
      }
    }

    const contentType = response.headers.get("content-type");
    let result = {};
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    }

    if (!response.ok) {
      throw new Error(result.message || `Erreur serveur (code: ${response.status})`);
    }

    // Spring Boot response structure uses ApiResponse wrapper: { success, message, data }
    if (result.success === false) {
      throw new Error(result.message || "Une erreur est survenue");
    }

    return result.data !== undefined ? result.data : result;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Authentication
  auth: {
    login: async (email, password) => {
      const data = await request("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify({
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          roles: data.roles,
        }));
        window.dispatchEvent(new Event("auth-change"));
      }
      return data;
    },
    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-change"));
    },
    getCurrentUser: () => {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    },
    isAuthenticated: () => {
      return !!localStorage.getItem("token");
    }
  },

  // Users / Employees
  users: {
    getProfile: () => request("/users/me"),
    getAll: () => request("/users"),
    getById: (id) => request(`/users/${id}`),
    create: (data) => request("/users", { method: "POST", body: data }),
    update: (id, data) => request(`/users/${id}`, { method: "PUT", body: data }),
    delete: (id) => request(`/users/${id}`, { method: "DELETE" }),
    toggleStatus: (id) => request(`/users/${id}/toggle-status`, { method: "PATCH" }),
  },

  // Pointages (Attendance)
  pointages: {
    pointer: (data) => request("/pointages", { method: "POST", body: data }),
    getMesPointages: () => request("/pointages/mes-pointages"),
    getByDate: (dateString) => request(`/pointages/date/${dateString}`),
    getByUser: (userId) => request(`/pointages/user/${userId}`),
    getByUserAndPeriode: (userId, debutString, finString) => 
      request(`/pointages/user/${userId}/periode?debut=${debutString}&fin=${finString}`),
    justifier: (id, motif, fichierBase64) =>
      request(`/pointages/${id}/justifier`, { method: "POST", body: { motif, fichierBase64 } }),
    evaluerJustification: (id, statut) =>
      request(`/pointages/${id}/evaluer-justification`, { method: "PATCH", body: { statut } }),
    getJustificationsEnAttente: () =>
      request("/pointages/justifications/en-attente"),
    genererAbsences: (date) => 
      request(`/pointages/generer-absences${date ? `?date=${date}` : ""}`, { method: "POST" }),
    adminModifier: (id, data) =>
      request(`/pointages/${id}/admin-modifier`, { method: "PATCH", body: data }),
  },

  // Congés (Leave requests)
  conges: {
    demander: (data) => request("/conges", { method: "POST", body: data }),
    getMesConges: () => request("/conges/mes-conges"),
    supprimer: (id) => request(`/conges/${id}`, { method: "DELETE" }),
    getAll: () => request("/conges"),
    getEnAttente: () => request("/conges/en-attente"),
    getById: (id) => request(`/conges/${id}`),
    approuver: (id, commentaire) => request(`/conges/${id}/approuver`, { 
      method: "PATCH", 
      body: commentaire ? { commentaire } : {} 
    }),
    refuser: (id, commentaire) => request(`/conges/${id}/refuser`, { 
      method: "PATCH", 
      body: commentaire ? { commentaire } : {} 
    }),
  },

  // Enterprise configuration
  config: {
    get: () => request("/config"),
    save: (data) => request("/config", { method: "POST", body: data }),
    update: (data) => request("/config", { method: "PUT", body: data }),
  },

  // QR Codes
  qrcodes: {
    generer: (validiteMinutes, description) => request("/qrcodes/generate", {
      method: "POST",
      body: { validiteMinutes, description },
    }),
    getActifs: () => request("/qrcodes/actifs"),
    getHistorique: () => request("/qrcodes/historique"),
    getById: (id) => request(`/qrcodes/${id}`),
    verify: (code) => request("/qrcodes/verify", {
      method: "POST",
      body: { code },
    }),
  },

  // Dashboard Stats
  dashboard: {
    getStats: () => request("/dashboard"),
  },

  // Notifications
  notifications: {
    getAll: () => request("/notifications"),
    markAsRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllAsRead: () => request("/notifications/read-all", { method: "PATCH" }),
  }
};
