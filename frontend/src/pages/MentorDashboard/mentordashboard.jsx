import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Sidebar from "./sidebar";
import DashboardContent from "./dashboardcontent";
import SettingsContent from "./settingsconetnt";
import "./mentordashboard.css";

const MentorDashboard = ({ profile, isLoading = false }) => {
  const [activeNav, setActiveNav] = useState("Dashboard");

  // Retrieve user name from Supabase user_metadata or root profile
  const userName =
    profile?.user_metadata?.full_name ||
    profile?.user_metadata?.name ||
    "Arun Kumar";

  return (
    <div className="mentor-dashboard">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      <main className="dashboard-main">
        {/* Topbar styled to match Student Dashboard */}
        <header className="pm-topbar">
          <div className="pm-welcome">
            <span className="pm-wave">👋</span>
            <div>
              <span className="pm-welcome-sub">Welcome back,</span>
              <strong className="pm-welcome-name">
                {isLoading ? (
                  <span className="skeleton skeleton-text width-100"></span>
                ) : (
                  userName
                )}
              </strong>
            </div>
          </div>
          <div className="pm-topbar-actions">
            <Link to="/" className="pm-home-btn">
              <Home size={16} />
              <span>Back to Home</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Main Views */}
        <div className="dashboard-body">
          {activeNav === "Dashboard" && <DashboardContent />}
          {activeNav === "Settings" && <SettingsContent profile={profile} />}
        </div>
      </main>
    </div>
  );
};

export default MentorDashboard;