import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import './Login.css';

/* ─── TIPOS ──────────────────────────────────────── */
interface Credenciales {
    email: string;
    contrasena: string;
    recordar: boolean;
}

interface ErroresLogin {
    email?: string;
    contrasena?: string;
}

/* ─── LOGO ───────────────────────────────────────── */
function Logo() {
    return (
        <div className="logo">
            <img
                src={logoLosCiruelos}
                alt="Los Ciruelos Pádel"
                className="logo__imagen"
            />
            <span className="logo-texto">LOS CIRUELOS</span>
        </div>
    );
}

/* ─── PANEL VISUAL ───────────────────────────────── */
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
            <div className="panel-visual__logo animar-subir">
                <Logo />
            </div>
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

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Login() {
    const [datos, setDatos] = useState<Credenciales>({
        email: "",
        contrasena: "",
        recordar: false,
    });
    const [errores, setErrores] = useState<ErroresLogin>({});
    const [cargando, setCargando] = useState(false);

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDatos(p => ({ ...p, [name]: value }));
        if (errores[name as keyof ErroresLogin]) {
            setErrores(p => ({ ...p, [name]: undefined }));
        }
    };

    const cambiarRecordar = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDatos(p => ({ ...p, recordar: e.target.checked }));
    };

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();
        const nuevosErrores: ErroresLogin = {};
        if (!datos.email) nuevosErrores.email = "El correo es obligatorio.";
        if (!datos.contrasena) nuevosErrores.contrasena = "La contraseña es obligatoria.";
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }
        setCargando(true);
        setTimeout(() => {
            setCargando(false);
            setErrores({ email: "Email o contraseña incorrectos." });
        }, 1800);
    };

    return (
        <main className="pagina-login">
            <PanelVisual />

            <section className="panel-formulario" aria-label="Formulario de ingreso">
                <div
                    className="panel-formulario__imagen"
                    style={{ backgroundImage: `url(${padelBg})` }}
                    aria-hidden="true"
                />
                <div className="formulario-contenedor">

                    {/* Logo mobile */}
                    <div className="logo-mobile">
                        <img
                            src={logoLosCiruelos}
                            alt="Los Ciruelos Pádel"
                            className="logo-mobile__imagen"
                        />
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
                        <div className="campos">
                            <CampoInput
                                id="email"
                                name="email"
                                label="Correo electrónico"
                                type="email"
                                value={datos.email}
                                onChange={cambiarInput}
                                placeholder="vos@email.com"
                                autoComplete="email"
                                icono={<Mail size={16} />}
                                required
                                error={errores.email}
                            />
                            <CampoInput
                                id="contrasena"
                                name="contrasena"
                                label="Contraseña"
                                type="password"
                                value={datos.contrasena}
                                onChange={cambiarInput}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                icono={<Lock size={16} />}
                                required
                                error={errores.contrasena}
                            />
                        </div>

                        {/* Opciones */}
                        <div className="opciones">
                            <CampoToggle
                                id="recordar"
                                name="recordar"
                                label="Recordarme"
                                checked={datos.recordar}
                                onChange={cambiarRecordar}
                            />
                            <a href="#" className="olvide">¿Olvidaste tu contraseña?</a>
                        </div>

                        <Boton type="submit" variante="primario" cargando={cargando}>
                            <span>Ingresar al club</span>
                            <ArrowRight size={17} />
                        </Boton>
                    </form>

                    <div className="separador"><span>o continuá con</span></div>

                    <Boton variante="secundario" onClick={() => { }}>
                        <FcGoogle size={18} />
                        Continuar con Google
                    </Boton>

                    <p className="pie">
                        ¿No tenés cuenta?&nbsp;<a href="#">Registrate gratis</a>
                    </p>

                </div>
            </section>
        </main>
    );
}