import "./StudentShowcase.css"
import {
    FaUserPlus,
    FaIdBadge,
    FaFolderOpen,
    FaComments,
    FaBriefcase,
} from "react-icons/fa6"

const steps = [
    {
        icon: FaUserPlus,
        title: "Create Account",
        text: "Sign up using your Kalvium email.",
    },
    {
        icon: FaIdBadge,
        title: "Build Portfolio",
        text: "Add your details, education, and skills.",
    },
    {
        icon: FaFolderOpen,
        title: "Upload Projects",
        text: "Share your projects, certificates, and more.",
    },
    {
        icon: FaComments,
        title: "Receive Feedback",
        text: "Mentors review and provide guidance.",
    },
    {
        icon: FaBriefcase,
        title: "Share Portfolio",
        text: "Your profile is ready to be explored.",
    },
]

export default function StudentShowcase() {
    return (
        <section
            className="student-showcase"
            aria-labelledby="student-journey-title"
        >
            <div className="student-showcase__container">
                <header>
                    <p className="student-showcase__eyebrow">STUDENT JOURNEY</p>
                    <h2 id="student-journey-title">Student Journey</h2>
                </header>
                <ol className="student-showcase__steps">
                    {steps.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <li
                                key={step.title}
                                className="student-showcase__step"
                            >
                                <article>
                                    <div
                                        className="student-showcase__icon-wrap"
                                        aria-hidden="true"
                                    >
                                        <span className="student-showcase__icon">
                                            <Icon />
                                        </span>
                                        <span className="student-showcase__count">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <h3>{step.title}</h3>
                                    <p>{step.text}</p>
                                </article>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </section>
    )
}
