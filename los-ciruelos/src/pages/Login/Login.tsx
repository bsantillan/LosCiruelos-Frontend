import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, } from "lucide-react";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import { FcGoogle } from "react-icons/fc";
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

                                <CampoInput
                                    id="email" name="email" label="Correo electrónico"
                                    type="email" value={datos.email} onChange={cambiar}
                                    placeholder="vos@email.com" autoComplete="email"
                                    icono={<Mail size={16} />} required
                                />

                                <CampoInput
                                    id="contrasena" name="contrasena" label="Contraseña"
                                    type="password" value={datos.contrasena} onChange={cambiar}
                                    placeholder="••••••••" autoComplete="current-password"
                                    icono={<Lock size={16} />} required
                                />

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
                            <Boton type="submit" variante="primario" cargando={cargando}>
                                <span>Ingresar al club</span>
                                <ArrowRight size={17} />
                            </Boton>

                        </form>

                        {/* Separador */}
                        <div className="separador"><span>o continuá con</span></div>

                        {/* Social */}
                        <Boton variante="secundario" onClick={() => { }}>
                            <FcGoogle size={18} />
                            Continuar con Google
                        </Boton>

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