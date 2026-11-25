import { useState } from "react";
import { Link } from "react-router-dom";
import { SECTIONS_FOOTER } from "../../config/sections";
import { useAuth } from "../../context/AuthContext";
import { useHorariosClub } from "../../hooks/useHorariosClub";
import "./Footer.css";
import { FaInstagram } from "react-icons/fa";
import ModalLegal, { type DocumentoLegal } from "../Legales/ModalLegal";

export function Footer() {
    const { usuario } = useAuth();
    // El horario sale del backend; si no responde, Lun–Sáb · 08:00 a 23:00
    const horario = useHorariosClub(true);
    const [legal, setLegal] = useState<DocumentoLegal | null>(null);
    return (
        <footer className="home-footer">
            <div className="home-container">
                <div className="footer-grid">
                    <div className="footer-marca">
                        <span className="footer-nombre">LOS CIRUELOS</span>
                        <p className="footer-descripcion">
                            Club de pádel en La Plata. Un espacio para jugar, crecer y ser parte de una comunidad apasionada.
                        </p>
                        <a
                            href="https://www.instagram.com/losciruelospadel/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-instagram"
                        >
                            <FaInstagram size={16} />@losciruelospadel
                        </a>
                    </div>
                    <div className="footer-links">
                        <span className="footer-links__titulo">Club</span>
                        {SECTIONS_FOOTER.map(({ id, label, to }) => (
                            <Link key={id} to={to}>
                                {label}
                            </Link>
                        ))}
                    </div>
                    <div className="footer-links">
                        <span className="footer-links__titulo">Plataforma</span>
                        {usuario ? (
                            <Link to="/perfil">Mi perfil</Link>
                        ) : (
                            <>
                                <Link to="/register">Registrate</Link>
                                <Link to="/login">Iniciar sesión</Link>
                            </>
                        )}
                        {(!usuario || usuario.rol === "CLIENTE") && <Link to="/reservas">Reservas</Link>}
                        {usuario?.rol === "CLIENTE" && <Link to="/mis-reservas">Mis reservas</Link>}
                    </div>
                    <div className="footer-links">
                        <span className="footer-links__titulo">Contacto</span>
                        <span>Calle 34 e/ 25 y 26 Nº 1527</span>
                        <span>La Plata, Buenos Aires</span>
                        {horario.map(r => <span key={r}>{r}</span>)}
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} Los Ciruelos Pádel. Todos los derechos reservados.</span>
                    <span className="footer-legales">
                        <button type="button" className="enlace-legal" onClick={() => setLegal("terminos")}>Términos y condiciones</button>
                        <button type="button" className="enlace-legal" onClick={() => setLegal("privacidad")}>Política de privacidad</button>
                    </span>
                    <span className="footer-credito">
                        Sitio hecho por{" "}
                        <a href="https://www.instagram.com/diagonal.software.group/" target="_blank" rel="noopener noreferrer">
                            Diagonal Software Group
                        </a>
                    </span>
                </div>
            </div>
            {legal && <ModalLegal documento={legal} onCerrar={() => setLegal(null)} />}
        </footer>
    );
}