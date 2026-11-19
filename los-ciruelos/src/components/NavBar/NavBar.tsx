import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../layouts/AuthLayout/AuthPanelLayout";
import "./NavBar.css";
import { NAVBAR_BY_ROLE } from "../../config/sections";
import { esPersonal } from "../../utils/roles";

/* ─── AVATAR ─────────────────────────────────────── */
function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
    const iniciales = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
    return <div className="navbar-avatar">{iniciales}</div>;
}

/* ─── HOOK SECCIÓN ACTIVA ────────────────────────── */
function useSeccionActiva(idsClave: string) {
    const [activa, setActiva] = useState<string>("");

    useEffect(() => {
        const ids = idsClave ? idsClave.split(",") : [];
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
    }, [idsClave]);

    return activa;
}

/* ─── NAVBAR ─────────────────────────────────────── */
export default function Navbar() {
    const { usuario, cerrarSesion } = useAuth();
    const items = (usuario && NAVBAR_BY_ROLE[usuario.rol]) || NAVBAR_BY_ROLE.INVITADO;
    const navigate = useNavigate();
    const location = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    // Menú del avatar (desktop): perfil y cerrar sesión, para que los links entren en la barra
    const [menuUsuario, setMenuUsuario] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const usuarioRef = useRef<HTMLDivElement>(null);
    // Con muchos links (cliente) la barra pasa a hamburguesa antes (ver NavBar.css)
    const extendida = items.length > 7;
    // El personal del club tiene su cuenta dentro del panel
    const rutaPerfil = esPersonal(usuario?.rol) ? "/admin/cuenta" : "/perfil";

    // Extraemos los ids de las secciones del home (los que tienen #)
    const idsHome = items
        .filter(item => item.to.includes("#"))
        .map(item => item.to.split("#")[1]);

    const seccionActiva = useSeccionActiva(
        location.pathname === "/" ? idsHome.join(",") : ""
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
        if (!menuUsuario) return;
        const handler = (e: MouseEvent) => {
            if (usuarioRef.current && !usuarioRef.current.contains(e.target as Node)) {
                setMenuUsuario(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuUsuario]);

    // Cerrar los menús al cambiar de página (ajuste de estado durante el render)
    const [pathAnterior, setPathAnterior] = useState(location.pathname);
    if (pathAnterior !== location.pathname) {
        setPathAnterior(location.pathname);
        setMenuAbierto(false);
        setMenuUsuario(false);
    }

    useEffect(() => {
        if (!menuAbierto && !menuUsuario) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setMenuAbierto(false); setMenuUsuario(false); }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [menuAbierto, menuUsuario]);

    const handleLogout = async () => {
        await cerrarSesion();
        navigate("/login");
    };

    // Si el link apunta a una sección de la página actual, solo hace scroll.
    // Desde otra página navega a "/#seccion" y Home hace el scroll al montar.
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
        const [path, hash] = to.split("#");
        if (hash && location.pathname === path) {
            e.preventDefault();
            document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <header className={`navbar${extendida ? " navbar--extendida" : ""}`} ref={menuRef}>
            <div className="navbar__contenido">

                {/* Logo */}
                <Link to="/" className="navbar__logo-contenedor" aria-label="Los Ciruelos Pádel, inicio">
                    <Logo nombre="" />
                </Link>

                <div className="navbar__divisor" />

                {/* Links desktop */}
                <nav className="navbar__links">
                    {items.map(({ id, label, icon: Icon, to }) => (
                        <Link
                            key={id}
                            to={to}
                            className={`navbar__link${esActivo(to) ? " navbar__link--activo" : ""}`}
                            onClick={e => handleNavClick(e, to)}
                        >
                            <Icon size={14} />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Acciones desktop */}
                <div className="navbar__acciones">
                    {usuario ? (
                        <div className="navbar__usuario-contenedor" ref={usuarioRef}>
                            <button
                                className="navbar__usuario"
                                onClick={() => setMenuUsuario(v => !v)}
                                aria-haspopup="menu"
                                aria-expanded={menuUsuario}
                            >
                                <Avatar nombre={usuario.nombre} apellido={usuario.apellido} />
                                <span className="navbar__usuario-nombre">{usuario.nombre}</span>
                                <ChevronDown size={14} className="navbar__usuario-flecha" />
                            </button>
                            {menuUsuario && (
                                <div className="navbar__desplegable" role="menu">
                                    <div className="navbar__desplegable-encabezado">
                                        <span className="navbar__menu-mobile__nombre">{usuario.nombre} {usuario.apellido}</span>
                                        <span className="navbar__menu-mobile__email">{usuario.email}</span>
                                    </div>
                                    <Link to={rutaPerfil} role="menuitem" className="navbar__menu-mobile__link">
                                        <UserRound size={16} />
                                        Mi perfil
                                    </Link>
                                    <button
                                        role="menuitem"
                                        className="navbar__menu-mobile__link navbar__menu-mobile__link--logout"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={16} />
                                        Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
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
                        <button
                            className="navbar__usuario"
                            onClick={() => navigate(rutaPerfil)}
                        >
                            <Avatar nombre={usuario.nombre} apellido={usuario.apellido} />
                        </button>
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
                        <Link
                            key={id}
                            to={to}
                            className={`navbar__menu-mobile__link${esActivo(to) ? " navbar__menu-mobile__link--activo" : ""}`}
                            onClick={e => { handleNavClick(e, to); setMenuAbierto(false); }}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
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