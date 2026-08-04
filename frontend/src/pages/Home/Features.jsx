import "./Features.css"
import {
    FaChartSimple,
    FaCode,
    FaCompassDrafting,
    FaFileCircleCheck,
    FaMagnifyingGlass,
    FaShieldHalved,
    FaTimeline,
    FaUsers,
} from "react-icons/fa6"

const featureItems = [
    {
        title: "Portfolio Builder",
        text: "Create a professional profile in minutes.",
        icon: FaCompassDrafting,
    },
    {
        title: "Project Gallery",
        text: "Showcase your best academic projects.",
        icon: FaCode,
    },
    {
        title: "Certificates",
        text: "Upload and organize your achievements.",
        icon: FaFileCircleCheck,
    },
    {
        title: "Resume Generator",
        text: "Generate professional resumes instantly.",
        icon: FaChartSimple,
    },
    {
        title: "Skills Timeline",
        text: "Track your learning and growth journey.",
        icon: FaTimeline,
    },
    {
        title: "Mentor Dashboard",
        text: "Mentors can review and support students.",
        icon: FaUsers,
    },
    {
        title: "Search Students",
        text: "Discover and connect within Kalvium.",
        icon: FaMagnifyingGlass,
    },
    {
        title: "Secure Authentication",
        text: "Only Kalvium students and mentors can login.",
        icon: FaShieldHalved,
    },
]

const stats = [
    { value: "500+", label: "Active Students" },
    { value: "1000+", label: "Projects Published" },
    { value: "300+", label: "Certificates Earned" },
    { value: "150+", label: "Mentor Reviews" },
    { value: "80+", label: "Internship Offers Shared" },
]

export default function Features() {
    return (
        <>
            <section
                className="features"
                aria-labelledby="platform-features-title"
            >
                <div className="features__container">
                    <header>
                        <p className="features__eyebrow">PLATFORM FEATURES</p>
                        <h2 id="platform-features-title">Platform Features</h2>
                    </header>
                    <div className="features__grid">
                        {featureItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <article
                                    key={item.title}
                                    className="features__card"
                                >
                                    <span
                                        className="features__icon"
                                        aria-hidden="true"
                                    >
                                        <Icon />
                                    </span>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section
                className="highlights"
                aria-labelledby="community-highlights-title"
            >
                <div className="features__container">
                    <header>
                        <p className="features__eyebrow">
                            COMMUNITY HIGHLIGHTS
                        </p>
                        <h2 id="community-highlights-title">
                            Community Highlights
                        </h2>
                    </header>
                    <div className="highlights__grid">
                        {stats.map((item) => (
                            <article
                                key={item.label}
                                className="highlights__card"
                            >
                                <h3>{item.value}</h3>
                                <p>{item.label}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
