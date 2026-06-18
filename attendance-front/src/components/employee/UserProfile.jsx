import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useNotification } from "../../context/GlobalContext";
import { User, Mail, Phone, Briefcase, Network, ToggleLeft, Calendar, ShieldCheck, Camera } from "lucide-react";

export default function UserProfile() {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.users.getProfile();
        setProfile(data);
      } catch (err) {
        showNotification("Impossible de charger le profil", "danger");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification("La photo ne doit pas dépasser 2 Mo", "danger");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result;
        await api.users.updateProfilePhoto(base64String);
        setProfile(prev => ({ ...prev, photoProfile: base64String }));
        showNotification("Photo de profil mise à jour avec succès !", "success");
      } catch (err) {
        showNotification("Erreur lors de la mise à jour de la photo", "danger");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <User size={24} color="var(--primary)" />
        <h2 style={styles.title}>Mon Profil</h2>
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : !profile ? (
        <div className="glass-card" style={styles.errorCard}>
          <h3>Erreur de chargement</h3>
          <p>Une erreur est survenue lors de la récupération de vos données de profil.</p>
        </div>
      ) : (
        <div className="glass-card" style={styles.profileCard}>
          {/* Avatar Area */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarGlow}></div>
            <label style={styles.avatarContainer} title="Changer de photo de profil">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                style={{ display: "none" }} 
              />
              <div style={styles.avatar}>
                {profile.photoProfile ? (
                  <img 
                    src={profile.photoProfile} 
                    alt="Profile" 
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "inherit"
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "2.5rem" }}>
                    {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                  </span>
                )}
                <div className="avatar-hover-overlay" style={styles.avatarHoverOverlay}>
                  <Camera size={24} color="#fff" />
                </div>
              </div>
            </label>
            
            <h3 style={styles.fullName}>
              {profile.firstName} {profile.lastName}
            </h3>
            
            <div style={styles.roleBadgeContainer}>
              {profile.roles?.map((role) => (
                <span key={role} className="badge badge-info" style={styles.roleBadge}>
                  <ShieldCheck size={12} />
                  {role === "ROLE_ADMIN" ? "Administrateur" : "Employé"}
                </span>
              ))}

              <span className={`badge ${profile.active ? "badge-success" : "badge-danger"}`}>
                <ToggleLeft size={12} />
                {profile.active ? "Compte Actif" : "Compte Inactif"}
              </span>
            </div>
          </div>

          {/* Details Section */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <Mail size={18} color="var(--primary)" />
              <div style={styles.detailText}>
                <div style={styles.detailLabel}>Adresse Email</div>
                <div style={styles.detailValue}>{profile.email}</div>
              </div>
            </div>

            <div style={styles.detailItem}>
              <Phone size={18} color="var(--primary)" />
              <div style={styles.detailText}>
                <div style={styles.detailLabel}>Téléphone</div>
                <div style={styles.detailValue}>{profile.phone || <span style={{ color: "var(--text-muted)" }}>Non renseigné</span>}</div>
              </div>
            </div>

            <div style={styles.detailItem}>
              <Briefcase size={18} color="var(--primary)" />
              <div style={styles.detailText}>
                <div style={styles.detailLabel}>Poste</div>
                <div style={styles.detailValue}>{profile.poste || <span style={{ color: "var(--text-muted)" }}>Non renseigné</span>}</div>
              </div>
            </div>

            <div style={styles.detailItem}>
              <Network size={18} color="var(--primary)" />
              <div style={styles.detailText}>
                <div style={styles.detailLabel}>Département / Service</div>
                <div style={styles.detailValue}>{profile.department || <span style={{ color: "var(--text-muted)" }}>Non renseigné</span>}</div>
              </div>
            </div>

            <div style={{ ...styles.detailItem, gridColumn: "span 2" }}>
              <Calendar size={18} color="var(--primary)" />
              <div style={styles.detailText}>
                <div style={styles.detailLabel}>Membre depuis le</div>
                <div style={styles.detailValue}>
                  {profile.createdAt ? formatDate(profile.createdAt) : "Non renseigné"}
                </div>
              </div>
            </div>
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
  errorCard: {
    padding: "40px",
    textAlign: "center",
    color: "var(--danger)",
  },
  profileCard: {
    padding: "40px",
    background: "rgba(18, 20, 29, 0.5)",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    alignItems: "center",
  },
  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  avatarGlow: {
    position: "absolute",
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)",
    top: "-10px",
    zIndex: 1,
    filter: "blur(5px)",
  },
  avatarContainer: {
    cursor: "pointer",
    zIndex: 2,
  },
  avatar: {
    position: "relative",
    width: "120px",
    height: "120px",
    borderRadius: "32px",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    color: "#fff",
    fontSize: "2.8rem",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 25px rgba(139, 92, 246, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  avatarHoverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.3s ease",
    borderRadius: "inherit",
  },
  fullName: {
    fontSize: "1.6rem",
    fontWeight: "800",
    color: "#fff",
    marginTop: "20px",
    fontFamily: "var(--font-heading)",
  },
  roleBadgeContainer: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
  },
  roleBadge: {
    gap: "4px",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    width: "100%",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    paddingTop: "32px",
  },
  detailItem: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  detailText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  detailLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "#fff",
  }
};

// Add responsive rules simulation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    label:hover .avatar-hover-overlay {
      opacity: 1 !important;
    }
    @media (max-width: 768px) {
      div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
