import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Info, 
  ShieldAlert, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react";

export default function LeaveRequests() {
  const { showNotification } = useNotification();
  const [requests, setRequests] = useState([]);
  const [viewMode, setViewMode] = useState("pending"); // "pending" | "history" | "calendar"
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

  // Calendar State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null); // null = all 12 months, 0-11 = single zoomed month

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Load all or pending based on filter
      const data = (viewMode === "pending") ? await api.conges.getEnAttente() : await api.conges.getAll();
      if (data) {
        // Sort descending by date
        const sorted = data.sort((a, b) => new Date(b.createdAt || b.dateDebut) - new Date(a.createdAt || a.dateDebut));
        setRequests(sorted);
      }
    } catch (err) {
      showNotification("Impossible de recuperer les demandes de conges", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    setSelectedDate(null);
    setSelectedMonth(null);
    setSearchQuery(""); // Reset search query on tab change
  }, [viewMode]);

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
        showNotification("La demande de conge a ete approuvee", "success");
      } else {
        await api.conges.refuser(requestId, commentaire);
        showNotification("La demande de conge a ete refusee", "warning");
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
    CONGE_PAYE: "Conge Paye",
    CONGE_SANS_SOLDE: "Conge Sans Solde",
    MALADIE: "Maladie",
    MATERNITE: "Maternite",
    PATERNITE: "Paternite",
    EXCEPTIONNEL: "Conge Exceptionnel",
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

  const formatDateLong = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  };

  // Filter requests array by search query for lists
  const filteredRequests = React.useMemo(() => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((r) => 
      (r.userFullName && r.userFullName.toLowerCase().includes(query)) ||
      (r.userId && r.userId.toLowerCase().includes(query))
    );
  }, [requests, searchQuery]);

  // Pre-process conges for fast calendar lookup
  const leavesMap = React.useMemo(() => {
    const map = {};
    requests.forEach((leave) => {
      // Filter out refused leaves
      if (leave.statut === "REFUSE") return;

      // Filter by search query if any
      if (searchQuery && !leave.userFullName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      // Find all dates between dateDebut and dateFin
      const start = new Date(leave.dateDebut + "T00:00:00");
      const end = new Date(leave.dateFin + "T00:00:00");

      let temp = new Date(start);
      while (temp <= end) {
        const year = temp.getFullYear();
        const month = String(temp.getMonth() + 1).padStart(2, "0");
        const day = String(temp.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        if (!map[dateStr]) {
          map[dateStr] = [];
        }
        map[dateStr].push(leave);

        temp.setDate(temp.getDate() + 1);
      }
    });
    return map;
  }, [requests, searchQuery]);

  const renderMonth = (monthIndex) => {
    const monthNames = [
      "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
    ];
    const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const year = calendarYear;
    const isZoomed = selectedMonth !== null;

    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    let firstDayIndex = new Date(year, monthIndex, 1).getDay();
    // Adjust for Monday start
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const dayCells = [];
    // Empty cells for alignment before the 1st day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<div key={`empty-${i}`} style={styles.calendarEmptyCell}></div>);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayLeaves = leavesMap[dateStr] || [];

      let cellStyle = { 
        ...styles.calendarCell,
        ...(isZoomed ? styles.calendarCellZoomed : {})
      };
      const hasApproved = dayLeaves.some((l) => l.statut === "APPROUVE");
      const hasPending = dayLeaves.some((l) => l.statut === "EN_ATTENTE");

      if (dayLeaves.length > 0) {
        if (hasApproved && hasPending) {
          cellStyle = { ...cellStyle, ...styles.calendarCellMixed };
        } else if (hasApproved) {
          cellStyle = { ...cellStyle, ...styles.calendarCellApproved };
        } else if (hasPending) {
          cellStyle = { ...cellStyle, ...styles.calendarCellPending };
        }
      }

      const isSelected = selectedDate === dateStr;
      if (isSelected) {
        cellStyle = { ...cellStyle, ...styles.calendarCellSelected };
      }

      dayCells.push(
        <button
          key={`day-${day}`}
          type="button"
          style={cellStyle}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
          disabled={dayLeaves.length === 0}
        >
          {day}
          {dayLeaves.length > 0 && (
            <span style={styles.cellDot}></span>
          )}
        </button>
      );
    }

    return (
      <div key={monthIndex} className="glass-card" style={isZoomed ? styles.zoomedMonthCard : styles.monthCard}>
        <button
          type="button"
          style={styles.monthTitleBtn}
          onClick={() => {
            if (selectedMonth === null) {
              setSelectedMonth(monthIndex);
            }
          }}
          disabled={selectedMonth !== null}
        >
          {monthNames[monthIndex]}
        </button>

        <div style={styles.daysHeaderGrid}>
          {daysOfWeek.map((d) => (
            <div key={d} style={styles.dayOfWeekLabel}>{d}</div>
          ))}
        </div>
        <div style={isZoomed ? styles.daysGridZoomed : styles.daysGrid}>
          {dayCells}
        </div>
      </div>
    );
  };

  const selectedDateLeaves = selectedDate ? leavesMap[selectedDate] || [] : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <CalendarDays size={24} color="var(--primary)" />
          <h2 style={styles.title}>Moderation des Demandes de Conges</h2>
        </div>

        {/* View Switcher */}
        <div style={styles.tabSwitcher}>
          <button
            style={{
              ...styles.tabBtn,
              ...(viewMode === "pending" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setViewMode("pending")}
          >
            En Attente
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(viewMode === "history" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setViewMode("history")}
          >
            Historique Complet
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(viewMode === "calendar" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setViewMode("calendar")}
          >
            Calendrier des Conges
          </button>
        </div>
      </div>

      {/* Global Search Bar (shown for all views when loaded) */}
      {!loading && (
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "flex-start" }}>
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher un employe..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedDate(null);
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : viewMode === "calendar" ? (
        // Calendar View with side-by-side details
        <div style={styles.calendarLayout}>
          
          {/* Left section: Controls + Grid */}
          <div style={styles.calendarLeftSection}>
            {/* Legend */}
            <div style={styles.legendAndSearchRow}>
              <div></div> {/* Spacer */}
              <div style={styles.legendContainer}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "var(--primary)" }}></div>
                  <span>Approuve</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "var(--warning)" }}></div>
                  <span>En attente</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "var(--info)" }}></div>
                  <span>Mixte</span>
                </div>
              </div>
            </div>

            {/* Year Navigator */}
            <div style={styles.yearSelector}>
              <button style={styles.yearBtn} onClick={() => { setCalendarYear(y => y - 1); setSelectedDate(null); setSelectedMonth(null); }}>
                <ChevronLeft size={16} />
              </button>
              <span style={styles.yearText}>{calendarYear}</span>
              <button style={styles.yearBtn} onClick={() => { setCalendarYear(y => y + 1); setSelectedDate(null); setSelectedMonth(null); }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 12-Month or Single Month Render */}
            {selectedMonth !== null ? (
              <div>
                <div style={styles.singleMonthHeader}>
                  <button type="button" style={styles.backBtn} onClick={() => setSelectedMonth(null)}>
                    <ChevronLeft size={16} />
                    Retour a la vue annuelle
                  </button>
                </div>
                {renderMonth(selectedMonth)}
              </div>
            ) : (
              <div style={styles.calendarGrid}>
                {Array.from({ length: 12 }).map((_, index) => renderMonth(index))}
              </div>
            )}
          </div>

          {/* Right section: Day Detail Sidebar */}
          <div style={styles.calendarRightSection}>
            <div className="glass-card" style={styles.detailsPane}>
              <div style={styles.detailsHeader}>
                {selectedDate 
                  ? `Conges du ${formatDateLong(selectedDate)}` 
                  : "Details du jour"}
              </div>
              
              {!selectedDate ? (
                <div style={styles.detailsPlaceholder}>
                  <Info size={24} color="var(--text-muted)" style={{ marginBottom: "8px" }} />
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", lineHeight: "1.4" }}>
                    Selectionnez un jour colore pour voir les conges actifs de cette date.
                  </p>
                </div>
              ) : selectedDateLeaves.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "10px 0" }}>
                  Aucun conge actif pour cette date.
                </p>
              ) : (
                <div style={styles.detailsList}>
                  {selectedDateLeaves.map((leave) => (
                    <div key={leave.id} style={styles.detailCard}>
                      <div style={styles.detailCardHeader}>
                        <span style={styles.detailEmployeeName}>{leave.userFullName}</span>
                        <span style={styles.detailLeaveType}>
                          {typesConge[leave.typeConge] || leave.typeConge}
                        </span>
                      </div>
                      
                      <div style={styles.detailText}>
                        <strong>Statut : </strong>
                        <span style={{ 
                          color: leave.statut === "APPROUVE" ? "var(--success)" : "var(--warning)",
                          fontWeight: "600"
                        }}>
                          {leave.statut === "APPROUVE" ? "Approuve" : "En attente"}
                        </span>
                      </div>
                      
                      <div style={styles.detailText}>
                        <strong>Periode : </strong>
                        Du {formatDate(leave.dateDebut)} au {formatDate(leave.dateFin)} ({formatDays(leave.dateDebut, leave.dateFin)})
                      </div>
                      
                      {leave.motif && (
                        <div style={styles.detailText}>
                          <strong>Motif : </strong>
                          <em>&ldquo;{leave.motif}&rdquo;</em>
                        </div>
                      )}

                      {/* Direct moderation actions if pending */}
                      {leave.statut === "EN_ATTENTE" && (
                        <div style={styles.detailCardActions}>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={styles.detailActionBtn}
                            onClick={() => openDecisionModal(leave.id, leave.userFullName, false)}
                          >
                            <XCircle size={14} />
                            Refuser
                          </button>
                          <button
                            type="button"
                            className="btn btn-success"
                            style={styles.detailActionBtn}
                            onClick={() => openDecisionModal(leave.id, leave.userFullName, true)}
                          >
                            <CheckCircle size={14} />
                            Approuver
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
      ) : filteredRequests.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <Sparkles size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <h3>Aucune demande trouvee</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            {searchQuery 
              ? "Aucune demande ne correspond a votre recherche."
              : viewMode === "pending" 
                ? "Toutes les demandes de conges ont ete traitees. Bon travail !" 
                : "Aucune demande de conge enregistree dans l'historique."}
          </p>
        </div>
      ) : (
        // List View (Pending or History)
        <div style={styles.listStack}>
          {filteredRequests.map((r) => (
            <div key={r.id} className="glass-card" style={styles.requestCard}>
              <div style={styles.cardHeader}>
                <div style={styles.employeeArea}>
                  <div style={styles.empAvatar}>
                    {r.userFullName?.charAt(0) || "E"}
                  </div>
                  <div>
                    <h4 style={styles.empName}>{r.userFullName}</h4>
                    <span style={styles.empSub}>ID Employe: {r.userId}</span>
                  </div>
                </div>

                <div style={styles.metaBadgeRow}>
                  <span className="badge badge-info" style={{ textTransform: "none" }}>
                    {typesConge[r.typeConge] || r.typeConge}
                  </span>
                  
                  {r.statut !== "EN_ATTENTE" && (
                    <span className={`badge ${r.statut === "APPROUVE" ? "badge-success" : "badge-danger"}`}>
                      {r.statut === "APPROUVE" ? "Approuve" : "Refuse"}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.cardContent}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Periode :</span>
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

              {/* ACTION ROW (only shown if request status is pending) */}
              {r.statut === "EN_ATTENTE" && (
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={styles.actionBtn}
                    onClick={() => openDecisionModal(r.id, r.userFullName, false)}
                  >
                    <XCircle size={16} />
                    Refuser
                  </button>

                  <button
                    type="button"
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
                {decisionModal.isApprove ? "Approuver la demande" : "Refuser la demande"}
              </h3>
              <button 
                type="button"
                style={styles.closeModalBtn} 
                onClick={() => setDecisionModal({ isOpen: false, requestId: null, isApprove: true, employeeName: "" })}
              >
                <XCircle size={20} />
              </button>
            </div>

            <p style={styles.modalDesc}>
              Decision pour <strong>{decisionModal.employeeName}</strong>. 
              Vous pouvez ajouter un commentaire ou un motif justificatif ci-dessous (visible par l'employe).
            </p>

            <form onSubmit={handleDecisionSubmit}>
              <div className="input-group">
                <label className="input-label">Commentaire de decision</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "100px", fontFamily: "var(--font-sans)", resize: "vertical" }}
                  placeholder="Ex: Approuve pour convenance personnelle / Conge maladie valide avec justificatif..."
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
                {processing ? "Traitement..." : "Confirmer la Decision"}
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
    maxWidth: "1200px",
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
  },

  // Calendar Layout Styles
  calendarLayout: {
    display: "flex",
    gap: "24px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  calendarLeftSection: {
    flex: "2 1 600px",
    minWidth: 0,
  },
  calendarRightSection: {
    flex: "1 1 320px",
    position: "sticky",
    top: "24px",
    alignSelf: "stretch",
  },

  // Calendar controls
  legendAndSearchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "8px",
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
  legendContainer: {
    display: "flex",
    gap: "16px",
    fontSize: "0.8rem",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--text-secondary)",
  },
  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "3px",
  },
  yearSelector: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    margin: "20px 0",
  },
  yearBtn: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s ease",
  },
  yearText: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#fff",
    minWidth: "60px",
    textAlign: "center",
  },

  // Calendar render
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  monthCard: {
    padding: "16px",
    background: "rgba(18, 20, 29, 0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    transition: "border-color 0.2s, transform 0.2s",
  },
  zoomedMonthCard: {
    padding: "24px",
    background: "rgba(18, 20, 29, 0.45)",
    borderRadius: "16px",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    maxWidth: "500px",
    margin: "0 auto",
  },
  monthTitleBtn: {
    background: "none",
    border: "none",
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    width: "100%",
    cursor: "pointer",
    paddingBottom: "6px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: "12px",
    transition: "color 0.2s",
  },
  daysHeaderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    textAlign: "center",
    marginBottom: "8px",
  },
  dayOfWeekLabel: {
    fontSize: "0.7rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  daysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
  },
  daysGridZoomed: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "8px",
  },
  calendarCell: {
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    position: "relative",
    padding: 0,
    cursor: "pointer",
    outline: "none",
  },
  calendarCellZoomed: {
    fontSize: "0.9rem",
    padding: "6px 0",
  },
  calendarEmptyCell: {
    aspectRatio: "1",
  },
  calendarCellApproved: {
    background: "rgba(139, 92, 246, 0.15)",
    borderColor: "var(--primary)",
    color: "#fff",
    fontWeight: "600",
  },
  calendarCellPending: {
    background: "rgba(245, 158, 11, 0.15)",
    borderColor: "var(--warning)",
    color: "#fff",
    fontWeight: "600",
  },
  calendarCellMixed: {
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 50%, rgba(245, 158, 11, 0.15) 50%)",
    borderColor: "var(--info)",
    color: "#fff",
    fontWeight: "600",
  },
  calendarCellSelected: {
    boxShadow: "0 0 10px var(--primary)",
    border: "2px solid #fff !important",
    transform: "scale(1.05)",
  },
  cellDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "#fff",
    position: "absolute",
    bottom: "3px",
  },
  singleMonthHeader: {
    display: "flex",
    marginBottom: "16px",
  },
  backBtn: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "8px 16px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s",
  },

  // Day detail sidebar
  detailsPane: {
    padding: "20px",
    background: "rgba(18, 20, 29, 0.4)",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    height: "100%",
    minHeight: "350px",
  },
  detailsHeader: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "#fff",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "10px",
    marginBottom: "14px",
  },
  detailsPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "220px",
  },
  detailsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  detailCard: {
    padding: "16px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  detailCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
    gap: "8px",
  },
  detailEmployeeName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
  },
  detailLeaveType: {
    fontSize: "0.75rem",
    background: "rgba(255,255,255,0.06)",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--text-secondary)",
  },
  detailText: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: "6px 0",
  },
  detailCardActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    marginTop: "12px",
    borderTop: "1px solid rgba(255, 255, 255, 0.03)",
    paddingTop: "10px",
  },
  detailActionBtn: {
    padding: "6px 12px",
    fontSize: "0.75rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  }
};
