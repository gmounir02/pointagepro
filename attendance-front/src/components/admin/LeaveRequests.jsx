import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { CalendarDays, CheckCircle, XCircle, Clock, MessageSquare, Info, ShieldAlert, Sparkles } from "lucide-react";

export default function LeaveRequests() {
  const { showNotification } = useNotification();
  const [requests, setRequests] = useState([]);
  const [pendingOnly, setPendingOnly] = useState(true); // true = pending, false = history
  const [loading, setLoading] = useState(true);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    requestId: null,
    isApprove: true,
    employeeName: "",
  });
  const [commentaire, setCommentaire] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Load all or pending based on filter
      const data = pendingOnly ? await api.conges.getEnAttente() : await api.conges.getAll();
      if (data) {
        // Sort descending by date
        const sorted = data.sort((a, b) => new Date(b.createdAt || b.dateDebut) - new Date(a.createdAt || a.dateDebut));
        setRequests(sorted);
      }
    } catch (err) {
      showNotification("Impossible de récupérer les demandes de congés", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [pendingOnly]);

  const openDecisionModal = (requestId, employeeName, isApprove) => {
    setCommentaire("");
    setDecisionModal({
      isOpen: true,
      requestId,
      isApprove,
      employeeName,
    });
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();

    const { requestId, isApprove } = decisionModal;
    setProcessing(true);

    try {
      if (isApprove) {
        await api.conges.approuver(requestId, commentaire);
        showNotification("La demande de congé a été approuvée", "success");
      } else {
        await api.conges.refuser(requestId, commentaire);
        showNotification("La demande de congé a été refusée", "warning");
      }
      setDecisionModal({ isOpen: false, requestId: null, isApprove: true, employeeName: "" });
      fetchRequests();
    } catch (err) {
      showNotification(err.message || "Erreur de traitement de la demande", "danger");
    } finally {
      setProcessing(false);
    }
  };

  const typesConge = {
    CONGE_PAYE: "Congé Payé",
    CONGE_SANS_SOLDE: "Congé Sans Solde",
    MALADIE: "Maladie",
    MATERNITE: "Maternité",
    PATERNITE: "Paternité",
    EXCEPTIONNEL: "Congé Exceptionnel",
  };

  const formatDays = (d1, d2) => {
    const diffTime = Math.abs(new Date(d2) - new Date(d1));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} jour(s)`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <CalendarDays size={24} color="var(--primary)" />
          <h2 style={styles.title}>Modération des Demandes de Congés</h2>
        </div>

        {/* Pending vs History Switcher */}
        <div style={styles.tabSwitcher}>
          <button
            style={{
              ...styles.tabBtn,
              ...(pendingOnly ? styles.tabBtnActive : {}),
            }}
            onClick={() => setPendingOnly(true)}
          >
            📋 En Attente
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(!pendingOnly ? styles.tabBtnActive : {}),
            }}
            onClick={() => setPendingOnly(false)}
          >
            📜 Historique Complet
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <Sparkles size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <h3>Aucune demande à traiter</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            {pendingOnly 
              ? "Toutes les demandes de congés ont été traitées. Bon travail !" 
              : "Aucune demande de congé enregistrée dans l'historique."}
          </p>
        </div>
      ) : (
        <div style={styles.listStack}>
          {requests.map((r) => (
            <div key={r.id} className="glass-card" style={styles.requestCard}>
              <div style={styles.cardHeader}>
                <div style={styles.employeeArea}>
                  <div style={styles.empAvatar}>
                    {r.userFullName?.charAt(0) || "E"}
                  </div>
                  <div>
                    <h4 style={styles.empName}>{r.userFullName}</h4>
                    <span style={styles.empSub}>ID Employé: {r.userId}</span>
                  </div>
                </div>

                <div style={styles.metaBadgeRow}>
                  <span className="badge badge-info" style={{ textTransform: "none" }}>
                    {typesConge[r.typeConge] || r.typeConge}
                  </span>
                  
                  {r.statut !== "EN_ATTENTE" && (
                    <span className={`badge ${r.statut === "APPROUVE" ? "badge-success" : "badge-danger"}`}>
                      {r.statut === "APPROUVE" ? "Approuvé" : "Refusé"}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.cardContent}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Période :</span>
                  <span style={styles.detailVal}>
                    Du <strong>{formatDate(r.dateDebut)}</strong> au <strong>{formatDate(r.dateFin)}</strong>
                    <span style={styles.daysTag}>{formatDays(r.dateDebut, r.dateFin)}</span>
                  </span>
                </div>

                <div style={{ ...styles.detailRow, alignItems: "start", marginTop: "10px" }}>
                  <span style={styles.detailLabel}>Motif :</span>
                  <p style={styles.motifText}>&ldquo;{r.motif}&rdquo;</p>
                </div>

                {r.commentaireAdmin && (
                  <div style={styles.commentBlock}>
                    <MessageSquare size={14} color="var(--primary)" />
                    <div style={styles.commentText}>
                      <strong>Note d'arbitrage :</strong> {r.commentaireAdmin}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION ROW (only shown on Pending tab or if request status is pending) */}
              {r.statut === "EN_ATTENTE" && (
                <div style={styles.actionRow}>
                  <button
                    className="btn btn-danger"
                    style={styles.actionBtn}
                    onClick={() => openDecisionModal(r.id, r.userFullName, false)}
                  >
                    <XCircle size={16} />
                    Refuser
                  </button>

                  <button
                    className="btn btn-success"
                    style={styles.actionBtn}
                    onClick={() => openDecisionModal(r.id, r.userFullName, true)}
                  >
                    <CheckCircle size={16} />
                    Approuver
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DECISION COMMENT MODAL */}
      {decisionModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {decisionModal.isApprove ? "🟢 Approuver la demande" : "🔴 Refuser la demande"}
              </h3>
              <button 
                style={styles.closeModalBtn} 
                onClick={() => setDecisionModal({ isOpen: false, requestId: null, isApprove: true, employeeName: "" })}
              >
                <XCircle size={20} />
              </button>
            </div>

            <p style={styles.modalDesc}>
              Décision pour <strong>{decisionModal.employeeName}</strong>. 
              Vous pouvez ajouter un commentaire ou un motif justificatif ci-dessous (visible par l'employé).
            </p>

            <form onSubmit={handleDecisionSubmit}>
              <div className="input-group">
                <label className="input-label">Commentaire de décision</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "100px", fontFamily: "var(--font-sans)", resize: "vertical" }}
                  placeholder="Ex: Approuvé pour convenance personnelle / Congé maladie validé avec justificatif..."
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  disabled={processing}
                />
              </div>

              <button
                type="submit"
                className={`btn ${decisionModal.isApprove ? "btn-success" : "btn-danger"}`}
                style={styles.modalSubmit}
                disabled={processing}
              >
                {processing ? "Traitement..." : "Confirmer la Décision"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerTitleArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#fff",
  },
  tabSwitcher: {
    display: "flex",
    gap: "6px",
    background: "rgba(0, 0, 0, 0.2)",
    padding: "4px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  tabBtn: {
    background: "none",
    border: "none",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-secondary)",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tabBtnActive: {
    background: "var(--primary)",
    color: "#fff",
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
  },
  emptyCard: {
    padding: "60px 20px",
    textAlign: "center",
  },
  listStack: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  requestCard: {
    padding: "24px",
    background: "rgba(18, 20, 29, 0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    paddingBottom: "14px",
  },
  employeeArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  empAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    color: "var(--primary-hover)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "1.1rem",
  },
  empName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
  },
  empSub: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    display: "block",
    marginTop: "2px",
  },
  metaBadgeRow: {
    display: "flex",
    gap: "8px",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  detailRow: {
    display: "flex",
    fontSize: "0.85rem",
  },
  detailLabel: {
    width: "80px",
    color: "var(--text-muted)",
    fontWeight: "500",
  },
  detailVal: {
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  daysTag: {
    fontSize: "0.75rem",
    background: "rgba(255,255,255,0.06)",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--text-secondary)",
  },
  motifText: {
    flex: 1,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    lineHeight: "1.5",
    fontStyle: "italic",
  },
  commentBlock: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(139, 92, 246, 0.03)",
    borderLeft: "2px solid var(--primary)",
    padding: "10px 14px",
    borderRadius: "0 8px 8px 0",
    marginTop: "6px",
  },
  commentText: {
    fontSize: "0.8rem",
    color: "#e2e8f0",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
    paddingTop: "16px",
  },
  actionBtn: {
    padding: "10px 18px",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(5, 5, 8, 0.8)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalContent: {
    width: "100%",
    maxWidth: "460px",
    padding: "32px",
    background: "rgba(18, 20, 29, 0.95)",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    borderRadius: "20px",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "16px",
    marginBottom: "16px",
  },
  modalTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#fff",
  },
  closeModalBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  modalDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    marginBottom: "20px",
  },
  modalSubmit: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "8px",
  }
};
