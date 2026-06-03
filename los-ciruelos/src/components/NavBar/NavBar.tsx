import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import "./Navbar.css";

export default function Navbar() {
    return (
        <header className="navbar">
            <div className="navbar__marca">
                <img
                    src={logoLosCiruelos}
                    alt="Los Ciruelos Pádel"
                    className="navbar__logo"
                />
                <span className="navbar__nombre">LOS CIRUELOS</span>
            </div>
        </header>
    );
}