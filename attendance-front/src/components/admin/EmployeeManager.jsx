import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Save, 
  ShieldCheck, 
  Filter,
  Calendar,
  Clock
} from "lucide-react";

export default function EmployeeManager() {
  const { showNotification } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null means "Create", otherwise "Edit"
  
  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [historyPointages, setHistoryPointages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [poste, setPoste] = useState("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [photoProfile, setPhotoProfile] = useState("");

  const handleOpenHistory = async (emp) => {
    setHistoryEmployee(emp);
    setHistoryPointages([]);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const data = await api.pointages.getByUser(emp.id);
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

  const fetchEmployees = async () => {
    try {
      const data = await api.users.getAll();
      if (data) {
        setEmployees(data);
        setFilteredEmployees(data);
      }
    } catch (err) {
      showNotification("Impossible de charger la liste des employés", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter and search handling
  useEffect(() => {
    let result = employees;

    if (search.trim() !== "") {
      const query = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.firstName.toLowerCase().includes(query) ||
          e.lastName.toLowerCase().includes(query) ||
          e.email.toLowerCase().includes(query)
      );
    }

    if (deptFilter !== "ALL") {
      result = result.filter((e) => e.department === deptFilter);
    }

    setFilteredEmployees(result);
  }, [search, deptFilter, employees]);

  // Extract unique departments for filter dropdown
  const departments = ["ALL", ...new Set(employees.map((e) => e.department).filter(Boolean))];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showNotification("La photo est trop volumineuse (maximum 2Mo)", "warning");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoProfile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setDepartment("");
    setPoste("");
    setIsAdminRole(false);
    setPhotoProfile("");
    setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingId(emp.id);
    setFirstName(emp.firstName || "");
    setLastName(emp.lastName || "");
    setEmail(emp.email || "");
    setPassword(""); // Do not populate password for security
    setPhone(emp.phone || "");
    setDepartment(emp.department || "");
    setPoste(emp.poste || "");
    setIsAdminRole(emp.roles?.includes("ROLE_ADMIN") || false);
    setPhotoProfile(emp.photoProfile || "");
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'employé "${name}" ?`)) {
      return;
    }

    try {
      await api.users.delete(id);
      showNotification(`Employé "${name}" supprimé avec succès`, "success");
      fetchEmployees();
    } catch (err) {
      showNotification(err.message || "Erreur de suppression", "danger");
    }
  };

  const handleToggleStatus = async (id, name) => {
    try {
      await api.users.toggleStatus(id);
      showNotification("Statut de l'employé mis à jour", "success");
      fetchEmployees();
    } catch (err) {
      showNotification(err.message || "Impossible de modifier le statut", "danger");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || (!editingId && !password)) {
      showNotification("Veuillez remplir les champs obligatoires (Prénom, Nom, Email, Mot de passe)", "danger");
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      department,
      poste,
      roles: isAdminRole ? ["ROLE_ADMIN", "ROLE_EMPLOYE"] : ["ROLE_EMPLOYE"],
      photoProfile,
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (editingId) {
        await api.users.update(editingId, payload);
        showNotification("Fiche employé mise à jour avec succès !", "success");
      } else {
        await api.users.create(payload);
        showNotification("Nouvel employé créé avec succès !", "success");
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      showNotification(err.message || "Erreur lors de l'enregistrement de l'employé", "danger");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <Users size={24} color="var(--primary)" />
          <h2 style={styles.title}>Gestion des Employés</h2>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <UserPlus size={16} />
          Ajouter un Employé
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="glass-card" style={styles.searchCard}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "44px" }}
            placeholder="Rechercher par nom, prénom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filterWrapper}>
          <Filter size={16} style={styles.filterIcon} />
          <select
            className="form-input"
            style={styles.filterSelect}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d} value={d} style={{ background: "#1a1d2b" }}>
                {d === "ALL" ? "Tous les Départements" : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* EMPLOYEES TABLE */}
      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <h3>Aucun employé trouvé</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Ajustez vos filtres de recherche ou créez une nouvelle fiche employé !
          </p>
        </div>
      ) : (
        <div className="glass-card table-container" style={styles.tableCard}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Email</th>
                <th>Département</th>
                <th>Poste</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: "600", color: "#fff" }}>
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td>{emp.email}</td>
                  <td>{emp.department || "-"}</td>
                  <td>{emp.poste || "-"}</td>
                  <td>
                    {emp.roles?.includes("ROLE_ADMIN") ? (
                      <span className="badge badge-info" style={{ gap: "4px" }}>
                        <ShieldCheck size={10} />
                        Admin
                      </span>
                    ) : (
                      <span className="badge badge-success">Employé</span>
                    )}
                  </td>
                  <td>
                    <button
                      style={styles.toggleBtn}
                      onClick={() => handleToggleStatus(emp.id, `${emp.firstName} ${emp.lastName}`)}
                      title={emp.active ? "Désactiver le compte" : "Activer le compte"}
                    >
                      {emp.active ? (
                        <ToggleRight size={32} color="var(--success)" />
                      ) : (
                        <ToggleLeft size={32} color="var(--text-muted)" />
                      )}
                    </button>
                  </td>
                  <td>
                    <div style={styles.actionRow}>
                      <button
                        className="btn btn-secondary"
                        style={{ ...styles.editBtn, background: "rgba(139, 92, 246, 0.12)", border: "1px solid rgba(139, 92, 246, 0.3)" }}
                        onClick={() => handleOpenHistory(emp)}
                        title="Voir l'historique"
                      >
                        <Calendar size={12} color="var(--primary)" />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={styles.editBtn}
                        onClick={() => handleOpenEdit(emp)}
                        title="Modifier"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(emp.id, `${emp.firstName} ${emp.lastName}`)}
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GLASSMORPHIC CREATE/EDIT DIALOG (MODAL) */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingId ? "Modifier l'Employé" : "Ajouter un Nouvel Employé"}
              </h3>
              <button style={styles.closeModalBtn} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.modalForm}>
              <div style={styles.formRow}>
                <div className="input-group">
                  <label className="input-label">Prénom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Adresse Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!editingId} // Email immutable on edit
                />
              </div>

              <div className="input-group">
                <label className="input-label">
                  Mot de passe {editingId ? "(Laissez vide pour conserver)" : "*"}
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={editingId ? "••••••••" : "Entrez le mot de passe"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div style={styles.formRow}>
                <div className="input-group">
                  <label className="input-label">Téléphone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Département</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: R&D, RH, Marketing"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Poste de Travail</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Développeur Full-Stack, Designer"
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ marginBottom: "20px" }}>
                <label className="input-label">Photo de Profil de l'employé</label>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  {photoProfile ? (
                    <img 
                      src={photoProfile} 
                      alt="Aperçu" 
                      style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)" }} 
                    />
                  ) : (
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "5px" }}>
                      Pas de photo
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoChange}
                      style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                    />
                    {photoProfile && (
                      <button 
                        type="button" 
                        onClick={() => setPhotoProfile("")} 
                        style={{ display: "block", marginTop: "5px", background: "none", border: "none", color: "var(--danger)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                      >
                        Supprimer la photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.roleCheckbox}>
                <input
                  type="checkbox"
                  id="adminRole"
                  style={styles.checkbox}
                  checked={isAdminRole}
                  onChange={(e) => setIsAdminRole(e.target.checked)}
                />
                <label htmlFor="adminRole" style={styles.checkboxLabel}>
                  Attribuer les droits d'administration (Rôle Admin)
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={styles.modalSubmit}>
                <Save size={16} />
                Enregistrer l'Employé
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GLASSMORPHIC EMPLOYEE HISTORY DIALOG */}
      {showHistoryModal && historyEmployee && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={{ ...styles.modalContent, maxWidth: "800px" }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Historique de Présence - {historyEmployee.firstName} {historyEmployee.lastName}
              </h3>
              <button style={styles.closeModalBtn} onClick={() => setShowHistoryModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
              {loadingHistory ? (
                <div style={styles.loaderContainer}>
                  <div style={styles.spinner}></div>
                </div>
              ) : historyPointages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Calendar size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
                  <p style={{ color: "var(--text-secondary)" }}>Aucun pointage enregistré pour cet employé.</p>
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
                    {historyPointages.map((p) => {
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
                            🟢 {formatTime(p.heureEntree)}
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                            {p.heureSortie ? `🔴 ${formatTime(p.heureSortie)}` : "Non pointé"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {p.enRetard ? (
                              <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>Retard</span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>À temps</span>
                            )}
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
  searchCard: {
    padding: "20px",
    background: "rgba(18, 20, 29, 0.4)",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "16px",
    marginBottom: "24px",
    alignItems: "center",
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
  },
  filterWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  filterIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  filterSelect: {
    paddingLeft: "40px",
    background: "#1a1d2b",
    cursor: "pointer",
  },
  tableCard: {
    padding: "8px",
    background: "rgba(18, 20, 29, 0.4)",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
  },
  editBtn: {
    padding: "6px 10px",
    borderRadius: "6px",
  },
  deleteBtn: {
    padding: "6px 10px",
    borderRadius: "6px",
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
    padding: "50px 20px",
    textAlign: "center",
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
    padding: "20px",
  },
  modalContent: {
    width: "100%",
    maxWidth: "520px",
    background: "rgba(18, 20, 29, 0.95)",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    padding: "32px",
    borderRadius: "20px",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "16px",
    marginBottom: "20px",
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
  modalForm: {
    display: "flex",
    flexDirection: "column",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  roleCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "8px 0 24px 0",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "var(--primary)",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
    cursor: "pointer",
  },
  modalSubmit: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
  }
};

// Add responsive rules simulation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @media (max-width: 768px) {
      div[style*="grid-template-columns: 1.2fr 0.8fr"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
