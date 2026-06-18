import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { QrCode, Plus, Copy, Check, Clock, Eye, Download } from "lucide-react";

export default function QrCodeManager() {
  const { showNotification } = useNotification();
  const [activeCodes, setActiveCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [validite, setValidite] = useState("15");
  const [description, setDescription] = useState("");

  // Focus View State
  const [focusQr, setFocusQr] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchActiveCodes = async () => {
    try {
      const data = await api.qrcodes.getActifs();
      if (data) {
        // Sort by expiration descending
        const sorted = data.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt));
        setActiveCodes(sorted);
      }
    } catch (err) {
      showNotification("Impossible de charger les codes QR actifs", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveCodes();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!validite || isNaN(validite) || parseInt(validite) <= 0) {
      showNotification("Veuillez saisir une durée de validité positive", "danger");
      return;
    }

    setGenerating(true);
    try {
      const newQr = await api.qrcodes.generer(parseInt(validite), description || "Code QR de présence");
      showNotification("Nouveau Code QR généré avec succès !", "success");
      setFocusQr(newQr);
      setDescription("");
      fetchActiveCodes();
    } catch (err) {
      showNotification(err.message || "Erreur de génération du QR", "danger");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showNotification("UUID copié dans le presse-papiers !", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    return date.toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getRemainingMinutes = (expiresAt) => {
    const remaining = new Date(expiresAt) - new Date();
    if (remaining <= 0) return "Expiré";
    const mins = Math.ceil(remaining / 60000);
    return `${mins} min`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <QrCode size={24} color="var(--primary)" />
        <h2 style={styles.title}>Générateur de QR Code de Présence</h2>
      </div>

      <div style={styles.grid}>
        {/* LEFT COLUMN: CREATION FORM */}
        <div style={styles.leftCol}>
          <div className="glass-card" style={styles.formCard}>
            <div style={styles.formHeader}>
              <Plus size={18} color="var(--primary)" />
              <h3 style={styles.formTitle}>Créer un point de scan</h3>
            </div>

            <form onSubmit={handleGenerate}>
              <div className="input-group">
                <label className="input-label">Validité du Code (Minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="1440"
                  value={validite}
                  onChange={(e) => setValidite(e.target.value)}
                  disabled={generating}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description / Emplacement</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Entrée principale, Bureau RDC, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={generating}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={styles.submitBtn}
                disabled={generating}
              >
                {generating ? "Génération en cours..." : "Générer le Code QR"}
              </button>
            </form>
          </div>

          {/* FOCUS DISPLAY OF CREATED/VIEWED QR CODE */}
          {focusQr && (
            <div className="glass-card" style={styles.focusCard}>
              <h3 style={styles.focusTitle}>Code QR de Présence Actif</h3>
              <p style={styles.focusDesc}>{focusQr.description || "Généré à l'instant"}</p>
              
              <div style={styles.qrWrapper}>
                <img
                  src={`data:image/png;base64,${focusQr.imageBase64}`}
                  alt="QR Code"
                  style={styles.qrImage}
                />
              </div>

              {/* Copier value for test emulating */}
              <div style={styles.copierBlock}>
                <div style={styles.copierLabel}>Clé UUID de test (à utiliser dans le simulateur)</div>
                <div style={styles.copierRow}>
                  <code style={styles.copierCode}>{focusQr.code}</code>
                  <button
                    className="btn btn-secondary"
                    style={styles.copyBtn}
                    onClick={() => handleCopyCode(focusQr.code, "focus")}
                  >
                    {copiedId === "focus" ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <p style={styles.expiryHint}>
                Expire à : <strong>{formatDateTime(focusQr.expiresAt)}</strong> ({getRemainingMinutes(focusQr.expiresAt)})
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVE LIST */}
        <div className="glass-card" style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.listTitle}>Codes QR Actifs en circulation</h3>
            <span style={styles.countBadge}>{activeCodes.length} actifs</span>
          </div>

          {loading ? (
            <div style={styles.loaderContainer}>
              <div style={styles.spinner}></div>
            </div>
          ) : activeCodes.length === 0 ? (
            <div style={styles.emptyContainer}>
              <p style={styles.emptyText}>Aucun QR Code actif pour le moment.</p>
            </div>
          ) : (
            <div style={styles.scrollList}>
              <table className="custom-table" style={{ fontSize: "0.8rem" }}>
                <thead>
                  <tr>
                    <th>Emplacement</th>
                    <th>Clé UUID (Bypass)</th>
                    <th>Expiration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCodes.map((q) => (
                    <tr key={q.id}>
                      <td style={{ fontWeight: "600", color: "#fff" }}>
                        {q.description || "Présence"}
                      </td>
                      <td>
                        <div style={styles.tableCodeRow}>
                          <code style={{ fontSize: "0.75rem" }}>
                            {q.code.substring(0, 8)}...
                          </code>
                          <button
                            className="btn btn-secondary"
                            style={styles.tableCopyBtn}
                            onClick={() => handleCopyCode(q.code, q.id)}
                            title="Copier la clé UUID"
                          >
                            {copiedId === q.id ? (
                              <Check size={12} color="var(--success)" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={styles.tableTimeCell}>
                          <Clock size={12} color="var(--warning)" />
                          <span>{formatDateTime(q.expiresAt)}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={styles.tableActionBtn}
                          onClick={() => setFocusQr(q)}
                          title="Afficher le QR Code"
                        >
                          <Eye size={12} />
                          Afficher
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    gridTemplateColumns: "0.9fr 1.1fr",
    gap: "24px",
    alignItems: "start",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
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
  submitBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
  },
  focusCard: {
    padding: "30px",
    background: "rgba(139, 92, 246, 0.03)",
    borderColor: "rgba(139, 92, 246, 0.15)",
    textAlign: "center",
  },
  focusTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#fff",
  },
  focusDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "4px",
    marginBottom: "20px",
  },
  qrWrapper: {
    display: "inline-block",
    padding: "12px",
    background: "#fff",
    borderRadius: "14px",
    marginBottom: "20px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
  },
  qrImage: {
    width: "180px",
    height: "180px",
    display: "block",
  },
  copierBlock: {
    textAlign: "left",
    background: "rgba(0, 0, 0, 0.2)",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: "16px",
  },
  copierLabel: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    marginBottom: "6px",
    fontWeight: "600",
  },
  copierRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  copierCode: {
    flex: 1,
    fontSize: "0.75rem",
    color: "var(--primary-hover)",
    background: "none",
    padding: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  copyBtn: {
    padding: "6px 10px",
    borderRadius: "6px",
  },
  expiryHint: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
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
  },
  tableCodeRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  tableCopyBtn: {
    padding: "3px 6px",
    borderRadius: "4px",
  },
  tableTimeCell: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.75rem",
    color: "#fff",
  },
  tableActionBtn: {
    padding: "4px 10px",
    fontSize: "0.75rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
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
    @media (max-width: 850px) {
      div[style*="grid-template-columns: 0.9fr 1.1fr"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
