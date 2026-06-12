import "./Footer.css";

export function Footer() {
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
                            @losciruelospadel
                        </a>
                    </div>
                    <div className="footer-links">
                        <span className="footer-links__titulo">Club</span>
                        <a href="#sobre">Sobre nosotros</a>
                        <a href="#canchas">Nuestras canchas</a>
                        <a href="#torneos">Torneos</a>
                        <a href="#noticias">Noticias</a>
                    </div>
                    <div className="footer-links">
                        <span className="footer-links__titulo">Plataforma</span>
                        <a href="/register">Registrate</a>
                        <a href="/login">Iniciar sesión</a>
                        <a href="/reservas">Reservas</a>
                    </div>
                    <div className="footer-links">
                        <span className="footer-links__titulo">Contacto</span>
                        <span>Calle 34 e/ 25 y 26 Nº 1527</span>
                        <span>La Plata, Buenos Aires</span>
                        <span>Lun–Sáb · 08:00 a 23:00</span>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} Los Ciruelos Pádel. Todos los derechos reservados.</span>
                </div>
            </div>
        </footer>
    );
}