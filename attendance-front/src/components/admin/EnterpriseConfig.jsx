import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { Settings, Save, MapPin, Compass, Clock, Building, Sparkles, LogOut } from "lucide-react";
import { useAuth } from "../../context/GlobalContext";

export default function EnterpriseConfig() {
  const { showNotification } = useNotification();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Form State
  const [id, setId] = useState(null); // MongoDB config ID
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [rayonMetres, setRayonMetres] = useState("");
  const [heureDebutTravail, setHeureDebutTravail] = useState("");
  const [heureFinTravail, setHeureFinTravail] = useState("");
  const [toleranceRetardMinutes, setToleranceRetardMinutes] = useState("");

  const fetchConfig = async () => {
    try {
      const config = await api.config.get();
      if (config) {
        setId(config.id);
        setNomEntreprise(config.nomEntreprise || "");
        setLatitude(config.latitude || "");
        setLongitude(config.longitude || "");
        setRayonMetres(config.rayonMetres || "");
        setHeureDebutTravail(config.heureDebutTravail || "");
        setHeureFinTravail(config.heureFinTravail || "");
        setToleranceRetardMinutes(config.toleranceRetardMinutes || "");
      }
    } catch (err) {
      showNotification("Création d'une nouvelle configuration par défaut", "info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleGrabGps = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      showNotification("La géolocalisation n'est pas supportée par votre navigateur", "danger");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setGpsLoading(false);
        showNotification("Position actuelle capturée avec succès !", "success");
      },
      (error) => {
        console.error("GPS grab error:", error);
        setGpsLoading(false);
        showNotification("Impossible de récupérer la position GPS actuelle", "danger");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nomEntreprise || !latitude || !longitude || !rayonMetres || !heureDebutTravail || !heureFinTravail) {
      showNotification("Veuillez remplir tous les champs obligatoires", "danger");
      return;
    }

    const payload = {
      nomEntreprise,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      rayonMetres: parseInt(rayonMetres),
      heureDebutTravail,
      heureFinTravail,
      toleranceRetardMinutes: parseInt(toleranceRetardMinutes || 0),
    };

    setSaving(true);
    try {
      if (id) {
        // Edit existing
        await api.config.update({ ...payload, id });
      } else {
        // Create new
        await api.config.save(payload);
      }
      showNotification("Paramètres de l'entreprise enregistrés avec succès !", "success");
      fetchConfig();
    } catch (err) {
      showNotification(err.message || "Erreur de sauvegarde", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Settings size={24} color="var(--primary)" />
        <h2 style={styles.title}>Configuration de l'Entreprise</h2>
      </div>

      <div style={styles.grid}>
        {/* LEFT COLUMN: PARAMETERS FORM */}
        <div className="glass-card" style={styles.formCard}>
          <div style={styles.formHeader}>
            <Sparkles size={18} color="var(--primary)" />
            <h3 style={styles.formTitle}>Paramètres Généraux</h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Nom de l'Entreprise / Siège *</label>
              <div style={styles.inputWrapper}>
                <Building size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "44px" }}
                  placeholder="Ex: Siège Social Casablanca"
                  value={nomEntreprise}
                  onChange={(e) => setNomEntreprise(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* GPS COORDINATES GEOFENCE */}
            <div style={styles.geoBox}>
              <div style={styles.geoBoxHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={16} color="var(--primary)" />
                  <span style={styles.geoBoxTitle}>Clôture Géographique (Geofencing)</span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={styles.grabBtn}
                  onClick={handleGrabGps}
                  disabled={gpsLoading}
                >
                  <Compass size={14} className={gpsLoading ? "animate-spin-slow" : ""} />
                  Capturer ma position
                </button>
              </div>

              <div style={styles.formRow}>
                <div className="input-group" style={{ marginBottom: "0" }}>
                  <label className="input-label">Latitude du centre *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="33.5731"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: "0" }}>
                  <label className="input-label">Longitude du centre *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="-7.5898"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginTop: "16px", marginBottom: "0" }}>
                <label className="input-label">Rayon de tolérance de présence (Mètres) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Ex: 100"
                  value={rayonMetres}
                  onChange={(e) => setRayonMetres(e.target.value)}
                  disabled={saving}
                />
                <span style={styles.helperText}>
                  Les employés doivent pointer dans ce périmètre pour valider leur présence.
                </span>
              </div>
            </div>

            {/* WORKING HOUR RULES */}
            <div style={styles.timeBox}>
              <div style={styles.geoBoxHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={16} color="var(--primary)" />
                  <span style={styles.geoBoxTitle}>Horaires de Travail</span>
                </div>
              </div>

              <div style={{ ...styles.formRow, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                <div className="input-group" style={{ marginBottom: "0" }}>
                  <label className="input-label">Heure d'Arrivée *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 08:30"
                    value={heureDebutTravail}
                    onChange={(e) => setHeureDebutTravail(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: "0" }}>
                  <label className="input-label">Heure de Départ *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 17:30"
                    value={heureFinTravail}
                    onChange={(e) => setHeureFinTravail(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: "0" }}>
                  <label className="input-label">Tolérance (Minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ex: 15"
                    value={toleranceRetardMinutes}
                    onChange={(e) => setToleranceRetardMinutes(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <span style={{ ...styles.helperText, marginTop: "10px", display: "block" }}>
                Format HH:MM. Les retards de pointage d'arrivée sont validés par rapport à l'heure d'arrivée plus la marge de tolérance.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Sauvegarde..." : "Sauvegarder les Paramètres"}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: INFORMATION SUMMARY */}
        <div style={styles.rightCol}>



          <div className="glass-card config-logout-card" style={{ ...styles.helpCard, borderColor: "rgba(244, 63, 94, 0.15)", background: "rgba(244, 63, 94, 0.01)" }}>
            <h3 style={{ ...styles.helpTitle, borderBottomColor: "rgba(244, 63, 94, 0.1)" }}>Gestion de Session</h3>
            <p style={styles.helpDesc}>
              Vous êtes connecté en tant qu'administrateur.
            </p>
            <button 
              onClick={logout} 
              className="btn btn-danger" 
              style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "8px", 
                padding: "12px", 
                fontWeight: "600",
                borderRadius: "10px"
              }}
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#fff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "24px",
    alignItems: "start",
  },
  formCard: {
    padding: "30px",
    background: "rgba(18, 20, 29, 0.5)",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px",
  },
  formTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#fff",
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
  geoBox: {
    background: "rgba(255, 255, 255, 0.01)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "20px",
  },
  geoBoxHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "10px",
  },
  geoBoxTitle: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#fff",
  },
  grabBtn: {
    padding: "6px 12px",
    fontSize: "0.75rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  helperText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    marginTop: "6px",
  },
  timeBox: {
    background: "rgba(255, 255, 255, 0.01)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "1rem",
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  helpCard: {
    padding: "28px",
    background: "rgba(139, 92, 246, 0.02)",
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  helpTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#fff",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px",
    marginBottom: "16px",
  },
  helpDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
    marginBottom: "14px",
  },
  tipBlock: {
    fontSize: "0.8rem",
    background: "rgba(245, 158, 11, 0.04)",
    borderLeft: "2px solid var(--warning)",
    padding: "12px 16px",
    borderRadius: "0 8px 8px 0",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    marginTop: "16px",
  },
  loaderContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "60px 0",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  }
};

// Add responsive rules simulation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    .config-logout-card {
      display: block !important;
    }
    @media (min-width: 769px) {
      .config-logout-card {
        display: none !important;
      }
    }
    @media (max-width: 768px) {
      div[style*="grid-template-columns: 1.2fr 0.8fr"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
