import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, } from "lucide-react";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import './Login.css'

/* ─── TIPOS ──────────────────────────────────────────────── */
interface Credenciales {
    email: string;
    contrasena: string;
    recordar: boolean;
}

/* ─── COMPONENTE LOGO ────────────────────────────────────── */
function Logo() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="logo">
                <img
                    src={logoLosCiruelos}
                    alt="Los Ciruelos Pádel"
                    className="logo__imagen"
                />
            </div>
            <span className="logo-texto">LOS CIRUELOS</span>
        </div>
    );
}

/* ─── COMPONENTE ICONO GOOGLE ────────────────────────────── */
function IconoGoogle() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.1 22.56 15.4 22.56 12.25z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

/* ─── PANEL VISUAL (izquierdo) ───────────────────────────── */
function PanelVisual() {
    return (
        <aside className="panel-visual">
            <div className="panel-visual__fondo" />
            <div className="panel-visual__brillo" />
            <div className="panel-visual__grain" aria-hidden="true" />

            <div
                className="panel-visual__imagen"
                style={{ backgroundImage: `url(${padelBg})` }}
                aria-hidden="true"
            />

            {/* Logo top-left */}
            <div className="panel-visual__logo animar-subir">
                <Logo />
            </div>

            {/* Contenido inferior */}
            <div className="panel-visual__contenido">
                <span className="etiqueta animar-subir demora-1">Club de Pádel · La Plata</span>

                <h1 className="titular animar-subir demora-2">
                    TU PRÓXIMO<br />
                    PARTIDO<br />
                    TE <em>ESPERA</em>
                </h1>
            </div>
        </aside>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────── */
export default function Login() {
    const [datos, setDatos] = useState<Credenciales>({ email: "", contrasena: "", recordar: false });
    const [verContrasena, setVerContrasena] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cambiar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setDatos(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
        if (error) setError(null);
    };

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!datos.email || !datos.contrasena) {
            setError("Completá todos los campos para continuar.");
            return;
        }
        setCargando(true);
        setTimeout(() => {
            setCargando(false);
            setError("Email o contraseña incorrectos. Intentá de nuevo.");
        }, 1800);
    };

    return (
        <>
            <main className="pagina-login">
                <PanelVisual />

                {/* ── Panel formulario ── */}
                <section className="panel-formulario" aria-label="Formulario de ingreso">
                    <div
                        className="panel-formulario__imagen"
                        style={{ backgroundImage: `url(${padelBg})` }}
                        aria-hidden="true"
                    />
                    <div className="formulario-contenedor">
                        {/* Logo visible solo en mobile */}
                        <div className="logo-mobile">
                            <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo-mobile__imagen" />
                            <span className="logo-mobile__texto">LOS CIRUELOS</span>
                        </div>

                        {/* Cabecera */}
                        <div className="animar-subir">
                            <div className="badge-sistema">
                                <span className="badge-sistema__punto" />
                                Club de Pádel · La Plata
                            </div>
                            <p className="formulario-subtitulo">Bienvenido de vuelta</p>
                            <h2 className="formulario-titulo">INGRESÁ</h2>
                            <p className="formulario-descripcion">Tu sesión te está esperando.</p>
                        </div>

                        <form onSubmit={enviar} noValidate style={{ marginTop: 36 }}>

                            {/* Error */}
                            {error && (
                                <div className="alerta-error" role="alert">
                                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                    {error}
                                </div>
                            )}

                            {/* Campos */}
                            <div className="campos">

                                <div className="campo">
                                    <label className="campo__etiqueta" htmlFor="email">Correo electrónico</label>
                                    <div className="campo__contenedor">
                                        <span className="campo__icono"><Mail size={16} /></span>
                                        <input
                                            className="campo__input"
                                            id="email" name="email" type="email"
                                            value={datos.email} onChange={cambiar}
                                            placeholder="vos@email.com"
                                            autoComplete="email" required
                                        />
                                    </div>
                                </div>

                                <div className="campo">
                                    <label className="campo__etiqueta" htmlFor="contrasena">Contraseña</label>
                                    <div className="campo__contenedor">
                                        <span className="campo__icono"><Lock size={16} /></span>
                                        <input
                                            className="campo__input"
                                            id="contrasena" name="contrasena"
                                            type={verContrasena ? "text" : "password"}
                                            value={datos.contrasena} onChange={cambiar}
                                            placeholder="••••••••"
                                            autoComplete="current-password" required
                                        />
                                        <button
                                            type="button" className="campo__toggle"
                                            onClick={() => setVerContrasena(v => !v)}
                                            aria-label={verContrasena ? "Ocultar" : "Ver contraseña"}
                                        >
                                            {verContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* Opciones */}
                            <div className="opciones">
                                <label className="recordar">
                                    <input
                                        type="checkbox" name="recordar"
                                        className="recordar__check"
                                        checked={datos.recordar} onChange={cambiar}
                                    />
                                    <span>Recordarme</span>
                                </label>
                                <a href="#" className="olvide">¿Olvidaste tu contraseña?</a>
                            </div>

                            {/* Botón */}
                            <button type="submit" className="boton-ingresar" disabled={cargando} aria-busy={cargando}>
                                {cargando
                                    ? <span className="spinner" aria-label="Cargando" />
                                    : <><span>Ingresar al club</span><ArrowRight size={17} /></>
                                }
                            </button>

                        </form>

                        {/* Separador */}
                        <div className="separador"><span>o continuá con</span></div>

                        {/* Social */}
                        <button type="button" className="boton-google">
                            <IconoGoogle />
                            Continuar con Google
                        </button>

                        {/* Registro */}
                        <p className="pie">
                            ¿No tenés cuenta?&nbsp;<a href="#">Registrate gratis</a>
                        </p>

                    </div>
                </section>
            </main>
        </>
    );
}