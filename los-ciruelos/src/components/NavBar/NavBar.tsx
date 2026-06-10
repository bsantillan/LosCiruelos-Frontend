import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Home, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../layouts/AuthLayout/AuthPanelLayout";
import "./Navbar.css";

/* ─── AVATAR ─────────────────────────────────────── */
function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
    const iniciales = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
    return <div className="navbar-avatar">{iniciales}</div>;
}

/* ─── NAVBAR ─────────────────────────────────────── */
export default function Navbar() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const esActivo = (path: string) => location.pathname === path;

    // Cerrar menú al hacer click afuera
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuAbierto]);

    // Cerrar menú al cambiar de ruta
    useEffect(() => {
        setMenuAbierto(false);
    }, [location.pathname]);

    // Cerrar con Escape
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuAbierto(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [menuAbierto]);

    const handleLogout = async () => {
        await cerrarSesion();
        navigate("/login");
    };

    return (
        <header className="navbar" ref={menuRef}>
            <div className="navbar__contenido">

                {/* Logo */}
                <div
                    className="navbar__logo-contenedor"
                    onClick={() => navigate("/home")}
                    style={{ cursor: "pointer" }}
                >
                    <Logo nombre="" />
                </div>

                <div className="navbar__divisor" />

                {/* Links desktop */}
                <nav className="navbar__links">
                    <a
                        href="/"
                        className={`navbar__link${esActivo("/") ? " navbar__link--activo" : ""}`}
                    >
                        <Home size={14} />
                        Inicio
                    </a>
                </nav>

                {/* Acciones desktop */}
                <div className="navbar__acciones">
                    {usuario ? (
                        <>
                            <button
                                className="navbar__link navbar__link--logout"
                                onClick={handleLogout}
                            >
                                <LogOut size={14} />
                                Cerrar sesión
                            </button>
                            <div className="navbar__divisor" />
                            <button
                                className="navbar__usuario"
                                onClick={() => navigate("/perfil")}
                            >
                                <Avatar nombre={usuario.nombre} apellido={usuario.apellido} />
                                <span className="navbar__usuario-nombre">{usuario.nombre}</span>
                            </button>
                        </>
                    ) : (
                        <button
                            className="navbar__boton-login"
                            onClick={() => navigate("/login")}
                        >
                            <span>Iniciar sesión</span>
                        </button>
                    )}
                </div>

                {/* Hamburguesa mobile */}
                <button
                    className="navbar__hamburguesa"
                    onClick={() => setMenuAbierto(v => !v)}
                    aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                    aria-expanded={menuAbierto}
                >
                    {menuAbierto ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Menú mobile desplegable */}
            <div className={`navbar__menu-mobile${menuAbierto ? " navbar__menu-mobile--abierto" : ""}`}>
                {usuario && (
                    <div className="navbar__menu-mobile__usuario">
                        <Avatar nombre={usuario.nombre} apellido={usuario.apellido} />
                        <div>
                            <span className="navbar__menu-mobile__nombre">
                                {usuario.nombre} {usuario.apellido}
                            </span>
                            <span className="navbar__menu-mobile__email">{usuario.email}</span>
                        </div>
                    </div>
                )}

                <div className="navbar__menu-mobile__separador" />

                <nav className="navbar__menu-mobile__links">
                    <a
                        href="/home"
                        className={`navbar__menu-mobile__link${esActivo("/home") ? " navbar__menu-mobile__link--activo" : ""}`}
                    >
                        <Home size={16} />
                        Inicio
                    </a>

                    {usuario ? (
                        <button
                            className="navbar__menu-mobile__link navbar__menu-mobile__link--logout"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </button>
                    ) : (
                        <button
                            className="navbar__menu-mobile__link navbar__menu-mobile__link--login"
                            onClick={() => navigate("/login")}
                        >
                            Iniciar sesión
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
}