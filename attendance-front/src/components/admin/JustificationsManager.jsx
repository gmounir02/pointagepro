import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Download, 
  Calendar, 
  Clock, 
  Search, 
  FileText,
  Info
} from "lucide-react";

export default function JustificationsManager() {
  const { showNotification } = useNotification();
  const [justifications, setJustifications] = useState([]);
  const [viewMode, setViewMode] = useState("pending"); // "pending" | "history"
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchJustifications = async () => {
    setLoading(true);
    try {
      const data = (viewMode === "pending")
        ? await api.pointages.getJustificationsEnAttente()
        : await api.pointages.getAllJustifications();
      if (data) {
        // Sort descending by date
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setJustifications(sorted);
      }
    } catch (err) {
      showNotification("Impossible de recuperer les justifications", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJustifications();
    setSearchQuery("");
  }, [viewMode]);

  const handleModerate = async (id, status) => {
    setProcessingId(id);
    try {
      await api.pointages.evaluerJustification(id, status);
      const successMessage = status === "APPROUVEE" 
        ? "La justification a ete approuvee" 
        : "La justification a ete refusee";
      showNotification(successMessage, status === "APPROUVEE" ? "success" : "warning");
      
      if (viewMode === "pending") {
        setJustifications(prev => prev.filter(j => j.id !== id));
      } else {
        setJustifications(prev => prev.map(j => j.id === id ? { ...j, statutJustification: status } : j));
      }
    } catch (err) {
      showNotification(err.message || "Erreur de traitement", "danger");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadFile = (fileData, userName, date) => {
    if (!fileData) return;
    
    let href = fileData;
    let extension = "bin";
    
    if (fileData.startsWith("data:")) {
      const match = fileData.match(/data:([^;]+);/);
      if (match && match[1]) {
        const mime = match[1];
        if (mime.includes("pdf")) extension = "pdf";
        else if (mime.includes("png")) extension = "png";
        else if (mime.includes("jpeg") || mime.includes("jpg")) extension = "jpg";
      }
    } else {
      href = `data:application/octet-stream;base64,${fileData}`;
    }
    
    const link = document.createElement("a");
    link.href = href;
    link.download = `justificatif_${userName.replace(/\s+/g, "_")}_${date}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  };

  const filteredJustifications = React.useMemo(() => {
    if (!searchQuery) return justifications;
    const query = searchQuery.toLowerCase();
    return justifications.filter(j => 
      (j.userFullName && j.userFullName.toLowerCase().includes(query)) ||
      (j.userId && j.userId.toLowerCase().includes(query)) ||
      (j.justificationMotif && j.justificationMotif.toLowerCase().includes(query))
    );
  }, [justifications, searchQuery]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <ShieldAlert size={24} color="var(--primary)" />
          <h2 style={styles.title}>Moderation des Justifications</h2>
        </div>
        <div style={styles.tabSwitcher}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(viewMode === "pending" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setViewMode("pending")}
          >
            En Attente
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(viewMode === "history" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setViewMode("history")}
          >
            Historique Complet
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      {!loading && (
        <div style={styles.actionRow}>
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher un employe..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={styles.statsBadge}>
            {viewMode === "pending"
              ? `${justifications.length} demande(s) en attente`
              : `${justifications.length} justification(s) au total`}
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : filteredJustifications.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <Info size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <h3>Aucune justification trouvee</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            {searchQuery 
              ? "Aucune justification ne correspond a votre recherche."
              : viewMode === "pending"
                ? "Toutes les justifications soumises ont ete traitees."
                : "Aucun historique de justification disponible."}
          </p>
        </div>
      ) : (
        <div style={styles.listStack}>
          {filteredJustifications.map((j) => (
            <div key={j.id} className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.employeeArea}>
                  <div style={styles.empAvatar}>
                    {j.userFullName?.charAt(0) || "E"}
                  </div>
                  <div>
                    <h4 style={styles.empName}>{j.userFullName}</h4>
                    <span style={styles.empSub}>ID Employe: {j.userId}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className={`badge ${j.type === "ABSENCE" ? "badge-danger" : "badge-warning"}`} style={{ textTransform: "none" }}>
                    {j.type === "ABSENCE" ? "Absence" : "Retard"}
                  </span>
                  {j.statutJustification && j.statutJustification !== "EN_ATTENTE" && (
                    <span className={`badge ${j.statutJustification === "APPROUVEE" ? "badge-success" : "badge-danger"}`}>
                      {j.statutJustification === "APPROUVEE" ? "Approuvee" : "Refusee"}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.cardContent}>
                <div style={styles.infoRow}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <span style={styles.infoText}>
                    Date du signalement : <strong>{formatDate(j.date)}</strong>
                  </span>
                </div>

                {j.type === "ENTREE" && j.heureArrivee && (
                  <div style={styles.infoRow}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span style={styles.infoText}>
                      Heure d'arrivee : {j.heureArrivee.substring(0, 5)}
                    </span>
                  </div>
                )}

                <div style={{ ...styles.infoRow, alignItems: "start", marginTop: "8px" }}>
                  <FileText size={14} color="var(--text-muted)" style={{ marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Motif de l'employe :</strong>
                    <p style={styles.motifText}>&ldquo;{j.justificationMotif || "Aucun motif fourni"}&rdquo;</p>
                  </div>
                </div>

                {j.justificatifFichier && (
                  <div style={styles.fileRow}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={styles.downloadBtn}
                      onClick={() => handleDownloadFile(j.justificatifFichier, j.userFullName, j.date)}
                    >
                      <Download size={14} />
                      Telecharger la piece jointe
                    </button>
                  </div>
                )}
              </div>

              {j.statutJustification === "EN_ATTENTE" && (
                <div style={styles.actionRowEnd}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={styles.actionBtn}
                    disabled={processingId !== null}
                    onClick={() => handleModerate(j.id, "REJETEE")}
                  >
                    <XCircle size={16} />
                    Refuser
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    style={styles.actionBtn}
                    disabled={processingId !== null}
                    onClick={() => handleModerate(j.id, "APPROUVEE")}
                  >
                    <CheckCircle size={16} />
                    Accepter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    paddingBottom: "40px",
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
  actionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: "1",
    minWidth: "200px",
    maxWidth: "350px",
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px 10px 40px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#fff",
    fontSize: "0.9rem",
    outline: "none",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
  },
  statsBadge: {
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    color: "var(--primary-hover)",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: "600",
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
    gap: "16px",
  },
  card: {
    padding: "20px",
    background: "rgba(18, 20, 29, 0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    paddingBottom: "12px",
  },
  employeeArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  empAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    color: "var(--primary-hover)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "1rem",
  },
  empName: {
    fontSize: "0.9rem",
    fontWeight: "700",
    color: "#fff",
  },
  empSub: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    display: "block",
    marginTop: "2px",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  infoText: {
    color: "#fff",
  },
  motifText: {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontStyle: "italic",
    lineHeight: "1.4",
    marginTop: "4px",
  },
  fileRow: {
    marginTop: "8px",
    display: "flex",
  },
  downloadBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.75rem",
    padding: "6px 12px",
  },
  actionRowEnd: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
    paddingTop: "14px",
  },
  actionBtn: {
    padding: "8px 16px",
    fontSize: "0.8rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  }
};
