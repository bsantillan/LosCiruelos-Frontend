import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../AuthLayout/AuthPanelLayout";
import { seccionesPara, type SubseccionAdmin } from "../../config/adminSecciones";
import "./AdminLayout.css";

/**
 * Panel del personal del club: sidebar a la izquierda con las secciones (según el rol) y el
 * contenido de cada una a la derecha. No usa la barra ni el footer del sitio público.
 * En pantallas angostas el sidebar se abre como un panel que entra desde la izquierda.
 */
export default function AdminLayout() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [abierto, setAbierto] = useState(false);
    // Desplegables del sidebar: abiertos a mano o, si no se tocaron, cuando la ruta actual está adentro
    const [desplegados, setDesplegados] = useState<Record<string, boolean>>({});

    /** Un hijo está activo si coincide la ruta y su query (Partido y Turno fijo comparten la ruta) */
    const hijoActivo = (h: SubseccionAdmin) => {
        const [ruta, query = ""] = h.to.split("?");
        const actualQuery = new URLSearchParams(location.search);
        const pedida = new URLSearchParams(query);
        return location.pathname === ruta
            && [...pedida.keys()].every(k => actualQuery.get(k) === pedida.get(k))
            && (query !== "" || actualQuery.get("fijo") === null);
    };

    const secciones = seccionesPara(usuario?.rol);
    const grupos = [...new Set(secciones.map(s => s.grupo))];
    // La sección actual (la de ruta más larga que coincide) para el título de la barra superior
    const actual = [...secciones]
        .sort((a, b) => b.to.length - a.to.length)
        .find(s => location.pathname === s.to || location.pathname.startsWith(`${s.to}/`));

    // Cerrar el menú al navegar (ajuste de estado durante el render)
    const [rutaAnterior, setRutaAnterior] = useState(location.pathname);
    if (rutaAnterior !== location.pathname) {
        setRutaAnterior(location.pathname);
        setAbierto(false);
    }

    useEffect(() => {
        if (!abierto) return;
        const alApretar = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
        document.addEventListener("keydown", alApretar);
        return () => document.removeEventListener("keydown", alApretar);
    }, [abierto]);

    const salir = async () => {
        await cerrarSesion();
        navigate("/login");
    };

    return (
        <div className="admin">
            {/* Barra superior (solo en pantallas angostas) */}
            <header className="admin-topbar">
                <button type="button" className="admin-topbar__menu" onClick={() => setAbierto(true)} aria-label="Abrir menú">
                    <Menu size={20} />
                </button>
                <span className="admin-topbar__titulo">{actual?.label ?? "Panel"}</span>
            </header>

            {abierto && <div className="admin-overlay" onClick={() => setAbierto(false)} aria-hidden="true" />}

            <aside className={`admin-sidebar${abierto ? " admin-sidebar--abierto" : ""}`} aria-label="Panel del club">
                <div className="admin-sidebar__cabecera">
                    <Link to="/admin" className="admin-sidebar__logo" aria-label="Panel, inicio">
                        <Logo nombre="" />
                    </Link>
                    <span className="admin-sidebar__panel">Panel del club</span>
                    <button type="button" className="admin-sidebar__cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
                        <X size={18} />
                    </button>
                </div>

                <nav className="admin-sidebar__nav">
                    {grupos.map(grupo => (
                        <div key={grupo} className="admin-sidebar__grupo">
                            <span className="admin-sidebar__grupo-titulo">{grupo}</span>
                            {secciones.filter(s => s.grupo === grupo).map(({ to, label, icon: Icon, hijos }) => {
                                if (!hijos) {
                                    return (
                                        <NavLink
                                            key={to}
                                            to={to}
                                            end={to === "/admin"}
                                            className={({ isActive }) => `admin-sidebar__link${isActive ? " admin-sidebar__link--activo" : ""}`}
                                        >
                                            <Icon size={17} />
                                            {label}
                                        </NavLink>
                                    );
                                }
                                const enRuta = location.pathname === to || location.pathname.startsWith(`${to}/`);
                                const desplegado = desplegados[to] ?? enRuta;
                                const idHijos = `sidebar${to.split("/").join("-")}`;
                                return (
                                    <div key={to} className="admin-sidebar__desplegable">
                                        {/* El título lleva al primer paso; la flecha abre y cierra las opciones */}
                                        <div className="admin-sidebar__padre-fila">
                                            <Link to={to} aria-current={location.pathname === to ? "page" : undefined}
                                                onClick={() => setDesplegados(d => ({ ...d, [to]: true }))}
                                                className={`admin-sidebar__link admin-sidebar__padre${location.pathname === to ? " admin-sidebar__link--activo" : enRuta ? " admin-sidebar__padre--en-ruta" : ""}`}>
                                                <Icon size={17} />
                                                {label}
                                            </Link>
                                            <button type="button" className="admin-sidebar__desplegar" aria-expanded={desplegado} aria-controls={idHijos}
                                                aria-label={desplegado ? `Ocultar las opciones de ${label}` : `Ver las opciones de ${label}`}
                                                onClick={() => setDesplegados(d => ({ ...d, [to]: !desplegado }))}>
                                                <ChevronDown size={15} className={`admin-sidebar__chevron${desplegado ? " admin-sidebar__chevron--abierto" : ""}`} />
                                            </button>
                                        </div>
                                        {desplegado && (
                                            <div id={idHijos} className="admin-sidebar__hijos">
                                                {hijos.map(h => (
                                                    <Link key={h.to} to={h.to} aria-current={hijoActivo(h) ? "page" : undefined}
                                                        className={`admin-sidebar__link admin-sidebar__hijo${hijoActivo(h) ? " admin-sidebar__link--activo" : ""}`}>
                                                        <h.icon size={15} />
                                                        {h.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="admin-sidebar__pie">
                    <Link to="/" className="admin-sidebar__link">
                        <ExternalLink size={17} />
                        Ver el sitio
                    </Link>
                    <div className="admin-sidebar__usuario">
                        <div className="admin-sidebar__avatar">
                            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                        </div>
                        <div className="admin-sidebar__usuario-datos">
                            <span className="admin-sidebar__usuario-nombre">{usuario?.nombre} {usuario?.apellido}</span>
                            <span className="admin-sidebar__usuario-rol">{usuario?.rol === "ADMIN" ? "Administrador" : "Empleado"}</span>
                        </div>
                        <button type="button" className="admin-sidebar__salir" onClick={() => void salir()} aria-label="Cerrar sesión" title="Cerrar sesión">
                            <LogOut size={17} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="admin-contenido">
                <Outlet />
            </main>
        </div>
    );
}
