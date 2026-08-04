import Hero from "./Hero"
import AboutPlatform from "./AboutPlatform"
import StudentShowcase from "./StudentShowcase"
import HowItWorks from "./HowItWorks"
import Features from "./Features"
import CTA from "./CTA"

export default function Home() {
    return (
        <main>
            <Hero />
            <AboutPlatform />
            <StudentShowcase />
            <HowItWorks />
            <Features />
            <CTA />
        </main>
    )
}
