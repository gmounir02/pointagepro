import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/GlobalContext";
import { api } from "../../services/api";
import {
  LayoutDashboard,
  QrCode,
  Users,
  CalendarDays,
  Settings,
  Fingerprint,
  History,
  User,
  LogOut,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Calendar,
  ShieldAlert
} from "lucide-react";

export default function Layout({ activeTab, setActiveTab, children }) {
  const { user, logout } = useAuth();
  const isAdmin = user && user.roles.includes("ROLE_ADMIN");

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [photoProfile, setPhotoProfile] = useState(null);
  
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const desktopBellRef = useRef(null);
  const mobileBellRef = useRef(null);

  // Fetch Profile Photo
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      try {
        if (user) {
          const profile = await api.users.getProfile();
          if (profile && profile.photoProfile) {
            setPhotoProfile(profile.photoProfile);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile photo in layout", err);
      }
    };
    fetchProfilePhoto();
  }, [user]);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      if (user) {
        const res = await api.notifications.getAll();
        if (res) {
          setNotifications(res);
          setUnreadCount(res.filter((n) => !n.read).length);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideDesktop = 
        (desktopDropdownRef.current && desktopDropdownRef.current.contains(e.target)) ||
        (desktopBellRef.current && desktopBellRef.current.contains(e.target));
        
      const clickedInsideMobile = 
        (mobileDropdownRef.current && mobileDropdownRef.current.contains(e.target)) ||
        (mobileBellRef.current && mobileBellRef.current.contains(e.target));

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowNotificationsDropdown(false);
      }
    };
    // Use both mousedown (desktop) and touchstart (mobile)
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.notifications.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.notifications.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    console.log("Notification clicked:", notif);
    
    // 1. Mark as read immediately if not already read
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }

    // 2. Navigate based on notification type (independent of user role)
    if (notif.type === "NEW_JUSTIFICATION") {
      setActiveTab("justifications");
    } else if (notif.type === "NEW_LEAVE") {
      setActiveTab("conges");
    } else if (notif.type === "LEAVE_APPROVED" || notif.type === "LEAVE_REJECTED") {
      setActiveTab("mes-conges");
    } else if (notif.type === "JUSTIFICATION_APPROVED" || notif.type === "JUSTIFICATION_REJECTED") {
      setActiveTab("historique");
    }

    // 3. Close dropdown
    setShowNotificationsDropdown(false);
  };

  // Admin Sidebar Navigation Items
  const adminNavItems = [
    { id: "dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
    { id: "qrcodes", label: "Codes QR", icon: QrCode },
    { id: "employees", label: "Employés", icon: Users },
    { id: "conges", label: "Congés", icon: CalendarDays },
    { id: "justifications", label: "Justifications", icon: ShieldAlert },
    { id: "settings", label: "Configuration", icon: Settings },
  ];

  // Employee Navigation Items
  const employeeNavItems = [
    { id: "pointage", label: "Pointer", icon: Fingerprint },
    { id: "historique", label: "Historique", icon: History },
    { id: "mes-conges", label: "Mes Congés", icon: CalendarDays },
    { id: "profil", label: "Mon Profil", icon: User },
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;
  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  // Format notification type icons
  const getNotificationIcon = (type) => {
    switch (type) {
      case "JUSTIFICATION_APPROVED":
      case "LEAVE_APPROVED":
        return <CheckCircle2 size={16} color="var(--success)" />;
      case "JUSTIFICATION_REJECTED":
      case "LEAVE_REJECTED":
        return <XCircle size={16} color="var(--danger)" />;
      case "NEW_JUSTIFICATION":
        return <AlertTriangle size={16} color="var(--warning)" />;
      case "NEW_LEAVE":
        return <Calendar size={16} color="var(--primary)" />;
      default:
        return <Info size={16} color="var(--info)" />;
    }
  };

  return (
    <div className="main-layout" style={styles.container}>
      {/* 💻 DESKTOP SIDEBAR */}
      <aside className="sidebar-desktop" style={styles.sidebar}>
        <div style={styles.logoArea}>
          <img src="/favicon.svg" alt="Logo" style={{ width: "28px", height: "28px" }} />
          <span style={styles.logoText}>ATTENDANCE</span>
        </div>

        <nav style={styles.navMenu}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {}),
                }}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} color={isActive ? "var(--primary)" : "var(--text-secondary)"} />
                <span>{item.label}</span>
                {isActive && <div style={styles.activeIndicator}></div>}
              </button>
            );
          })}
        </nav>

        <div style={styles.userProfile}>
          <div style={styles.avatar}>
            {photoProfile ? (
              <img 
                src={photoProfile} 
                alt="Profile" 
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "inherit"
                }}
              />
            ) : (
              user?.fullName?.charAt(0) || "U"
            )}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.fullName}</div>
            <div style={styles.userRole}>{isAdmin ? "Administrateur" : "Employé"}</div>
          </div>
          <button 
            onClick={logout} 
            style={styles.logoutBtn} 
            title="Se déconnecter"
          >
            <LogOut size={16} color="var(--danger)" />
          </button>
        </div>
      </aside>

      {/* 🖥️ DESKTOP TOP HEADER & MOBILE LAYOUT */}
      <div style={styles.mainWrapper}>
        
        {/* 💻 DESKTOP ONLY TOP HEADER BAR */}
        <header className="desktop-header" style={styles.desktopHeader}>
          <h2 style={styles.desktopHeaderTitle}>{activeItem?.label}</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>

            {/* Notification Bell */}
            <button 
              ref={desktopBellRef}
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              style={styles.bellButton}
              title="Notifications"
            >
              <Bell size={20} color="var(--text-primary)" />
              {unreadCount > 0 && (
                <span className="bell-badge" style={styles.bellBadge}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown menu */}
            {showNotificationsDropdown && (
              <div ref={desktopDropdownRef} className="glass-card" style={styles.notificationsDropdown}>
                <div style={styles.dropdownHeader}>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem", fontWeight: "700" }}>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} style={styles.markAllReadBtn}>
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div style={styles.dropdownList}>
                  {notifications.length === 0 ? (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: "1.5rem" }}>🔔</span>
                      <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Aucune notification pour le moment
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        style={{
                          ...styles.notificationItem,
                          background: notif.read ? "transparent" : "rgba(139, 92, 246, 0.09)",
                          borderLeft: notif.read ? "none" : "3px solid var(--primary)",
                          paddingLeft: notif.read ? "16px" : "13px"
                        }}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <div style={styles.notifIconBox}>
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontWeight: notif.read ? "500" : "700", color: "#fff", fontSize: "0.82rem" }}>
                                {notif.title}
                              </div>
                              {!notif.read && <div style={styles.unreadDot}></div>}
                            </div>
                            <p style={{ margin: "3px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                              {notif.message}
                            </p>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                              {new Date(notif.createdAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 📱 MOBILE HEADER & BOTTOM NAV */}
        <header style={styles.mobileHeader}>
          <div style={styles.mobileHeaderLeft}>
            <img src="/favicon.svg" alt="Logo" style={{ width: "22px", height: "22px" }} />
            <span style={styles.mobileHeaderTitle}>{activeItem?.label}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative", zIndex: 200 }}>

            {/* Mobile Notification bell */}
            <button 
              ref={mobileBellRef}
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              style={{ ...styles.mobileBellButton, padding: "8px", minWidth: "40px", minHeight: "40px", justifyContent: "center" }}
            >
              <Bell size={20} color="var(--text-primary)" />
              {unreadCount > 0 && (
                <span style={{ ...styles.bellBadge, width: "14px", height: "14px", fontSize: "0.6rem" }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Mobile Notifications Dropdown */}
            {showNotificationsDropdown && (
              <div ref={mobileDropdownRef} className="glass-card" style={styles.mobileNotificationsDropdown}>
                <div style={styles.dropdownHeader}>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem", fontWeight: "700" }}>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} style={styles.markAllReadBtn}>
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div style={styles.dropdownList}>
                  {notifications.length === 0 ? (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: "1.5rem" }}>🔔</span>
                      <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Aucune notification pour le moment
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        style={{
                          ...styles.notificationItem,
                          background: notif.read ? "transparent" : "rgba(139, 92, 246, 0.09)",
                          borderLeft: notif.read ? "none" : "3px solid var(--primary)",
                          paddingLeft: notif.read ? "16px" : "13px"
                        }}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <div style={styles.notifIconBox}>
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontWeight: notif.read ? "500" : "700", color: "#fff", fontSize: "0.82rem" }}>
                                {notif.title}
                              </div>
                              {!notif.read && <div style={styles.unreadDot}></div>}
                            </div>
                            <p style={{ margin: "3px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                              {notif.message}
                            </p>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                              {new Date(notif.createdAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="content-area" style={styles.content}>
          {children}
        </main>

        <nav style={styles.mobileBottomNav} className="mobile-bottom-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className="mobile-nav-item"
                style={{
                  ...styles.mobileNavItem,
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                }}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={22} style={isActive ? styles.mobileIconActive : {}} />
                <span className="mobile-nav-label" style={styles.mobileNavLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "var(--bg-base)",
    width: "100%",
    minHeight: "100vh",
    transition: "background-color var(--transition-smooth)",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    background: "rgba(12, 14, 23, 0.8)",
    borderRight: "1px solid var(--border-color)",
    transition: "background var(--transition-smooth), border-color var(--transition-smooth)",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingBottom: "30px",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "24px",
  },
  logoText: {
    fontFamily: "var(--font-heading)",
    fontWeight: "800",
    fontSize: "1.2rem",
    color: "#fff",
    letterSpacing: "0.05em",
  },
  navMenu: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
  navLink: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "none",
    border: "none",
    padding: "14px 18px",
    borderRadius: "10px",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    fontWeight: "500",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
    width: "100%",
  },
  navLinkActive: {
    background: "rgba(139, 92, 246, 0.08)",
    color: "#ffffff",
    fontWeight: "600",
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: "20%",
    height: "60%",
    width: "4px",
    background: "var(--primary)",
    borderRadius: "0 4px 4px 0",
    boxShadow: "0 0 10px var(--primary)",
  },
  userProfile: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 12px",
    borderTop: "1px solid var(--border-color)",
    marginTop: "auto",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "1.1rem",
    boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)",
    overflow: "hidden",
  },
  userInfo: {
    flex: 1,
    overflow: "hidden",
  },
  userName: {
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userRole: {
    color: "var(--text-muted)",
    fontSize: "0.75rem",
  },
  logoutBtn: {
    background: "rgba(244, 63, 94, 0.05)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  mainWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  desktopHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 40px",
    background: "rgba(10, 11, 16, 0.35)",
    backdropFilter: "blur(var(--glass-blur))",
    borderBottom: "1px solid var(--border-color)",
    position: "relative",
    zIndex: 100,
  },
  desktopHeaderTitle: {
    fontFamily: "var(--font-heading)",
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#fff",
  },
  themeToggle: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid var(--border-color)",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  bellButton: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid var(--border-color)",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    transition: "var(--transition-smooth)",
  },
  bellBadge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    background: "var(--danger)",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: "700",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 8px rgba(244, 63, 94, 0.5)",
  },
  notificationsDropdown: {
    position: "absolute",
    top: "50px",
    right: "0",
    width: "360px",
    background: "#12141d",
    border: "1px solid var(--border-color-glow)",
    borderRadius: "14px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
    zIndex: 200,
    overflow: "hidden",
    animation: "fadeInUp 0.25s ease-out",
  },
  mobileNotificationsDropdown: {
    position: "fixed",
    top: "64px",
    left: "12px",
    right: "12px",
    width: "auto",
    background: "#12141d",
    border: "1px solid var(--border-color-glow)",
    borderRadius: "14px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
    overflow: "hidden",
    animation: "fadeInUp 0.25s ease-out",
    maxHeight: "70vh",
    overflowY: "auto",
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  markAllReadBtn: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.72rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  dropdownList: {
    maxHeight: "360px",
    overflowY: "auto",
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
  },
  notificationItem: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  notifIconBox: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--primary)",
    boxShadow: "0 0 6px var(--primary)",
  },
  mobileHeader: {
    display: "none",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    background: "rgba(10, 11, 16, 0.9)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border-color)",
    position: "sticky",
    top: 0,
    zIndex: 90,
  },
  mobileHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  mobileHeaderTitle: {
    fontFamily: "var(--font-heading)",
    fontWeight: "700",
    fontSize: "1.1rem",
    color: "#fff",
  },
  mobileThemeToggle: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  mobileBellButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  mobileLogoutBtn: {
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  mobileBottomNav: {
    display: "none",
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "68px",
    background: "rgba(15, 17, 26, 0.95)",
    backdropFilter: "blur(16px)",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))",
    zIndex: 90,
    boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)",
  },
  mobileNavItem: {
    background: "none",
    border: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  mobileIconActive: {
    filter: "drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))",
    transform: "scale(1.05)",
  },
  mobileNavLabel: {
    fontSize: "0.7rem",
    fontWeight: "500",
  },
};

// Add responsive rules directly to handle responsive CSS variables injection & animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 768px) {
      .sidebar-desktop {
        display: none !important;
      }
      .desktop-header {
        display: none !important;
      }
      header[style*="display: none"] {
        display: flex !important;
      }
      nav[style*="display: none"], .mobile-bottom-nav {
        display: grid !important;
        height: 56px !important;
      }
      .mobile-nav-label {
        display: none !important;
      }
      .mobile-nav-item {
        padding: 0 !important;
        height: 100% !important;
        justify-content: center !important;
      }
    }
  `;
  document.head.appendChild(style);
}
