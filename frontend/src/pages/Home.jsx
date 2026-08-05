import "./Home.css";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { 
  FiUsers, 
  FiFolder, 
  FiGithub, 
  FiFileText, 
  FiCode 
} from "react-icons/fi";
import { LuBadgeCheck } from "react-icons/lu";
import Heroimage from "./image.png";

function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  return (
    <div>
      {/* Hero section */}
      <section className="hero container">
        <div className="hero-text">
          <h1 className="hero-headline">
            BUILD. <span className="accent">SHOWCASE.</span> <br />
            <span className="accent">GROW</span> TOGETHER.
          </h1>
          <p className="hero-subtext">
            A community platform built by Kalvium students, for Kalvium students. <br />
            Showcase your projects, share your technical proof-of-work, <br />
            and inspire your peers through one interactive profile. <br />
          </p>
          <div className="hero-buttons">
            <NavLink to="/students" className="btn btn-primary">
              Explore Profiles →
            </NavLink>
            {isLoggedIn ? (
              <NavLink to="/dashboard" className="btn btn-secondary">
                Manage Portfolio →
              </NavLink>
            ) : (
              <NavLink to="/login" className="btn btn-secondary">
                Login →
              </NavLink>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <img
            src={Heroimage}
            alt="Kalvium student showcase preview"
            className="hero-image"
            width="300px"
          />
        </div>
      </section>

      {/* Highlights Strip (Replaced Fake Stats) */}
      <section className="stats-bar">
        <div className="stat">
          <div className="stat-number" style={{ fontSize: "1.2rem", fontWeight: "700" }}>
            🚀 Build in Public
          </div>
          <div className="stat-label">Share real-world student projects</div>
        </div>
        <div className="stat">
          <div className="stat-number" style={{ fontSize: "1.2rem", fontWeight: "700" }}>
            ⚡ Proof of Work
          </div>
          <div className="stat-label">GitHub & Live Demo links</div>
        </div>
        <div className="stat">
          <div className="stat-number" style={{ fontSize: "1.2rem", fontWeight: "700" }}>
            🤝 Peer Inspiration
          </div>
          <div className="stat-label">Learn & grow with fellow builders</div>
        </div>
      </section>

      {/* Featured Students */}
      <section className="featured-container">
        <h3>Featured Builders</h3>
        <div className="students">
          <div className="student-card">
            <img src="sfad" alt="profile-1" />
            <h4>Dhinesh</h4>
            <p>AI Developer</p>
            <NavLink to="/student/1" className="student-redirect">
              View Profile →
            </NavLink>
          </div>

          <div className="student-card">
            <img src="sfad" alt="profile-2" />
            <h4>Ashwath</h4>
            <p>Full Stack Engineer</p>
            <NavLink to="/student/2" className="student-redirect">
              View Profile →
            </NavLink>
          </div>

          <div className="student-card">
            <img src="sfad" alt="profile-3" />
            <h4>Ashwin</h4>
            <p>Systems Developer</p>
            <NavLink to="/student/3" className="student-redirect">
              View Profile →
            </NavLink>
          </div>

          <div className="student-card">
            <img src="sfad" alt="profile-4" />
            <h4>Nithya</h4>
            <p>UI/UX & Web Dev</p>
            <NavLink to="/student/4" className="student-redirect">
              View Profile →
            </NavLink>
          </div>
        </div>

        <div className="view-all-container">
          <NavLink to="/students" className="home-all-student">
            Explore All Profiles ▶
          </NavLink>
        </div>
      </section>

      {/* Why Platform Section */}
      <section className="why-section">
        <h3>Why Join the Student Showcase?</h3>

        <div className="why-container">
          <div className="why-item">
            <div className="icon-circle">
              <LuBadgeCheck size={28} color="#ff3b3b" />
            </div>
            <p>Developer<br />Digital Identity</p>
          </div>

          <div className="why-item">
            <div className="icon-circle">
              <FiUsers size={28} color="#ff3b3b" />
            </div>
            <p>Peer & Community<br />Inspiration</p>
          </div>

          <div className="why-item">
            <div className="icon-circle">
              <FiFolder size={28} color="#ff3b3b" />
            </div>
            <p>Project & Skill<br />Exhibition</p>
          </div>

          <div className="why-item">
            <div className="icon-circle">
              <FiGithub size={28} color="#ff3b3b" />
            </div>
            <p>GitHub & Live<br />Demo Showcase</p>
          </div>

          <div className="why-item">
            <div className="icon-circle">
              <FiFileText size={28} color="#ff3b3b" />
            </div>
            <p>Centralized<br />Proof of Work</p>
          </div>

          <div className="why-item">
            <div className="icon-circle">
              <FiCode size={28} color="#ff3b3b" />
            </div>
            <p>Build in Public<br />Culture</p>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <h2>Ready to Showcase Your Work?</h2>
        <p>"Build in Public. Inspire Your Community."</p>

        {isLoggedIn ? (
          <NavLink to="/dashboard" className="btn-create-portfolio">
            Update Profile →
          </NavLink>
        ) : (
          <NavLink to="/login" className="btn-create-portfolio">
            Sign In & Build Profile →
          </NavLink>
        )}
      </section>
    </div>
  );
}

export default Home;