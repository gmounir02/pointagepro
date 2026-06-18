import React, { useState, useEffect } from "react";
import { GlobalProvider, useAuth } from "./context/GlobalContext";
import Login from "./components/auth/Login";
import Layout from "./components/layout/Layout";

// Employee Views
import ClockInOut from "./components/employee/ClockInOut";
import MyHistory from "./components/employee/MyHistory";
import MyLeaves from "./components/employee/MyLeaves";
import UserProfile from "./components/employee/UserProfile";

// Admin Views
import DashboardHome from "./components/admin/DashboardHome";
import QrCodeManager from "./components/admin/QrCodeManager";
import EmployeeManager from "./components/admin/EmployeeManager";
import LeaveRequests from "./components/admin/LeaveRequests";
import EnterpriseConfig from "./components/admin/EnterpriseConfig";

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("");

  // Determine standard role and set default tab
  useEffect(() => {
    if (user) {
      const isAdmin = user.roles.includes("ROLE_ADMIN");
      setActiveTab(isAdmin ? "dashboard" : "pointage");
    } else {
      setActiveTab("");
    }
  }, [user]);

  // If not authenticated, render Login view
  if (!user) {
    return <Login />;
  }

  // Active view router based on tab ID
  const renderContent = () => {
    switch (activeTab) {
      // Admin Views
      case "dashboard":
        return <DashboardHome />;
      case "qrcodes":
        return <QrCodeManager />;
      case "employees":
        return <EmployeeManager />;
      case "conges":
        return <LeaveRequests />;
      case "settings":
        return <EnterpriseConfig />;

      // Employee Views
      case "pointage":
        return <ClockInOut />;
      case "historique":
        return <MyHistory />;
      case "mes-conges":
        return <MyLeaves />;
      case "profil":
        return <UserProfile />;

      default:
        return (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h3>Chargement de l'application...</h3>
          </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}
