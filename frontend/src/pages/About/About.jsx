import Coder from "./Low code development-amico.svg";
import {
  FaCode,
  FaPaintBrush,
  FaRobot,
  FaChartPie,
} from "react-icons/fa";

import "./About.css";

function About() {
  const communities = [
    {
      icon: <FaCode />,
      title: "Developers",
    },
    {
      icon: <FaPaintBrush />,
      title: "Designers",
    },
    {
      icon: <FaRobot />,
      title: "AI Engineers",
    },
    {
      icon: <FaChartPie />,
      title: "Data Scientists",
    },
  ];

  return (
    <div className="about-page">
      {/* ================= HERO SECTION ================= */}

      <section className="about-hero">
        <div className="about-container">
          {/* Left Side */}
          <div className="hero-content">
            <p className="hero-tag">ABOUT THE STUDENT SHOWCASE</p>

            <h1 className="about-headline">
              More Than A Platform.
              <br />A Hub for Student Builders.
            </h1>

            <p className="hero-description">
              A student-built space for Kalvium developers to showcase their skills,
              projects, and achievements in one central profile. We foster a culture
              of building in public, sharing technical proof-of-work, and growing together.
            </p>

            <button className="hero-btn">Our Story →</button>
          </div>

          {/* Right Side */}
          <div className="about-img">
            <div className="hero-circle">
              {/* Top */}
              <div className="circle-item top">
                <div className="icon-box">📁</div>
                <p>Projects</p>
              </div>

              {/* Left */}
              <div className="circle-item left">
                <div className="icon-box">🏆</div>
                <p>Achievements</p>
              </div>

              {/* Right */}
              <div className="circle-item right">
                <div className="icon-box">👥</div>
                <p>Community</p>
              </div>

              {/* Bottom */}
              <div className="circle-item bottom">
                <div className="icon-box">⚡</div>
                <p>Proof of Work</p>
              </div>

              {/* Center */}
              <div className="center-image">
                <img
                  src={Coder}
                  alt="Kalvium Portfolio Illustration"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHY SECTION ================= */}

      <section className="why-section">
        <div className="why-container">
          {/* Left */}
          <div className="why-left">
            <p className="why-tag">WHY WE BUILT THIS</p>
            <h2 className="why-title">
              "Every project
              <br />
              deserves a stage."
            </h2>
            <div className="red-line"></div>
          </div>

          {/* Right */}
          <div className="why-right">
            <p>
              Students build incredible things during their learning journey, but their work
              often stays scattered across separate GitHub repos or hidden on local machines.
            </p>
            <p>
              Kalvium Portfolio brings everything together in one interactive platform—making
              it simple to showcase builds, learn from peers, and track your technical growth.
            </p>
          </div>
        </div>

        {/* Feature Highlights (Replaced Fake Numbers) */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">🔐</div>
            <div>
              <h3>Kalvium Only</h3>
              <p>Verified Student Access</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div>
              <h3>Proof of Work</h3>
              <p>GitHub & Tech Stacks</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div>
              <h3>Live Demos</h3>
              <p>Interactive Projects</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🤝</div>
            <div>
              <h3>Peer Driven</h3>
              <p>Community Showcase</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Platform Section ================= */}

      <section className="platform-section">
        <h2 className="section-heading">MEET THE PLATFORM</h2>

        <div className="platform-grid">
          <div className="platform-card">
            <div className="platform-icon">📁</div>
            <h3>Projects</h3>
            <p>
              Showcase your best builds with rich descriptions, tech stacks, and live demo links.
            </p>
          </div>

          <div className="platform-card">
            <div className="platform-icon">💻</div>
            <h3>Skills</h3>
            <p>
              Highlight your technical stacks, frameworks, and programming proficiencies.
            </p>
          </div>

          <div className="platform-card">
            <div className="platform-icon">🏆</div>
            <h3>Achievements</h3>
            <p>Display certifications, hackathon wins, badges, and learning milestones.</p>
          </div>

          <div className="platform-card">
            <div className="platform-icon">🌐</div>
            <h3>Portfolio</h3>
            <p>Create a clean, shareable developer profile that represents your build journey.</p>
          </div>
        </div>
      </section>

      {/* ================= OUR PHILOSOPHY ================= */}

      <section className="philosophy-section">
        <h2 className="section-heading">OUR PHILOSOPHY</h2>
        <div className="philosophy-grid">
          {/* Card 1 */}
          <div className="philosophy-card">
            <div className="philosophy-icon red">💡</div>
            <div>
              <h3>Simplicity</h3>
              <p>
                A clean and minimal platform that keeps the focus entirely on what truly
                matters — your work.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="philosophy-card">
            <div className="philosophy-icon green">🛡️</div>
            <div>
              <h3>Authenticity</h3>
              <p>
                Every project and achievement represents real hands-on learning and practical build effort.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="philosophy-card">
            <div className="philosophy-icon orange">🎯</div>
            <div>
              <h3>Community Growth</h3>
              <p>
                Built by students for students to inspire peer learning and foster a culture of building in public.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= JOURNEY SECTION ================= */}

      <section className="journey-section">
        <h2 className="section-heading">THE STUDENT JOURNEY</h2>
        <div className="journey-container">
          <div className="journey-step">
            <div className="step-icon">🔑</div>
            <h4>Sign In</h4>
            <p>Log in with your Google account.</p>
          </div>

          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">👤</div>
            <h4>Build Profile</h4>
            <p>Add your bio, social links, and tech stack.</p>
          </div>

          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">📂</div>
            <h4>Upload Projects</h4>
            <p>Showcase your code and live demos.</p>
          </div>

          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">🏆</div>
            <h4>Add Achievements</h4>
            <p>Highlight certifications and hackathons.</p>
          </div>

          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">🔗</div>
            <h4>Share Profile</h4>
            <p>Share your proof-of-work with peers.</p>
          </div>

          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">🌱</div>
            <h4>Keep Building</h4>
            <p>Learn, iterate, and grow together every day.</p>
          </div>
        </div>
      </section>

      {/* ================= TECHNOLOGY SECTION ================= */}

      <section className="technology-section">
        <h2 className="section-heading">TECHNOLOGIES WE USE</h2>

        <div className="tech-grid">
          <div className="tech-card">
            <div className="tech-icon">⚛️</div>
            <h3>React</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🟢</div>
            <h3>Node.js</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🍃</div>
            <h3>MongoDB</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🚀</div>
            <h3>Express.js</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🎨</div>
            <h3>Tailwind / CSS</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🔐</div>
            <h3>JWT Auth</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🐙</div>
            <h3>GitHub</h3>
          </div>

          <div className="tech-card">
            <div className="tech-icon">➕</div>
            <h3>& More</h3>
          </div>
        </div>
      </section>

      {/* ================= COMMUNITY SECTION ================= */}

      <section className="community-section">
        <h2 className="section-heading">OUR COMMUNITY</h2>
        <div className="community-grid">
          {communities.map((item, index) => (
            <div className="community-card" key={index}>
              <div className="community-icon">{item.icon}</div>
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
        <p className="community-text">
          And many more student builders across different domains.
        </p>
      </section>

      {/*====================End of the section============= */}
    </div>
  );
}

export default About;