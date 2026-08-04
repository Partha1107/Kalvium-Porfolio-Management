import "./AboutPlatform.css"
import {
    FaAddressCard,
    FaCode,
    // FaFileCertificate,
    FaMedal,
    FaTrophy,
    FaUserGraduate,
} from "react-icons/fa6"

const ABOUT_ILLUSTRATION =
    "https://framerusercontent.com/images/K8GGNqXWPIOVuUNPMzSqSNLjTg.svg?width=500&height=500&kb=20"

const aboutItems = [
    { label: "Portfolio", icon: FaAddressCard },
    { label: "Projects", icon: FaCode },
    // { label: "Certificates", icon: FaFileCertificate },
    { label: "Skills", icon: FaUserGraduate },
    { label: "Achievements", icon: FaTrophy },
    { label: "Growth", icon: FaMedal },
]

export default function AboutPlatform({
    illustrationSrc = ABOUT_ILLUSTRATION,
}) {
    return (
        <section
            className="about-platform"
            aria-labelledby="about-platform-title"
        >
            <div className="about-platform__container">
                <div className="about-platform__copy">
                    <p className="about-platform__eyebrow">
                        ABOUT KALVIUM PORTFOLIO
                    </p>
                    <h2 id="about-platform-title">
                        One Platform. Everything About a Student.
                    </h2>
                    <ul className="about-platform__grid">
                        {aboutItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <li key={item.label}>
                                    <span
                                        className="about-platform__badge"
                                        aria-hidden="true"
                                    >
                                        <Icon />
                                    </span>
                                    <span>{item.label}</span>
                                </li>
                            )
                        })}
                    </ul>
                    <p className="about-platform__desc">
                        Build your professional identity, showcase your work,
                        and grow with continuous support from mentors.
                    </p>
                </div>
                <article className="about-platform__media">
                    <img
                        src={illustrationSrc}
                        alt="Kalvium profile illustration"
                        className="about-platform__image"
                    />
                </article>
            </div>
        </section>
    )
}
