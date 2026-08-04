import { NavLink } from "react-router-dom";
import "./Navbar.css";
import { ArrowRight } from "lucide-react";
import logo from "../assets/kalvium-logo.svg";

function Navbar() {

    return (
        <header className="header">
            <div className="logo-container">
                <h1 className="head-name">
                    <img src={logo} alt="Kalvium logo" className="logo" />
                    <span>Kalvium</span>
                </h1>
            </div>

            <nav>
                <ul>
                    <li className="nav-btn"><NavLink to="/">Home</NavLink></li>
                    <li className="nav-btn"><NavLink to="/students">Students</NavLink></li>
                    <li className="nav-btn"><NavLink to="/about">About</NavLink></li>

                    <li className="btn-log"><NavLink to="/login">Login <ArrowRight className="w-3.5 h-3.5"/></NavLink></li>
                </ul>
            </nav>
        </header>
    );
}

export default Navbar;