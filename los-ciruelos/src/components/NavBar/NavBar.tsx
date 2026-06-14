import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../layouts/AuthLayout/AuthPanelLayout";
import "./Navbar.css";
import { NAVBAR_BY_ROLE } from "../../config/sections";

/* ─── AVATAR ─────────────────────────────────────── */
function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
    const iniciales = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
    return <div className="navbar-avatar">{iniciales}</div>;
}

/* ─── HOOK SECCIÓN ACTIVA ────────────────────────── */
function useSeccionActiva(ids: string[]) {
    const [activa, setActiva] = useState<string>("");

    useEffect(() => {
        if (ids.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiva(entry.target.id);
                    }
                });
            },
            {
                rootMargin: "-10% 0px -50% 0px",
                threshold: 0,
            }
        );

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [ids.join(",")]);

    return activa;
}

/* ─── NAVBAR ─────────────────────────────────────── */
export default function Navbar() {
    const { usuario, cerrarSesion } = useAuth();
    const items = NAVBAR_BY_ROLE[usuario ? usuario.rol : "INVITADO"];
    const navigate = useNavigate();
    const location = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Extraemos los ids de las secciones del home (los que tienen #)
    const idsHome = items
        .filter(item => item.to.includes("#"))
        .map(item => item.to.split("#")[1]);

    const seccionActiva = useSeccionActiva(
        location.pathname === "/" ? idsHome : []
    );

    const esActivo = (to: string) => {
        const [path, hash] = to.split("#");

        // Si tiene hash y estamos en home
        if (hash && location.pathname === "/") {
            return seccionActiva === hash;
        }

        // Si es una ruta normal
        return location.pathname === path && !hash;
    };

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

    useEffect(() => {
        setMenuAbierto(false);
    }, [location.pathname]);

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

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
        const [path, hash] = to.split("#");

        // Si tiene hash y estamos en la misma página
        if (hash) {
            if (location.pathname === path || (path === "/" && location.pathname === "/")) {
                e.preventDefault();
                document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    return (
        <header className="navbar" ref={menuRef}>
            <div className="navbar__contenido">

                {/* Logo */}
                <div
                    className="navbar__logo-contenedor"
                    onClick={() => navigate("/")}
                    style={{ cursor: "pointer" }}
                >
                    <Logo nombre="" />
                </div>

                <div className="navbar__divisor" />

                {/* Links desktop */}
                <nav className="navbar__links">
                    {items.map(({ id, label, icon: Icon, to }) => (
                        <a
                            key={id}
                            href={to}
                            className={`navbar__link${esActivo(to) ? " navbar__link--activo" : ""}`}
                            onClick={e => handleNavClick(e, to)}
                        >
                            <Icon size={14} />
                            {label}
                        </a>
                    ))}
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

            {/* Menú mobile */}
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
                    {items.map(({ id, label, icon: Icon, to }) => (
                        <a
                            key={id}
                            href={to}
                            className={`navbar__menu-mobile__link${esActivo(to) ? " navbar__menu-mobile__link--activo" : ""}`}
                            onClick={e => { handleNavClick(e, to); setMenuAbierto(false); }}
                        >
                            <Icon size={16} />
                            {label}
                        </a>
                    ))}

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