import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { Calendar, Clock, AlertTriangle, CheckCircle, Coffee, Compass } from "lucide-react";

export default function MyHistory() {
  const { showNotification } = useNotification();
  const [pointages, setPointages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Justification Form States
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [selectedPointage, setSelectedPointage] = useState(null);
  const [motif, setMotif] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB just to be safe with Base64)
    if (file.size > 5 * 1024 * 1024) {
      showNotification("Le fichier est trop volumineux (maximum 5Mo)", "warning");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleJustifySubmit = async (e) => {
    e.preventDefault();
    if (!motif.trim()) {
      showNotification("Veuillez saisir un motif", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await api.pointages.justifier(selectedPointage.id, motif, fileBase64);
      showNotification("Justification transmise pour modération !", "success");
      // Local state update
      setPointages(pointages.map(p => 
        p.id === selectedPointage.id 
          ? { ...p, statutJustification: "EN_ATTENTE", justificationMotif: motif, justificatifFichier: fileBase64 } 
          : p
      ));
      setShowJustifyModal(false);
      setMotif("");
      setFileBase64("");
      setSelectedPointage(null);
    } catch (err) {
      showNotification(err.message || "Impossible de soumettre la justification", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.pointages.getMesPointages();
        if (data) {
          // Sort by date descending
          const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
          setPointages(sorted);
        }
      } catch (err) {
        showNotification(err.message || "Impossible de charger l'historique", "danger");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return "--:--";
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const uniqueMonths = Array.from(new Set(pointages.map(p => p.date.substring(0, 7)))).sort().reverse();
  const filteredPointages = pointages.filter(p => {
    const matchesMonth = selectedMonthFilter === "all" || p.date.startsWith(selectedMonthFilter);
    const matchesDay = !selectedDayFilter || p.date === selectedDayFilter;
    return matchesMonth && matchesDay;
  });

  return (
    <div style={styles.container}>
      <div style={{ ...styles.header, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Clock size={24} color="var(--primary)" />
          <h2 style={styles.title}>Mon Historique de Présence</h2>
        </div>
        {pointages.length > 0 && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="date"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "0.75rem",
                outline: "none",
                cursor: "pointer",
                colorScheme: "dark"
              }}
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
            />
            {selectedDayFilter && (
              <button
                type="button"
                style={{
                  background: "rgba(244, 63, 94, 0.15)",
                  color: "var(--danger)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "0.75rem",
                  cursor: "pointer"
                }}
                onClick={() => setSelectedDayFilter("")}
              >
                ✕ Effacer
              </button>
            )}
            <select
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.75rem",
                outline: "none",
                cursor: "pointer"
              }}
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
            >
              <option value="all" style={{ background: "#12141d" }}>Tous les mois</option>
              {uniqueMonths.map(ym => (
                <option key={ym} value={ym} style={{ background: "#12141d" }}>
                  {new Date(ym + "-02").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>Chargement de vos pointages...</p>
        </div>
      ) : pointages.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <Coffee size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
          <h3>Aucun pointage enregistré</h3>
          <p style={styles.emptyText}>
            Vous n'avez pas encore effectué de pointage d'arrivée ou de départ. Commencez à pointer dès aujourd'hui !
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {/* Desktop view: Table */}
          <div className="glass-card table-container" style={styles.desktopTable}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Arrivée (Entrée)</th>
                  <th>Départ (Sortie)</th>
                  <th>Statut</th>
                  <th>Durée</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPointages.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: "600", textTransform: "capitalize" }}>
                      {formatDate(p.date)}
                    </td>
                    <td>
                      <div style={styles.timeCell}>
                        <Clock size={14} color={p.type === "ABSENCE" ? "var(--text-muted)" : "var(--success)"} />
                        <span>{p.type === "ABSENCE" ? "--:--" : formatTime(p.heureEntree)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={styles.timeCell}>
                        <Clock size={14} color={p.type === "ABSENCE" ? "var(--text-muted)" : (p.heureSortie ? "var(--primary)" : "var(--text-muted)")} />
                        <span>{p.type === "ABSENCE" ? "--:--" : formatTime(p.heureSortie)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                        {p.type === "ABSENCE" ? (
                          <>
                            {p.statutJustification === "EN_ATTENTE" ? (
                              <span className="badge" style={{ ...styles.badge, background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                                Absence - Justification en attente
                              </span>
                            ) : p.statutJustification === "APPROUVEE" ? (
                              <span className="badge badge-success" style={styles.badge}>
                                <CheckCircle size={12} />
                                Absence Justifiée
                              </span>
                            ) : p.statutJustification === "REJETEE" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span className="badge badge-danger" style={styles.badge}>
                                  Absence (Justification rejetée)
                                </span>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", borderRadius: "4px", cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedPointage(p);
                                    setShowJustifyModal(true);
                                  }}
                                >
                                  Réessayer
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span className="badge badge-danger" style={styles.badge}>
                                  Absent
                                </span>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: "5px", background: "var(--primary)", border: "none", color: "#fff", cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedPointage(p);
                                    setShowJustifyModal(true);
                                  }}
                                >
                                  Justifier
                                </button>
                              </div>
                            )}
                          </>
                        ) : p.enRetard ? (
                          <>
                            {p.statutJustification === "EN_ATTENTE" ? (
                              <span className="badge" style={{ ...styles.badge, background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                                En attente
                              </span>
                            ) : p.statutJustification === "REJETEE" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span className="badge badge-danger" style={styles.badge}>
                                  Retard (Rejeté)
                                </span>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", borderRadius: "4px", cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedPointage(p);
                                    setShowJustifyModal(true);
                                  }}
                                >
                                  Réessayer
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span className="badge badge-warning" style={styles.badge}>
                                  <AlertTriangle size={12} />
                                  En Retard
                                </span>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: "5px", background: "var(--primary)", border: "none", color: "#fff", cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedPointage(p);
                                    setShowJustifyModal(true);
                                  }}
                                >
                                  Justifier
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="badge badge-success" style={styles.badge}>
                            <CheckCircle size={12} />
                            {p.note && p.note.includes("Retard justifié") ? "À temps (Justifié)" : "À temps"}
                          </span>
                        )}

                        {p.sortieAnticipee && (
                          <span className="badge" style={{ ...styles.badge, background: "rgba(244, 63, 94, 0.15)", color: "var(--danger)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
                            Sortie Anticipée
                          </span>
                        )}
                        
                        {p.heuresInsuffisantes && p.type !== "ABSENCE" && (
                          <span className="badge" style={{ ...styles.badge, background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                            Heures &lt; 8h
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: "500", color: "#fff" }}>
                      {p.type === "ABSENCE" ? "-" : formatDuration(p.dureeMinutes)}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {p.note || <span style={{ color: "var(--text-muted)" }}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view: Card stack */}
          <div style={styles.mobileList}>
            {filteredPointages.map((p) => (
              <div key={p.id} className="glass-card" style={styles.mobileCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardDate}>{formatDate(p.date)}</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    {p.type === "ABSENCE" ? (
                      <>
                        {p.statutJustification === "APPROUVEE" ? (
                          <span className="badge badge-success">Absence Justifiée</span>
                        ) : p.statutJustification === "EN_ATTENTE" ? (
                          <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>Justification en attente</span>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className="badge badge-danger">Absent</span>
                            {p.statutJustification !== "REJETEE" ? (
                              <button
                                style={{ padding: "3px 6px", fontSize: "0.65rem", background: "var(--primary)", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer" }}
                                onClick={() => { setSelectedPointage(p); setShowJustifyModal(true); }}
                              >Justifier</button>
                            ) : (
                              <button
                                style={{ padding: "3px 6px", fontSize: "0.65rem", background: "var(--primary)", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer" }}
                                onClick={() => { setSelectedPointage(p); setShowJustifyModal(true); }}
                              >Réessayer</button>
                            )}
                          </div>
                        )}
                      </>
                    ) : p.enRetard ? (
                      <>
                        {p.statutJustification === "EN_ATTENTE" ? (
                          <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>En attente</span>
                        ) : p.statutJustification === "REJETEE" ? (
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <span className="badge badge-danger">Rejeté</span>
                            <button
                              style={{ padding: "3px 6px", fontSize: "0.65rem", background: "var(--primary)", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer" }}
                              onClick={() => { setSelectedPointage(p); setShowJustifyModal(true); }}
                            >Réessayer</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className="badge badge-warning">En Retard</span>
                            <button
                              style={{ padding: "3px 6px", fontSize: "0.65rem", background: "var(--primary)", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer" }}
                              onClick={() => { setSelectedPointage(p); setShowJustifyModal(true); }}
                            >Justifier</button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="badge badge-success">
                        {p.note && p.note.includes("Retard justifié") ? "À temps (Justifié)" : "À temps"}
                      </span>
                    )}

                    {p.sortieAnticipee && (
                      <span className="badge" style={{ background: "rgba(244, 63, 94, 0.15)", color: "var(--danger)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                        Sortie Anticipée
                      </span>
                    )}
                    
                    {p.heuresInsuffisantes && p.type !== "ABSENCE" && (
                      <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                        Heures &lt; 8h
                      </span>
                    )}
                  </div>
                </div>

                <div style={styles.cardGrid}>
                  <div style={styles.cardCol}>
                    <div style={styles.cardLabel}>Arrivée</div>
                    <div style={styles.cardVal} className="success-text">
                      {p.type === "ABSENCE" ? "--:--" : formatTime(p.heureEntree)}
                    </div>
                  </div>

                  <div style={styles.cardCol}>
                    <div style={styles.cardLabel}>Départ</div>
                    <div style={styles.cardVal}>
                      {p.type === "ABSENCE" ? "--:--" : (p.heureSortie ? formatTime(p.heureSortie) : "Non pointé")}
                    </div>
                  </div>

                  <div style={styles.cardCol}>
                    <div style={styles.cardLabel}>Durée de présence</div>
                    <div style={{ ...styles.cardVal, color: "#fff", fontWeight: "600" }}>
                      {p.type === "ABSENCE" ? "-" : formatDuration(p.dureeMinutes)}
                    </div>
                  </div>
                </div>

                {p.note && (
                  <div style={styles.cardNote}>
                    <strong>Note :</strong> {p.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📝 MODAL DE SOUMISSION DE JUSTIFICATION */}
      {showJustifyModal && selectedPointage && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="glass-card" style={{
            width: "100%",
            maxWidth: "480px",
            padding: "28px",
            background: "rgba(18, 20, 29, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            borderRadius: "16px",
            animation: "fadeIn 0.2s ease"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              {selectedPointage.type === "ABSENCE" ? "Justifier mon Absence" : "Justifier mon Retard"}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "10px 0 20px 0" }}>
              {selectedPointage.type === "ABSENCE"
                ? <>Absence du <strong>{formatDate(selectedPointage.date)}</strong>.</>
                : <>Pointage du <strong>{formatDate(selectedPointage.date)}</strong> à <strong>{formatTime(selectedPointage.heureEntree)}</strong>.</>
              }
            </p>

            <form onSubmit={handleJustifySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "600" }}>
                  {selectedPointage.type === "ABSENCE" ? "Motif de l'absence *" : "Motif du retard *"}
                </label>
                <textarea
                  className="input-field"
                  rows="4"
                  placeholder="Saisissez une explication claire (ex: Panne de voiture, train supprimé, rendez-vous médical...)"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: "0.9rem",
                    resize: "none"
                  }}
                ></textarea>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "600" }}>
                  Document justificatif (Optionnel, max 5Mo)
                </label>
                <div style={{
                  position: "relative",
                  background: "rgba(255,255,255,0.02)",
                  border: "2px dashed rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer"
                }}>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer"
                    }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {fileBase64 ? "✅ Fichier sélectionné !" : "📁 Cliquez pour uploader un document ou une photo"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowJustifyModal(false);
                    setSelectedPointage(null);
                    setMotif("");
                    setFileBase64("");
                  }}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? "Transmission..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
  },
  loaderText: {
    marginTop: "16px",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
  },
  emptyCard: {
    padding: "60px 20px",
    textAlign: "center",
    background: "rgba(18, 20, 29, 0.4)",
  },
  emptyText: {
    maxWidth: "400px",
    margin: "12px auto 0 auto",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    lineHeight: "1.6",
  },
  list: {
    width: "100%",
  },
  desktopTable: {
    background: "rgba(18, 20, 29, 0.4)",
    padding: "8px",
    borderRadius: "14px",
  },
  timeCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "500",
    color: "#fff",
  },
  badge: {
    gap: "6px",
  },
  mobileList: {
    display: "none",
    flexDirection: "column",
    gap: "16px",
  },
  mobileCard: {
    padding: "20px",
    background: "rgba(18, 20, 29, 0.5)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px",
    marginBottom: "12px",
  },
  cardDate: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
    textTransform: "capitalize",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  cardCol: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  cardLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  cardVal: {
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  cardNote: {
    marginTop: "12px",
    padding: "10px",
    background: "rgba(0, 0, 0, 0.15)",
    borderRadius: "6px",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    borderLeft: "2px solid var(--primary)",
  }
};

// Add responsive rules simulation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @media (max-width: 768px) {
      .sidebar-desktop {
        display: none !important;
      }
      div[style*="display: none"][class*="mobileList"] {
        display: flex !important;
      }
      div[class*="desktopTable"] {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}
