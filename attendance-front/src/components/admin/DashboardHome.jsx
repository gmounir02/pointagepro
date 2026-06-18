import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CalendarDays, 
  Hourglass, 
  Activity, 
  TrendingUp, 
  RefreshCw,
  Calendar,
  X,
  AlertTriangle
} from "lucide-react";

export default function DashboardHome() {
  const { showNotification } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeKpiTab, setActiveKpiTab] = useState("all");
  const [dayDetails, setDayDetails] = useState({
    present: [],
    late: [],
    absent: [],
    all: []
  });

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [historyPointages, setHistoryPointages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("all");
  const [previewSelfieModal, setPreviewSelfieModal] = useState(null); // { photo, title, time, date }

  const handleExportCSV = (data, title = "export") => {
    if (!data || data.length === 0) {
      showNotification("Aucune donnée à exporter", "warning");
      return;
    }
    const headers = ["Employe", "Date", "Heure Entree", "Heure Sortie", "Retard", "Sortie Anticipée", "Heures Insuffisantes", "Note"];
    const rows = data.map(p => [
      p.userFullName || historyEmployee?.fullName || "Employé",
      p.date,
      p.heureEntree ? new Date(p.heureEntree).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "-",
      p.heureSortie ? new Date(p.heureSortie).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "-",
      p.enRetard ? "Oui" : "Non",
      p.sortieAnticipee ? "Oui" : "Non",
      p.heuresInsuffisantes ? "Oui" : "Non",
      p.note || ""
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('fr-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Rapport CSV exporté avec succès !", "success");
  };

  const handleExportPDF = (data, employeeName = "Rapport") => {
    if (!data || data.length === 0) {
      showNotification("Aucune donnée à exporter", "warning");
      return;
    }
    const printWindow = window.open("", "_blank");
    const htmlContent = `
      <html>
        <head>
          <title>Rapport de Présence - ${employeeName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111827; padding: 30px; line-height: 1.5; }
            .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 25px; }
            .logo-title { font-size: 1.6rem; font-weight: 800; color: #8b5cf6; }
            .report-title { font-size: 1.1rem; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 0.9rem; background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 12px; border: 1px solid #e5e7eb; font-size: 0.85rem; text-transform: uppercase; }
            td { padding: 12px; border: 1px solid #e5e7eb; font-size: 0.9rem; color: #1f2937; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-align: center; }
            .badge-success { background-color: #d1fae5; color: #065f46; }
            .badge-warning { background-color: #fef3c7; color: #92400e; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="logo-title">ATTENDANCE SYSTEM</div>
            <div class="report-title">Fiche de Présence Individuelle</div>
          </div>
          <div class="meta-grid">
            <div>
              <strong>Collaborateur :</strong> ${employeeName}<br/>
              <strong>Exporté par :</strong> Administrateur
            </div>
            <div>
              <strong>Date d'export :</strong> ${new Date().toLocaleDateString("fr-FR")}<br/>
              <strong>Total Sessions :</strong> ${data.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Arrivée (Entrée)</th>
                <th>Départ (Sortie)</th>
                <th>Statut</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(p => {
                const formattedDate = new Date(p.date).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                return `
                  <tr>
                    <td style="font-weight: 600; text-transform: capitalize;">${formattedDate}</td>
                    <td>🟢 ${p.heureEntree ? new Date(p.heureEntree).toLocaleTimeString("fr-FR", {hour: '2-digit', minute: '2-digit'}) : "-"}</td>
                    <td>🔴 ${p.heureSortie ? new Date(p.heureSortie).toLocaleTimeString("fr-FR", {hour: '2-digit', minute: '2-digit'}) : "Non pointé"}</td>
                    <td>
                      ${p.enRetard ? '<span class="badge badge-warning">En Retard</span>' : '<span class="badge badge-success">À l\'heure</span>'}
                      ${p.sortieAnticipee ? '<span class="badge" style="background-color: #fee2e2; color: #991b1b; display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 5px;">Sortie Anticipée</span>' : ''}
                      ${p.heuresInsuffisantes ? '<span class="badge" style="background-color: #fef3c7; color: #92400e; display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 5px;">Heures < 8h</span>' : ''}
                    </td>
                    <td>${p.note || "-"}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            Généré automatiquement par Smart Attendance System - PFA. Fiche certifiée conforme.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showNotification("Aperçu PDF ouvert !", "success");
  };

  // Justification Moderation States
  const [justifications, setJustifications] = useState([]);
  const [loadingJustifications, setLoadingJustifications] = useState(false);
  const [justifyImageModal, setJustifyImageModal] = useState(null);

  const fetchJustifications = async () => {
    setLoadingJustifications(true);
    try {
      const data = await api.pointages.getJustificationsEnAttente();
      if (data) {
        setJustifications(data);
      }
    } catch (err) {
      console.log("No pending justifications loaded", err);
    } finally {
      setLoadingJustifications(false);
    }
  };

  const handleModerateJustification = async (id, status) => {
    try {
      await api.pointages.evaluerJustification(id, status);
      showNotification(
        status === "APPROUVEE" 
          ? "Justification validée ! Le retard a été annulé." 
          : "Justification rejetée avec succès.",
        "success"
      );
      // Remove from list
      setJustifications(prev => prev.filter(j => j.id !== id));
      // Refresh statistics and list
      fetchStats();
    } catch (err) {
      showNotification(err.message || "Erreur de modération de la justification", "danger");
    }
  };

  const handleOpenHistory = async (empId, fullName) => {
    setHistoryEmployee({ id: empId, fullName });
    setHistoryPointages([]);
    setSelectedMonthFilter("all");
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const data = await api.pointages.getByUser(empId);
      if (data) {
        // Sort by date descending
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistoryPointages(sorted);
      }
    } catch (err) {
      showNotification("Impossible de charger l'historique de cet employé", "danger");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    fetchJustifications();
    try {
      const statsData = await api.dashboard.getStats();
      setStats(statsData);
      
      // Fetch users and pointages for today to compute detailed lists
      const allUsers = await api.users.getAll();
      const todayStr = new Date().toLocaleDateString('en-CA');
      let todayPointages = [];
      try {
        todayPointages = await api.pointages.getByDate(todayStr);
      } catch (e) {
        console.log("No pointages for today yet", e);
      }

      // Filter out admins from the list
      const normalEmployees = allUsers.filter(u => !u.roles.includes("ROLE_ADMIN"));

      const presentList = [];
      const lateList = [];
      const absentList = [];
      const allList = [];

      normalEmployees.forEach(emp => {
        const empPointages = todayPointages.filter(p => p.userId === emp.id);
        
        let status = "ABSENT";
        let checkIn = null;
        let checkOut = null;

        if (empPointages.length > 0) {
          // Check if all pointages are ABSENCE type
          const isAbsenceOnly = empPointages.every(p => p.type === "ABSENCE");
          
          if (isAbsenceOnly) {
            // Employee was auto-marked absent
            const record = {
              id: emp.id,
              fullName: `${emp.firstName} ${emp.lastName}`,
              department: emp.department || "-",
              poste: emp.poste || "-",
              email: emp.email,
              status: "ABSENT",
              checkIn: null,
              checkOut: null,
              note: empPointages[0].note || "Absence automatique"
            };
            absentList.push(record);
            allList.push(record);
          } else {
            // Filter out ABSENCE records, keep real pointages
            const realPointages = empPointages.filter(p => p.type !== "ABSENCE");
            // Sort by heureEntree ascending to find first and last
            const sorted = [...realPointages].sort((a, b) => new Date(a.heureEntree) - new Date(b.heureEntree));
            
            checkIn = sorted[0].heureEntree;
            
            // Find last exit (or if they are currently inside)
            const isCurrentlyInside = sorted.some(p => p.heureSortie === null);
            const wasLate = sorted[0].enRetard;

            if (isCurrentlyInside) {
              status = wasLate ? "LATE" : "PRESENT";
              checkOut = null;
            } else {
              status = "PRESENT";
              checkOut = sorted[sorted.length - 1].heureSortie;
            }
            
            const record = {
              id: emp.id,
              fullName: `${emp.firstName} ${emp.lastName}`,
              department: emp.department || "-",
              poste: emp.poste || "-",
              email: emp.email,
              status,
              isCurrentlyInside,
              checkIn,
              checkOut,
              enRetard: sorted.some(p => p.enRetard),
              sortieAnticipee: sorted.some(p => p.sortieAnticipee),
              heuresInsuffisantes: sorted.some(p => p.heuresInsuffisantes),
              note: sorted[sorted.length - 1].note,
              photoEntree: sorted[0].photoEntree || null,
              photoSortie: sorted[sorted.length - 1].photoSortie || null
            };

            if (wasLate) {
              lateList.push(record);
            } else {
              presentList.push(record);
            }
            allList.push(record);
          }
        } else {
          const record = {
            id: emp.id,
            fullName: `${emp.firstName} ${emp.lastName}`,
            department: emp.department || "-",
            poste: emp.poste || "-",
            email: emp.email,
            status,
            checkIn: null,
            checkOut: null
          };
          absentList.push(record);
          allList.push(record);
        }
      });

      setDayDetails({
        present: presentList,
        late: lateList,
        absent: absentList,
        all: allList
      });

    } catch (err) {
      showNotification("Impossible de charger les statistiques du tableau de bord", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Chargement des statistiques...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-card" style={styles.errorCard}>
        <h3>Erreur de chargement</h3>
        <button className="btn btn-primary" onClick={fetchStats}>Réessayer</button>
      </div>
    );
  }

  // Find max value in monthly stats to scale our custom SVG chart properly
  const monthlyData = stats.statsMensuelles || [];
  const maxPresence = Math.max(...monthlyData.map(d => d.presences), 5);

  const earlyDeparturesCount = dayDetails.all.filter(e => e.sortieAnticipee).length;
  const insufficientHoursCount = dayDetails.all.filter(e => e.heuresInsuffisantes).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <Activity size={24} color="var(--primary)" />
          <h2 style={styles.title}>Vue d'ensemble de l'Entreprise</h2>
        </div>

        <button className="btn btn-secondary" style={styles.refreshBtn} onClick={fetchStats}>
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* KPI GRID */}
      <div style={styles.kpiGrid}>
        <div 
          className="glass-card" 
          onClick={() => setActiveKpiTab("all")}
          style={{ 
            ...styles.kpiCard, 
            cursor: "pointer",
            border: activeKpiTab === "all" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.05)",
            boxShadow: activeKpiTab === "all" ? "0 0 15px rgba(139, 92, 246, 0.2)" : "none"
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Employés</span>
            <div style={{ ...styles.kpiIconWrapper, background: "rgba(139, 92, 246, 0.1)" }}>
              <Users size={20} color="var(--primary)" />
            </div>
          </div>
          <div style={styles.kpiValue}>{dayDetails.all.length}</div>
          <div style={styles.kpiSub}>Collaborateurs enregistrés</div>
        </div>

        <div 
          className="glass-card" 
          onClick={() => setActiveKpiTab("present")}
          style={{ 
            ...styles.kpiCard, 
            cursor: "pointer",
            border: activeKpiTab === "present" ? "1px solid var(--success)" : "1px solid rgba(255,255,255,0.05)",
            boxShadow: activeKpiTab === "present" ? "0 0 15px rgba(16, 185, 129, 0.2)" : "none"
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Présents Aujourd'hui</span>
            <div style={{ ...styles.kpiIconWrapper, background: "rgba(16, 185, 129, 0.1)" }}>
              <UserCheck size={20} color="var(--success)" />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: "var(--success)" }}>{dayDetails.present.length}</div>
          <div style={styles.kpiSub}>À l'heure</div>
        </div>

        <div 
          className="glass-card" 
          onClick={() => setActiveKpiTab("late")}
          style={{ 
            ...styles.kpiCard, 
            cursor: "pointer",
            border: activeKpiTab === "late" ? "1px solid var(--warning)" : "1px solid rgba(255,255,255,0.05)",
            boxShadow: activeKpiTab === "late" ? "0 0 15px rgba(245, 158, 11, 0.2)" : "none"
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Retards Aujourd'hui</span>
            <div style={{ ...styles.kpiIconWrapper, background: "rgba(245, 158, 11, 0.1)" }}>
              <Clock size={20} color="var(--warning)" />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: "var(--warning)" }}>{dayDetails.late.length}</div>
          <div style={styles.kpiSub}>En retard aujourd'hui</div>
        </div>

        <div 
          className="glass-card" 
          onClick={() => setActiveKpiTab("absent")}
          style={{ 
            ...styles.kpiCard, 
            cursor: "pointer",
            border: activeKpiTab === "absent" ? "1px solid var(--danger)" : "1px solid rgba(255,255,255,0.05)",
            boxShadow: activeKpiTab === "absent" ? "0 0 15px rgba(244, 63, 94, 0.2)" : "none"
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Absents Aujourd'hui</span>
            <div style={{ ...styles.kpiIconWrapper, background: "rgba(244, 63, 94, 0.1)" }}>
              <UserX size={20} color="var(--danger)" />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: "var(--danger)" }}>{dayDetails.absent.length}</div>
          <div style={styles.kpiSub}>Non pointés aujourd'hui</div>
        </div>

        {/* Anomalies Card */}
        <div 
          className="glass-card" 
          style={{ 
            ...styles.kpiCard, 
            borderColor: "rgba(244, 63, 94, 0.2)",
            background: "rgba(244, 63, 94, 0.02)"
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Anomalies Signalées</span>
            <div style={{ ...styles.kpiIconWrapper, background: "rgba(244, 63, 94, 0.1)" }}>
              <AlertTriangle size={20} color="var(--danger)" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
            <div>
              <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--danger)" }}>{earlyDeparturesCount}</span>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Départs Anticipés</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "15px" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--warning)" }}>{insufficientHoursCount}</span>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Heures &lt; 8h</div>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 LISTE DES EMPLOYES SELON LE KPI SELECTIONNE */}
      <div className="glass-card" style={styles.listCard}>
        <div style={{ ...styles.listHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={styles.listTitle}>
              {activeKpiTab === "all" && "Registre Global (Aujourd'hui)"}
              {activeKpiTab === "present" && "Employés Présents (À l'heure)"}
              {activeKpiTab === "late" && "Employés en Retard"}
              {activeKpiTab === "absent" && "Employés Absents"}
            </h3>
            <span className="badge" style={{
              background: activeKpiTab === "present" ? "rgba(16, 185, 129, 0.1)" :
                          activeKpiTab === "late" ? "rgba(245, 158, 11, 0.1)" :
                          activeKpiTab === "absent" ? "rgba(244, 63, 94, 0.1)" :
                          "rgba(139, 92, 246, 0.1)",
              color: activeKpiTab === "present" ? "var(--success)" :
                     activeKpiTab === "late" ? "var(--warning)" :
                     activeKpiTab === "absent" ? "var(--danger)" :
                     "var(--primary)"
            }}>
              {dayDetails[activeKpiTab]?.length || 0}
            </span>
          </div>

          {dayDetails[activeKpiTab]?.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary"
                style={{
                  padding: "4px 8px",
                  fontSize: "0.7rem",
                  borderRadius: "5px",
                  borderColor: "rgba(16, 185, 129, 0.2)",
                  background: "rgba(16, 185, 129, 0.05)",
                  color: "var(--success)",
                  cursor: "pointer"
                }}
                onClick={() => handleExportCSV(
                  dayDetails[activeKpiTab].map(e => ({
                    fullName: e.fullName,
                    date: new Date().toLocaleDateString('fr-CA'),
                    heureEntree: e.checkIn,
                    heureSortie: e.checkOut,
                    enRetard: e.status === "LATE",
                    note: e.status === "ABSENT" ? "Absent" : ""
                  })),
                  `Registre_${activeKpiTab}`
                )}
                title="Exporter cette liste en CSV"
              >
                📊 CSV
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  padding: "4px 8px",
                  fontSize: "0.7rem",
                  borderRadius: "5px",
                  borderColor: "rgba(139, 92, 246, 0.2)",
                  background: "rgba(139, 92, 246, 0.05)",
                  color: "var(--primary)",
                  cursor: "pointer"
                }}
                onClick={() => handleExportPDF(
                  dayDetails[activeKpiTab].map(e => ({
                    fullName: e.fullName,
                    date: new Date().toLocaleDateString('fr-CA'),
                    heureEntree: e.checkIn,
                    heureSortie: e.checkOut,
                    enRetard: e.status === "LATE",
                    note: e.status === "ABSENT" ? "Absent" : ""
                  })),
                  `Registre ${activeKpiTab.toUpperCase()}`
                )}
                title="Imprimer cette liste"
              >
                🖨️ PDF
              </button>
            </div>
          )}
        </div>

        {dayDetails[activeKpiTab]?.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
            Aucun employé dans cette catégorie pour le moment.
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px" }}>Employé</th>
                  <th style={{ textAlign: "left", padding: "12px" }}>Département / Poste</th>
                  <th style={{ textAlign: "left", padding: "12px" }}>Arrivée (Entrée)</th>
                  <th style={{ textAlign: "left", padding: "12px" }}>Départ (Sortie)</th>
                  <th style={{ textAlign: "left", padding: "12px" }}>Statut</th>
                  <th style={{ textAlign: "center", padding: "12px" }}>Historique</th>
                </tr>
              </thead>
              <tbody>
                {dayDetails[activeKpiTab]?.map((emp) => {
                  const formatTime = (dateTimeString) => {
                    if (!dateTimeString) return "-";
                    return new Date(dateTimeString).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  };

                  return (
                    <tr key={emp.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "12px", fontWeight: "600", color: "#fff" }}>
                        {emp.fullName}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{emp.department}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{emp.poste}</div>
                      </td>
                      <td style={{ padding: "12px", color: emp.checkIn ? "var(--success)" : "var(--text-muted)" }}>
                        {emp.checkIn ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🟢 {formatTime(emp.checkIn)}</span>
                            {emp.photoEntree && (
                              <button 
                                type="button" 
                                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "inline-flex", padding: 0 }}
                                onClick={() => setPreviewSelfieModal({ photo: emp.photoEntree, title: `Selfie d'entrée - ${emp.fullName}`, time: formatTime(emp.checkIn) })}
                                title="Voir la photo d'entrée"
                              >
                                📷
                              </button>
                            )}
                          </div>
                        ) : "--:--"}
                      </td>
                      <td style={{ padding: "12px", color: emp.checkOut ? "var(--primary)" : "var(--text-muted)" }}>
                        {emp.checkOut ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🔴 {formatTime(emp.checkOut)}</span>
                            {emp.photoSortie && (
                              <button 
                                type="button" 
                                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "inline-flex", padding: 0 }}
                                onClick={() => setPreviewSelfieModal({ photo: emp.photoSortie, title: `Selfie de sortie - ${emp.fullName}`, time: formatTime(emp.checkOut) })}
                                title="Voir la photo de sortie"
                              >
                                📷
                              </button>
                            )}
                          </div>
                        ) : "--:--"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                          {emp.status === "ABSENT" ? (
                            <span className="badge badge-danger">Absent</span>
                          ) : (
                            <>
                              {emp.enRetard ? (
                                <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>⚠️ En Retard</span>
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>🟢 À l'heure</span>
                              )}
                              {emp.sortieAnticipee && (
                                <span className="badge" style={{ fontSize: "0.75rem", background: "rgba(244, 63, 94, 0.15)", color: "var(--danger)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                                  🚪 Sortie Anticipée
                                </span>
                              )}
                              {emp.heuresInsuffisantes && (
                                <span className="badge" style={{ fontSize: "0.75rem", background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                                  ⏱️ Heures &lt; 8h
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            background: "rgba(139, 92, 246, 0.12)",
                            border: "1px solid rgba(139, 92, 246, 0.3)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                          onClick={() => handleOpenHistory(emp.id, emp.fullName)}
                          title="Voir tout l'historique de présence"
                        >
                          <Calendar size={12} color="var(--primary)" />
                          <span>Historique</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ⚠️ JUSTIFICATIONS DE RETARDS EN ATTENTE */}
      {justifications.length > 0 && (
        <div className="glass-card" style={{ ...styles.listCard, marginTop: "24px", borderColor: "rgba(245, 158, 11, 0.25)", boxShadow: "0 4px 20px rgba(245, 158, 11, 0.05)" }}>
          <div style={styles.listHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertTriangle size={20} color="var(--warning)" />
              <h3 style={styles.listTitle}>Justifications de Retards à Modérer</h3>
              <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)" }}>
                {justifications.length} en attente
              </span>
            </div>
          </div>

          <div className="table-container" style={{ marginTop: "15px" }}>
            <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px", textAlign: "left" }}>Employé</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Date du Retard</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Heure d'Entrée</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Motif Explicatif</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Pièce Jointe</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {justifications.map((j) => (
                  <tr key={j.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ padding: "12px", fontWeight: "600", color: "#fff" }}>
                      {j.userFullName || "Employé"}
                    </td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                      {new Date(j.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td style={{ padding: "12px", color: "var(--warning)", fontWeight: "600" }}>
                      {j.heureEntree ? new Date(j.heureEntree).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={j.justificationMotif}>
                      {j.justificationMotif}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {j.justificatifFichier ? (
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.7rem",
                            borderRadius: "5px",
                            borderColor: "rgba(139, 92, 246, 0.2)",
                            background: "rgba(139, 92, 246, 0.08)",
                            color: "var(--primary)",
                            cursor: "pointer"
                          }}
                          onClick={() => setJustifyImageModal(j.justificatifFichier)}
                        >
                          👁️ Afficher
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Aucune</span>
                      )}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          className="btn btn-success"
                          style={{
                            padding: "5px 10px",
                            fontSize: "0.75rem",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "var(--success)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            cursor: "pointer"
                          }}
                          onClick={() => handleModerateJustification(j.id, "APPROUVEE")}
                        >
                          Accepter
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{
                            padding: "5px 10px",
                            fontSize: "0.75rem",
                            borderRadius: "6px",
                            background: "rgba(244, 63, 94, 0.15)",
                            color: "var(--danger)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            cursor: "pointer"
                          }}
                          onClick={() => handleModerateJustification(j.id, "REJETEE")}
                        >
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🖼️ MODAL D'APERCU DU DOCUMENT JUSTIFICATIF */}
      {justifyImageModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: "20px"
        }} onClick={() => setJustifyImageModal(null)}>
          <div className="glass-card" style={{
            maxWidth: "90%",
            maxHeight: "90%",
            background: "#12141d",
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
          }} onClick={(e) => e.stopPropagation()}>
            <button
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--danger)",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
              }}
              onClick={() => setJustifyImageModal(null)}
            >
              ✕
            </button>
            {justifyImageModal.startsWith("data:application/pdf") ? (
              <iframe
                src={justifyImageModal}
                style={{ width: "800px", height: "550px", border: "none", borderRadius: "8px" }}
                title="Aperçu Justificatif PDF"
              ></iframe>
            ) : (
              <img
                src={justifyImageModal}
                alt="Justificatif"
                style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: "8px", objectFit: "contain" }}
              />
            )}
          </div>
        </div>
      )}

      {/* MONTHLY SUMMARY METRICS */}
      <div style={styles.monthStatsGrid}>
        <div className="glass-card" style={styles.monthCard}>
          <CalendarDays size={20} color="var(--primary)" />
          <div style={styles.monthText}>
            <div style={styles.monthLabel}>Volume Horaire Mensuel</div>
            <div style={styles.monthValue}>{stats.heuresTravailleesMois} h</div>
          </div>
        </div>

        <div className="glass-card" style={styles.monthCard}>
          <Hourglass size={20} color="var(--warning)" />
          <div style={styles.monthText}>
            <div style={styles.monthLabel}>Demandes de Congé en attente</div>
            <div style={{ ...styles.monthValue, color: stats.congesEnAttente > 0 ? "var(--warning)" : "#fff" }}>
              {stats.congesEnAttente}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER (SVG CHART) */}
      <div className="glass-card" style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <TrendingUp size={18} color="var(--primary)" />
          <span style={styles.chartTitle}>Historique d'Activité sur 12 Mois</span>
        </div>

        {monthlyData.length === 0 ? (
          <div style={styles.noChartData}>Aucune donnée historique à afficher</div>
        ) : (
          <div style={styles.chartWrapper}>
            {/* SVG Visual Graph */}
            <svg viewBox="0 0 800 280" style={styles.svg}>
              {/* Grid Lines */}
              <line x1="50" y1="40" x2="760" y2="40" stroke="rgba(255,255,255,0.03)" />
              <line x1="50" y1="90" x2="760" y2="90" stroke="rgba(255,255,255,0.03)" />
              <line x1="50" y1="140" x2="760" y2="140" stroke="rgba(255,255,255,0.03)" />
              <line x1="50" y1="190" x2="760" y2="190" stroke="rgba(255,255,255,0.03)" />
              <line x1="50" y1="240" x2="760" y2="240" stroke="rgba(255,255,255,0.1)" />

              {/* Bar charts generation */}
              {monthlyData.map((d, index) => {
                const barWidth = 36;
                const gap = (700 - barWidth * monthlyData.length) / (monthlyData.length + 1);
                const x = 60 + index * (barWidth + gap);
                
                // Scale heights based on maxPresence
                const heightPresence = maxPresence > 0 ? (d.presences / maxPresence) * 160 : 0;
                const heightRetard = maxPresence > 0 ? (d.retards / maxPresence) * 160 : 0;
                
                const yPresence = 240 - heightPresence;
                const yRetard = 240 - heightRetard;

                return (
                  <g key={d.mois}>
                    {/* Presence Bar (Purple Glow) */}
                    <rect
                      x={x}
                      y={yPresence}
                      width={barWidth}
                      height={heightPresence}
                      fill="url(#presenceGrad)"
                      rx="4"
                    />

                    {/* Lates Bar overlapping/accentuating (Warning Glow) */}
                    {d.retards > 0 && (
                      <rect
                        x={x + 10}
                        y={yRetard}
                        width={barWidth - 20}
                        height={heightRetard}
                        fill="url(#retardGrad)"
                        rx="2"
                      />
                    )}

                    {/* Month Label */}
                    <text
                      x={x + barWidth / 2}
                      y="260"
                      fill="var(--text-secondary)"
                      fontSize="9.5"
                      textAnchor="middle"
                    >
                      {d.mois.substring(5)}/{d.mois.substring(2,4)}
                    </text>

                    {/* Hover labels inside bar */}
                    <text
                      x={x + barWidth / 2}
                      y={yPresence - 8}
                      fill="#fff"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {d.presences}
                    </text>
                  </g>
                );
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="presenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="retardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>

            {/* Legends */}
            <div style={styles.chartLegend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background: "var(--primary)" }}></div>
                <span>Présences (Nombre de scans valides)</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background: "var(--warning)" }}></div>
                <span>Retards détectés</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GLASSMORPHIC EMPLOYEE HISTORY DIALOG */}
      {showHistoryModal && historyEmployee && (() => {
        const uniqueMonths = Array.from(new Set(historyPointages.map(p => p.date.substring(0, 7)))).sort().reverse();
        const filteredHistoryPointages = historyPointages.filter(p => {
          if (selectedMonthFilter === "all") return true;
          return p.date.startsWith(selectedMonthFilter);
        });

        return (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}>
            <div className="glass-card" style={{
              width: "100%",
              maxWidth: "800px",
              padding: "28px",
              background: "rgba(18, 20, 29, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              borderRadius: "16px",
              animation: "fadeIn 0.2s ease"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                paddingBottom: "14px"
              }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                  Historique de Présence - {historyEmployee.fullName}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {historyPointages.length > 0 && (
                    <>
                      <select
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "#fff",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          padding: "6px 10px",
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

                      <button
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          borderRadius: "6px",
                          borderColor: "rgba(16, 185, 129, 0.2)",
                          background: "rgba(16, 185, 129, 0.08)",
                          color: "var(--success)"
                        }}
                        onClick={() => handleExportCSV(filteredHistoryPointages, `Presence_${historyEmployee.fullName}`)}
                      >
                        📊 Excel / CSV
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          borderRadius: "6px",
                          borderColor: "rgba(139, 92, 246, 0.2)",
                          background: "rgba(139, 92, 246, 0.08)",
                          color: "var(--primary)"
                        }}
                        onClick={() => handleExportPDF(filteredHistoryPointages, historyEmployee.fullName)}
                      >
                        🖨️ Imprimer PDF
                      </button>
                    </>
                  )}
                <button 
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingLeft: "6px"
                  }} 
                  onClick={() => setShowHistoryModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
              {loadingHistory ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    border: "4px solid rgba(255, 255, 255, 0.1)",
                    borderTopColor: "var(--primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></div>
                </div>
              ) : historyPointages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Calendar size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>Aucun pointage enregistré pour cet employé.</p>
                </div>
              ) : (
                <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "12px" }}>Date</th>
                      <th style={{ textAlign: "left", padding: "12px" }}>Arrivée</th>
                      <th style={{ textAlign: "left", padding: "12px" }}>Départ</th>
                      <th style={{ textAlign: "left", padding: "12px" }}>Statut</th>
                      <th style={{ textAlign: "left", padding: "12px" }}>Durée</th>
                      <th style={{ textAlign: "left", padding: "12px" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryPointages.map((p) => {
                      const formattedDate = new Date(p.date).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                      
                      const formatTime = (dateTimeString) => {
                        if (!dateTimeString) return "--:--";
                        return new Date(dateTimeString).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      };

                      const formatDuration = (minutes) => {
                        if (!minutes) return "-";
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h}h ${m}m`;
                      };

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td style={{ padding: "12px", color: "#fff", fontWeight: "600", textTransform: "capitalize" }}>
                            {formattedDate}
                          </td>
                          <td style={{ padding: "12px", color: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>🟢 {formatTime(p.heureEntree)}</span>
                              {p.photoEntree && (
                                <button 
                                  type="button" 
                                  style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "inline-flex", padding: 0 }}
                                  onClick={() => setPreviewSelfieModal({ photo: p.photoEntree, title: `Selfie d'entrée - ${historyEmployee.fullName}`, time: formatTime(p.heureEntree), date: formattedDate })}
                                  title="Voir la photo d'entrée"
                                >
                                  📷
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                            {p.heureSortie ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>🔴 {formatTime(p.heureSortie)}</span>
                                {p.photoSortie && (
                                  <button 
                                    type="button" 
                                    style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "inline-flex", padding: 0 }}
                                    onClick={() => setPreviewSelfieModal({ photo: p.photoSortie, title: `Selfie de sortie - ${historyEmployee.fullName}`, time: formatTime(p.heureSortie), date: formattedDate })}
                                    title="Voir la photo de sortie"
                                  >
                                    📷
                                  </button>
                                )}
                              </div>
                            ) : "Non pointé"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                              {p.enRetard ? (
                                <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>⚠️ Retard</span>
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>🟢 À temps</span>
                              )}
                              {p.sortieAnticipee && (
                                <span className="badge" style={{ fontSize: "0.75rem", background: "rgba(244, 63, 94, 0.15)", color: "var(--danger)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                                  🚪 Sortie Anticipée
                                </span>
                              )}
                              {p.heuresInsuffisantes && (
                                <span className="badge" style={{ fontSize: "0.75rem", background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                                  ⏱️ Heures &lt; 8h
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px", color: "#fff", fontWeight: "500" }}>
                            {formatDuration(p.dureeMinutes)}
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                            {p.note || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      );
    })()}

      {/* 📷 MODAL D'APERCU DES SELFIES DE POINTAGE */}
      {previewSelfieModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: "20px"
        }} onClick={() => setPreviewSelfieModal(null)}>
          <div className="glass-card" style={{
            maxWidth: "400px",
            width: "100%",
            background: "#12141d",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            animation: "fadeIn 0.2s ease"
          }} onClick={(e) => e.stopPropagation()}>
            <button
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onClick={() => setPreviewSelfieModal(null)}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", marginBottom: "15px", width: "100%", textAlign: "left", paddingRight: "30px" }}>
              {previewSelfieModal.title}
            </h3>
            <img
              src={previewSelfieModal.photo}
              alt="Selfie"
              style={{ width: "100%", height: "280px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border-color)", marginBottom: "15px" }}
            />
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <span>Heure: <strong>{previewSelfieModal.time}</strong></span>
              {previewSelfieModal.date && <span>Date: <strong>{previewSelfieModal.date}</strong></span>}
            </div>
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
    justifyContent: "space-between",
    marginBottom: "24px",
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
  refreshBtn: {
    padding: "8px 14px",
    fontSize: "0.8rem",
    borderRadius: "6px",
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
  errorCard: {
    padding: "40px",
    textAlign: "center",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  kpiCard: {
    padding: "24px",
    background: "rgba(18, 20, 29, 0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  kpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: "600",
  },
  kpiIconWrapper: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "#fff",
    fontFamily: "var(--font-heading)",
  },
  kpiSub: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  monthStatsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "24px",
  },
  monthCard: {
    padding: "20px",
    background: "rgba(18, 20, 29, 0.3)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  monthText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  monthLabel: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: "500",
  },
  monthValue: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#fff",
  },
  chartCard: {
    padding: "28px",
    background: "rgba(18, 20, 29, 0.4)",
  },
  chartHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "16px",
    marginBottom: "20px",
  },
  chartTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#fff",
  },
  noChartData: {
    padding: "40px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
  },
  chartWrapper: {
    width: "100%",
  },
  svg: {
    width: "100%",
    height: "auto",
  },
  chartLegend: {
    display: "flex",
    justifyContent: "center",
    gap: "24px",
    marginTop: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.03)",
    paddingTop: "16px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "3px",
  },
  listCard: {
    padding: "24px",
    background: "rgba(18, 20, 29, 0.4)",
    marginBottom: "24px",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px",
  },
  listTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#fff",
  }
};

// Add responsive rules simulation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @media (max-width: 600px) {
      div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
