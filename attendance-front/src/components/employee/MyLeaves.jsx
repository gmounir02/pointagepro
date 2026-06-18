import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { CalendarDays, Plus, Trash2, Send, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function MyLeaves() {
  const { showNotification } = useNotification();
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [typeConge, setTypeConge] = useState("CONGE_PAYE");
  const [motif, setMotif] = useState("");

  const typesConge = [
    { value: "CONGE_PAYE", label: "Congé Payé" },
    { value: "CONGE_SANS_SOLDE", label: "Congé Sans Solde" },
    { value: "MALADIE", label: "Maladie" },
    { value: "MATERNITE", label: "Maternité" },
    { value: "PATERNITE", label: "Paternité" },
    { value: "EXCEPTIONNEL", label: "Congé Exceptionnel" },
  ];

  const fetchConges = async () => {
    try {
      const data = await api.conges.getMesConges();
      if (data) {
        // Sort descending
        const sorted = data.sort((a, b) => new Date(b.createdAt || b.dateDebut) - new Date(a.createdAt || a.dateDebut));
        setConges(sorted);
      }
    } catch (err) {
      showNotification("Impossible de charger les congés", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConges();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!dateDebut || !dateFin || !motif) {
      showNotification("Veuillez remplir tous les champs du formulaire", "danger");
      return;
    }

    if (new Date(dateFin) < new Date(dateDebut)) {
      showNotification("La date de fin doit être postérieure à la date de début", "danger");
      return;
    }

    setSubmitting(true);
    try {
      await api.conges.demander({
        dateDebut,
        dateFin,
        typeConge,
        motif,
      });

      showNotification("Votre demande de congé a été soumise avec succès !", "success");
      
      // Reset form
      setDateDebut("");
      setDateFin("");
      setTypeConge("CONGE_PAYE");
      setMotif("");
      
      // Reload list
      fetchConges();
    } catch (err) {
      showNotification(err.message || "Erreur lors de la soumission de la demande", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette demande de congé ?")) {
      return;
    }

    try {
      await api.conges.supprimer(id);
      showNotification("Demande de congé annulée", "success");
      fetchConges();
    } catch (err) {
      showNotification(err.message || "Impossible de supprimer cette demande", "danger");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "APPROUVE":
        return "badge-success";
      case "REFUSE":
        return "badge-danger";
      default:
        return "badge-warning";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "APPROUVE":
        return "Approuvé";
      case "REFUSE":
        return "Refusé";
      default:
        return "En attente";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROUVE":
        return <CheckCircle2 size={14} />;
      case "REFUSE":
        return <XCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <CalendarDays size={24} color="var(--primary)" />
        <h2 style={styles.title}>Gestion de Mes Congés</h2>
      </div>

      <div style={styles.grid}>
        {/* LEFT COLUMN: DEMAND FORM */}
        <div className="glass-card" style={styles.formCard}>
          <div style={styles.formHeader}>
            <Plus size={18} color="var(--primary)" />
            <h3 style={styles.formTitle}>Nouvelle Demande</h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div className="input-group">
                <label className="input-label">Date de Début</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Date de Fin</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Type de Congé</label>
              <select
                className="form-input"
                style={{ background: "#1a1d2b" }}
                value={typeConge}
                onChange={(e) => setTypeConge(e.target.value)}
                disabled={submitting}
              >
                {typesConge.map((t) => (
                  <option key={t.value} value={t.value} style={{ background: "#1a1d2b" }}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Motif / Justification</label>
              <textarea
                className="form-input"
                style={{ ...styles.textarea, minHeight: "100px" }}
                placeholder="Décrivez brièvement la raison de votre demande..."
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={submitting}
            >
              <Send size={16} />
              {submitting ? "Soumission..." : "Envoyer la Demande"}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: HISTORY LIST */}
        <div className="glass-card" style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.listTitle}>Mes Demandes Soumises</h3>
            <span style={styles.countBadge}>{conges.length} au total</span>
          </div>

          {loading ? (
            <div style={styles.loaderContainer}>
              <div style={styles.spinner}></div>
            </div>
          ) : conges.length === 0 ? (
            <div style={styles.emptyContainer}>
              <p style={styles.emptyText}>Aucune demande de congé enregistrée.</p>
            </div>
          ) : (
            <div style={styles.scrollList}>
              {conges.map((c) => (
                <div key={c.id} style={styles.congeItem}>
                  <div style={styles.congeMeta}>
                    <div style={styles.congeType}>
                      {typesConge.find((t) => t.value === c.typeConge)?.label || c.typeConge}
                    </div>
                    
                    <span className={`badge ${getStatusBadgeClass(c.statut)}`} style={styles.badgeGap}>
                      {getStatusIcon(c.statut)}
                      {getStatusText(c.statut)}
                    </span>
                  </div>

                  <div style={styles.congeDates}>
                    📅 Du <strong>{c.dateDebut}</strong> au <strong>{c.dateFin}</strong>
                  </div>

                  <div style={styles.congeMotif}>
                    &ldquo;{c.motif}&rdquo;
                  </div>

                  {c.commentaireAdmin && (
                    <div style={styles.adminComment}>
                      <strong>Réponse Admin :</strong> {c.commentaireAdmin}
                    </div>
                  )}

                  {c.statut === "EN_ATTENTE" && (
                    <div style={styles.congeActions}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 size={12} />
                        Annuler la demande
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
    gridTemplateColumns: "1fr 1fr",
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
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px",
  },
  formTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#fff",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  textarea: {
    fontFamily: "var(--font-sans)",
    resize: "vertical",
  },
  submitBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "16px",
  },
  listCard: {
    padding: "30px",
    background: "rgba(18, 20, 29, 0.5)",
    maxHeight: "680px",
    display: "flex",
    flexDirection: "column",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px",
  },
  listTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#fff",
  },
  countBadge: {
    fontSize: "0.75rem",
    background: "rgba(139, 92, 246, 0.15)",
    color: "var(--primary-hover)",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "600",
  },
  scrollList: {
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingRight: "6px",
  },
  congeItem: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  congeMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  congeType: {
    fontWeight: "600",
    color: "#fff",
    fontSize: "0.9rem",
  },
  badgeGap: {
    gap: "4px",
  },
  congeDates: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  congeMotif: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontStyle: "italic",
    background: "rgba(0, 0, 0, 0.1)",
    padding: "8px 12px",
    borderRadius: "6px",
    marginTop: "4px",
  },
  adminComment: {
    fontSize: "0.8rem",
    color: "#fff",
    background: "rgba(139, 92, 246, 0.05)",
    borderLeft: "2px solid var(--primary)",
    padding: "8px 12px",
    borderRadius: "0 6px 6px 0",
    marginTop: "4px",
  },
  congeActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  deleteBtn: {
    padding: "6px 12px",
    fontSize: "0.75rem",
    borderRadius: "6px",
    background: "rgba(244, 63, 94, 0.05)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    color: "var(--danger)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  loaderContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "40px 0",
  },
  spinner: {
    width: "30px",
    height: "30px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  emptyContainer: {
    padding: "40px 0",
    textAlign: "center",
  },
  emptyText: {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  }
};

// Add responsive rules simulation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @media (max-width: 768px) {
      div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
