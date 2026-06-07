import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, AlertCircle, MailCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import Boton from "../../components/ui/Boton/Boton";
import { ErroresVerificacion, useVerificacion } from "../../hooks/useVerificacion";
import "../Login/Login.css";
import { VerificarEmailRequest } from "../../types/auth.types";

const LARGO_CODIGO = 6;
const SEGUNDOS_REENVIO = 60;

const CONFIG = {
    VERIFY_EMAIL: {
        subtitulo: "Verificación requerida",
        titulo: "REVISÁ TU EMAIL",
        descripcion: "Te enviamos un código de 6 dígitos para activar tu cuenta.",
        exitoRuta: "/login",
        volverRuta: "/login",
        volverTexto: "Volver al inicio de sesión",
    },
    PASSWORD_RESET: {
        subtitulo: "Reseteo de contraseña",
        titulo: "INGRESÁ EL CÓDIGO",
        descripcion: "Te enviamos un código de 6 dígitos para resetear tu contraseña.",
        exitoRuta: "/nueva-contrasena",
        volverRuta: "/olvide-contrasena",
        volverTexto: "Volver",
    },
};

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
function PanelVisual({ tipo }: { tipo: "VERIFY_EMAIL" | "PASSWORD_RESET" }) {
    const titular = tipo === "VERIFY_EMAIL"
        ? <><br />VERIFICÁ<br />TU <em>CUENTA</em></>
        : <>RESETEÁ<br />TU <em>CONTRASEÑA</em></>;

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
            <div className="panel-visual__logo animar-subir"><Logo /></div>
            <div className="panel-visual__contenido">
                <span className="etiqueta animar-subir demora-1">Club de Pádel · La Plata</span>
                <h1 className="titular animar-subir demora-2">{titular}</h1>
            </div>
        </aside>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function VerificarCodigo() {
    const navigate = useNavigate();
    const location = useLocation();
    const [errores, setErrores] = useState<ErroresVerificacion>({});
    const { email, tipo } = (location.state ?? {}) as {
        email: string;
        tipo: "VERIFY_EMAIL" | "PASSWORD_RESET";
    };

    // Si no vienen los datos necesarios, redirigir
    useEffect(() => {
        if (!email || !tipo) navigate("/login", { replace: true });
    }, []);

    const config = CONFIG[tipo ?? "VERIFY_EMAIL"];
    const { verificarCodigo, reenviarCodigo, cargando, reenviando, erroresApi } = useVerificacion();

    const [codigo, setCodigo] = useState<string[]>(Array(LARGO_CODIGO).fill(""));
    const [reenvioContador, setReenvioContador] = useState(0);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (reenvioContador <= 0) return;
        const timer = setTimeout(() => setReenvioContador(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [reenvioContador]);

    const handleCambio = (index: number, valor: string) => {
        setErrores({});
        const limpio = valor.replace(/\D/g, "").slice(-1);
        const nuevo = [...codigo];
        nuevo[index] = limpio;
        setCodigo(nuevo);
        if (limpio && index < LARGO_CODIGO - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !codigo[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < LARGO_CODIGO - 1) inputsRef.current[index + 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pegado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LARGO_CODIGO);
        if (!pegado) return;
        const nuevo = Array(LARGO_CODIGO).fill("");
        pegado.split("").forEach((char, i) => { nuevo[i] = char; });
        setCodigo(nuevo);
        inputsRef.current[Math.min(pegado.length, LARGO_CODIGO - 1)]?.focus();
    };

    const validar = (): boolean => {
        const nuevosErrores: ErroresVerificacion = {};
        const codigoStr = codigo.join("");

        if (codigo.length > 0) { nuevosErrores.codigo = "El código es obligatorio." }
        else {
            if (codigoStr.length < LARGO_CODIGO) nuevosErrores.codigo = "El código debe tener 6 digitos.";
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validar()) return;
        const codigoStr = codigo.join("");
        if (codigoStr.length < LARGO_CODIGO) return;
        try {
            await verificarCodigo({
                email,
                codigo: codigoStr,
                tipo_codigo: tipo,
            });
            navigate(config.exitoRuta, { state: { email } });
        } catch {
            setCodigo(Array(LARGO_CODIGO).fill(""));
            inputsRef.current[0]?.focus();
        }
    };

    const handleReenviar = async () => {
        try {
            await reenviarCodigo(email!, tipo!);
            setReenvioContador(SEGUNDOS_REENVIO);
            setCodigo(Array(LARGO_CODIGO).fill(""));
            inputsRef.current[0]?.focus();
        } catch { }
    };

    return (
        <main className="pagina-login">
            <PanelVisual tipo={tipo ?? "VERIFY_EMAIL"} />

            <section className="panel-formulario" aria-label="Verificación de código">
                <div
                    className="panel-formulario__imagen"
                    style={{ backgroundImage: `url(${padelBg})` }}
                    aria-hidden="true"
                />
                <div className="formulario-contenedor">

                    {/* Logo mobile */}
                    <div className="logo-mobile">
                        <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo-mobile__imagen" />
                        <span className="logo-mobile__texto">LOS CIRUELOS</span>
                    </div>

                    <div className="formulario-vista">

                        <button
                            className="verificacion-panel__volver"
                            onClick={() => navigate(config.volverRuta)}
                            type="button"
                        >
                            <ArrowLeft size={14} />
                            {config.volverTexto}
                        </button>

                        <div className="verificacion-panel__icono">
                            <MailCheck size={24} />
                        </div>

                        <p className="verificacion-panel__subtitulo">{config.subtitulo}</p>
                        <h2 className="verificacion-panel__titulo">{config.titulo}</h2>
                        <p className="verificacion-panel__descripcion">
                            {config.descripcion} Código enviado a <strong>{email}</strong>.
                        </p>

                        <form onSubmit={enviar} noValidate>
                            <div className="codigo-campos" onPaste={handlePaste}>
                                {codigo.map((digito, i) => (
                                    <input
                                        key={i}
                                        ref={el => { inputsRef.current[i] = el; }}
                                        className={`codigo-campo${erroresApi.codigo ? " codigo-campo--error" : ""}`}
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

                            <div className="codigo-error">
                                {(errores.codigo || erroresApi.codigo || erroresApi.general) && (
                                    <>
                                        <AlertCircle size={12} />
                                        <span>{errores.codigo || (erroresApi.codigo ?? erroresApi.general)}</span>
                                    </>
                                )}
                            </div>

                            <Boton
                                type="submit"
                                variante="primario"
                                cargando={cargando}
                            >
                                <span>Verificar</span>
                                <ArrowRight size={17} />
                            </Boton>
                        </form>

                        <div className="reenviar">
                            {reenvioContador > 0 ? (
                                <span>
                                    Podés pedir otro código en{" "}
                                    <span className="reenviar__contador">{reenvioContador}s</span>
                                </span>
                            ) : (
                                <span>
                                    ¿No te llegó?{" "}
                                    <button
                                        type="button"
                                        className="reenviar__boton"
                                        onClick={handleReenviar}
                                        disabled={reenviando}
                                    >
                                        {reenviando ? "Enviando..." : "Reenviar código"}
                                    </button>
                                </span>
                            )}
                        </div>

                    </div>
                </div>
            </section>
        </main>
    );
}