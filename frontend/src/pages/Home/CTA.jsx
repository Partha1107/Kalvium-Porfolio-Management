import "./CTA.css"
import { NavLink } from "react-router-dom"
import { FaArrowRightLong } from "react-icons/fa6"

export default function CTA() {
    return (
        <section className="cta-band" aria-labelledby="cta-title">
            <div className="cta-band__container">
                <h2 id="cta-title">
                    Ready to Build Your Professional Portfolio?
                </h2>
                <p>Join the Kalvium community and showcase your journey.</p>
                <nav
                    className="cta-band__actions"
                    aria-label="Call to action links"
                >
                    <NavLink
                        to="/students"
                        className="cta-band__button cta-band__button--light"
                    >
                        <span>Explore Students</span>
                        <FaArrowRightLong aria-hidden="true" />
                    </NavLink>
                    <NavLink
                        to="/login"
                        className="cta-band__button cta-band__button--ghost"
                    >
                        <span>Login</span>
                        <FaArrowRightLong aria-hidden="true" />
                    </NavLink>
                </nav>
            </div>
        </section>
    )
}
