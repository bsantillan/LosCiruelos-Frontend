import { useState, useRef, useEffect } from "react";
import { Mail, Lock, ArrowRight, AlertCircle, MailCheck, ArrowLeft } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import './Login.css';
import { ErroresLogin, useLogin } from "../../hooks/useLogin";
import { LoginRequest } from "../../types/auth.types";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const LARGO_CODIGO = 6;
const SEGUNDOS_REENVIO = 60;

/* ─── LOGO ───────────────────────────────────────── */
function Logo() {
    return (
        <div className="logo">
            <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo__imagen" />
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
            <div className="panel-visual__imagen" style={{ backgroundImage: `url(${padelBg})` }} aria-hidden="true" />
            <div className="panel-visual__logo animar-subir"><Logo /></div>
            <div className="panel-visual__contenido">
                <span className="etiqueta animar-subir demora-1">Club de Pádel · La Plata</span>
                <h1 className="titular animar-subir demora-2">
                    TU PRÓXIMO<br />PARTIDO<br />TE <em>ESPERA</em>
                </h1>
            </div>
        </aside>
    );
}

/* ─── PANEL VERIFICACIÓN ─────────────────────────── */
function PanelVerificacion({
    email,
    onVolver,
}: {
    email: string;
    onVolver: () => void;
}) {
    const navigate = useNavigate();
    const [codigo, setCodigo] = useState<string[]>(Array(LARGO_CODIGO).fill(""));
    const [errorCodigo, setErrorCodigo] = useState<string>("");
    const [cargando, setCargando] = useState(false);
    const [reenvioContador, setReenvioContador] = useState(SEGUNDOS_REENVIO);
    const [reenviando, setReenviando] = useState(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown para reenvío
    useEffect(() => {
        if (reenvioContador <= 0) return;
        const timer = setTimeout(() => setReenvioContador(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [reenvioContador]);

    const handleCambio = (index: number, valor: string) => {
        // Solo números
        const limpio = valor.replace(/\D/g, "").slice(-1);
        const nuevo = [...codigo];
        nuevo[index] = limpio;
        setCodigo(nuevo);
        setErrorCodigo("");

        // Avanzar al siguiente campo
        if (limpio && index < LARGO_CODIGO - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !codigo[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
        if (e.key === "ArrowRight" && index < LARGO_CODIGO - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pegado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LARGO_CODIGO);
        if (!pegado) return;
        const nuevo = Array(LARGO_CODIGO).fill("");
        pegado.split("").forEach((char, i) => { nuevo[i] = char; });
        setCodigo(nuevo);
        inputsRef.current[Math.min(pegado.length, LARGO_CODIGO - 1)]?.focus();
        if (pegado.length === LARGO_CODIGO) enviarCodigo(pegado);
    };

    const enviarCodigo = async (codigoStr: string) => {
        setCargando(true);
        setErrorCodigo("");
        try {
            await authService.verificarEmail({
                email,
                codigo: codigoStr,
                tipo_codigo: "VERIFY_EMAIL",
            });
            navigate("/login");
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 400 || status === 404) {
                setErrorCodigo("Código incorrecto. Revisá e intentá de nuevo.");
            } else if (status === 410) {
                setErrorCodigo("El código expiró. Reenvialos y probá de nuevo.");
            } else {
                setErrorCodigo("Error al verificar. Intentá más tarde.");
            }
            setCodigo(Array(LARGO_CODIGO).fill(""));
            inputsRef.current[0]?.focus();
        } finally {
            setCargando(false);
        }
    };

    const reenviarCodigo = async () => {
        setReenviando(true);
        try {
            await authService.reenviarToken(email, "VERIFY_EMAIL");
            setReenvioContador(SEGUNDOS_REENVIO);
            setErrorCodigo("");
            setCodigo(Array(LARGO_CODIGO).fill(""));
            inputsRef.current[0]?.focus();
        } catch {
            setErrorCodigo("No se pudo reenviar el código. Intentá más tarde.");
        } finally {
            setReenviando(false);
        }
    };

    const codigoStr = codigo.join("");

    return (
        <div className="verificacion-panel">

            <button className="verificacion-panel__volver" onClick={onVolver} type="button">
                <ArrowLeft size={14} />
                Volver al inicio de sesión
            </button>

            <div className="verificacion-panel__icono">
                <MailCheck size={24} />
            </div>

            <p className="verificacion-panel__subtitulo">Verificación requerida</p>
            <h2 className="verificacion-panel__titulo">REVISÁ TU EMAIL</h2>
            <p className="verificacion-panel__descripcion">
                Te enviamos un código de 6 dígitos a <strong>{email}</strong>. Ingresalo para activar tu cuenta.
            </p>

            {/* Celdas del código */}
            <div className="codigo-campos" onPaste={handlePaste}>
                {codigo.map((digito, i) => (
                    <input
                        key={i}
                        ref={el => { inputsRef.current[i] = el; }}
                        className={`codigo-campo${errorCodigo ? " codigo-campo--error" : ""}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digito}
                        onChange={e => handleCambio(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onFocus={e => e.target.select()}
                        disabled={cargando}
                        aria-label={`Dígito ${i + 1} del código`}
                    />
                ))}
            </div>

            {/* Error código */}
            <div className="codigo-error">
                {errorCodigo && (
                    <>
                        <AlertCircle size={12} />
                        <span>{errorCodigo}</span>
                    </>
                )}
            </div>

            <Boton
                type="button"
                variante="primario"
                cargando={cargando}
                disabled={codigoStr.length < LARGO_CODIGO || cargando}
                onClick={() => enviarCodigo(codigoStr)}
            >
                <span>Verificar cuenta</span>
                <ArrowRight size={17} />
            </Boton>

            {/* Reenviar */}
            <div className="reenviar">
                {reenvioContador > 0 ? (
                    <span>
                        Reenviar código en{" "}
                        <span className="reenviar__contador">{reenvioContador}s</span>
                    </span>
                ) : (
                    <span>
                        ¿No te llegó?{" "}
                        <button
                            type="button"
                            className="reenviar__boton"
                            onClick={reenviarCodigo}
                            disabled={reenviando}
                        >
                            {reenviando ? "Enviando..." : "Reenviar código"}
                        </button>
                    </span>
                )}
            </div>
        </div>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Login() {
    const navigate = useNavigate();
    const [datosLogin, setDatosLogin] = useState<LoginRequest>({ email: "", password: "" });
    const [recordar, setRecordar] = useState(false);
    const [errores, setErrores] = useState<ErroresLogin>({});
    const { login, cargando, erroresApi, setErroresApi } = useLogin();

    const mostrarVerificacion = !!erroresApi.email_verificado;

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDatosLogin(prev => ({ ...prev, [name]: value }));
        setErrores({});
        setErroresApi({});
    };

    const validar = (): boolean => {
        const nuevosErrores: ErroresLogin = {};
        if (!datosLogin.email) nuevosErrores.email = "El correo es obligatorio.";
        if (!datosLogin.password) nuevosErrores.password = "La contraseña es obligatoria.";
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validar()) return;
        try {
            await login(datosLogin);
            navigate("/");
        } catch { }
    };

    return (
        <main className="pagina-login">
            <PanelVisual />

            <section className="panel-formulario" aria-label="Formulario de ingreso">
                <div className="panel-formulario__imagen" style={{ backgroundImage: `url(${padelBg})` }} aria-hidden="true" />
                <div className="formulario-contenedor">

                    {/* Logo mobile */}
                    <div className="logo-mobile">
                        <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo-mobile__imagen" />
                        <span className="logo-mobile__texto">LOS CIRUELOS</span>
                    </div>

                    {/* ── Vista verificación ── */}
                    {mostrarVerificacion ? (
                        <div className="formulario-vista" key="verificacion">
                            <PanelVerificacion
                                email={datosLogin.email}
                                onVolver={() => setErroresApi({})}
                            />
                        </div>

                    ) : (
                        <>
                            <div className="formulario-vista" key="verificacion">

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

                                <form onSubmit={enviar} noValidate>

                                    {/* Error general */}
                                    <div className={`alerta-error${erroresApi.general ? " alerta-error--visible" : ""}`} role="alert">
                                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                        {erroresApi.general}
                                    </div>

                                    <div className="campos">
                                        <CampoInput
                                            id="email" name="email" label="Correo electrónico"
                                            type="email" value={datosLogin.email} onChange={cambiarInput}
                                            placeholder="vos@email.com" autoComplete="email"
                                            icono={<Mail size={16} />} required
                                            error={errores.email || erroresApi.email}
                                        />
                                        <CampoInput
                                            id="password" name="password" label="Contraseña"
                                            type="password" value={datosLogin.password} onChange={cambiarInput}
                                            placeholder="••••••••" autoComplete="current-password"
                                            icono={<Lock size={16} />} required
                                            error={errores.password || erroresApi.password}
                                        />
                                    </div>

                                    <div className="opciones">
                                        <CampoToggle
                                            id="recordar" name="recordar" label="Recordarme"
                                            checked={recordar}
                                            onChange={e => setRecordar(e.target.checked)}
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
                                    ¿No tenés cuenta?&nbsp;<a href="/register">Registrate gratis</a>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}