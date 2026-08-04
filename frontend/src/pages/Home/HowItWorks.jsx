import "./HowItWorks.css"
import {
    FaArrowRightLong,
    FaBridge,
    FaChartLine,
    FaPeopleGroup,
    FaSeedling,
} from "react-icons/fa6"

const cards = [
    {
        title: "Bridge Classroom to Career",
        text: "Students need a practical platform to turn academic work into visible professional proof points.",
        icon: FaBridge,
    },
    {
        title: "Showcase Real Outcomes",
        text: "Traditional resumes miss the depth of projects. This platform highlights what students can actually build.",
        icon: FaChartLine,
    },
    {
        title: "Build Meaningful Connections",
        text: "Mentors, peers, and recruiters can discover students through verified work and shared interests.",
        icon: FaPeopleGroup,
    },
    {
        title: "Support Long-Term Growth",
        text: "A living portfolio evolves as students gain new skills, complete internships, and earn achievements.",
        icon: FaSeedling,
    },
]

export default function HowItWorks() {
    return (
        <section
            className="how-it-works"
            aria-labelledby="why-platform-exists-title"
        >
            <div className="how-it-works__container">
                <header>
                    <p className="how-it-works__eyebrow">
                        WHY THIS PLATFORM EXISTS
                    </p>
                    <h2 id="why-platform-exists-title">
                        Why This Platform Exists
                    </h2>
                </header>
                <div className="how-it-works__grid">
                    {cards.map((card) => {
                        const Icon = card.icon
                        return (
                            <article
                                key={card.title}
                                className="how-it-works__card"
                            >
                                <span
                                    className="how-it-works__icon"
                                    aria-hidden="true"
                                >
                                    <Icon />
                                </span>
                                <h3>{card.title}</h3>
                                <p>{card.text}</p>
                                <span
                                    className="how-it-works__link"
                                    aria-hidden="true"
                                >
                                    <FaArrowRightLong />
                                </span>
                            </article>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
