import { useState } from "react";
import { Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import { EmailNoVerificadoError, useLogin, type ErroresLogin } from "../../hooks/useLogin";
import type { LoginRequest, LoginResponse } from "../../types/auth.types";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthPanelLayout } from "../../layouts/AuthLayout/AuthPanelLayout";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import BotonGoogle from "../../components/ui/Boton/BotonGoogle";
import type { CredentialResponse } from "@react-oauth/google";
import { destinoDespuesDelLogin, leerSeleccion } from "../../utils/seleccionReserva";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";
import ModalLegal, { type DocumentoLegal } from "../../components/Legales/ModalLegal";

const MENSAJES_EXITO: Record<string, string> = {
    passwordReseteado: "Tu contraseña se actualizó. Ya podés ingresar.",
    cuentaVerificada: "Tu cuenta está verificada. Ya podés ingresar.",
    cuentaYaVerificada: "Tu cuenta ya estaba verificada. Ingresá con tu email y contraseña.",
};

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const estado = (location.state ?? {}) as Record<string, unknown>;
    const mensajeExito = Object.keys(MENSAJES_EXITO).find(clave => estado[clave]);
    // Viene de elegir un turno sin sesión: después del login se retoma
    const [hayTurnoGuardado] = useState(() => leerSeleccion() !== null);
    const irDespuesDelLogin = ({ perfilCompleto, rol }: LoginResponse) => {
        const destino = destinoDespuesDelLogin(perfilCompleto, rol);
        navigate(destino, destino === "/reservas" || destino === "/perfil" ? { state: { desdeReserva: true } } : undefined);
    };
    const [datos, setDatos] = useState<LoginRequest>({ email: "", password: "" });
    const [recordar, setRecordar] = useState(false);
    const [legal, setLegal] = useState<DocumentoLegal | null>(null);
    const [errores, setErrores] = useState<ErroresLogin>({});
    const { login, cargando, erroresApi, setErroresApi } = useLogin();
    const { loginConGoogle, handleGoogleError, erroresApi: erroresGoogle, setErroresApi: setErroresGoogle } = useGoogleAuth();

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        try {
            irDespuesDelLogin(await loginConGoogle(credentialResponse, recordar));
        } catch {
            // el error ya se muestra en pantalla
        }
    };

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDatos(prev => ({ ...prev, [name]: value }));
        setErrores({});
        setErroresApi({});
        setErroresGoogle({});
    };

    const validar = (): boolean => {
        const nuevosErrores: ErroresLogin = {};
        if (!datos.email) nuevosErrores.email = "El correo es obligatorio.";
        if (!datos.password) nuevosErrores.password = "La contraseña es obligatoria.";
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validar()) return;
        try {
            irDespuesDelLogin(await login(datos, recordar));
        } catch (error) {
            if (error instanceof EmailNoVerificadoError) {
                navigate("/verificar-codigo", {
                    state: { email: datos.email, tipo: "VERIFY_EMAIL" }
                });
            }
        }
    };

    return (
        <AuthPanelLayout
            titular={<>TU PRÓXIMO<br />PARTIDO<br />TE <em>ESPERA</em></>}
            ariaLabel="Formulario de ingreso"
        >
            <div className="formulario-vista">
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
                    {/* Nota fija: viene de elegir un turno sin sesión */}
                    {hayTurnoGuardado && (
                        <div className="alerta-error alerta-error--visible alerta-exito" role="status">
                            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            Ingresá para terminar tu reserva. Guardamos el turno que elegiste.
                        </div>
                    )}
                    {/* Éxito (contraseña cambiada, cuenta verificada) o error: aviso flotante arriba a la derecha */}
                        {mensajeExito && <AvisoTransitorio tipo="ok">{MENSAJES_EXITO[mensajeExito]}</AvisoTransitorio>}
                        {(erroresApi.general || erroresGoogle.general) && (
                            <AvisoTransitorio tipo="error">{erroresApi.general || erroresGoogle.general}</AvisoTransitorio>
                        )}
                    <div className="campos">
                        <CampoInput
                            id="email" name="email" label="Correo electrónico"
                            type="email" value={datos.email} onChange={cambiarInput}
                            placeholder="vos@email.com" autoComplete="email"
                            icono={<Mail size={16} />} required
                            error={errores.email || erroresApi.email}
                        />
                        <CampoInput
                            id="password" name="password" label="Contraseña"
                            type="password" value={datos.password} onChange={cambiarInput}
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
                        <Link to="/olvide-contrasena" className="olvide">¿Olvidaste tu contraseña?</Link>
                    </div>
                    <Boton type="submit" variante="primario" cargando={cargando}>
                        <span>Ingresar al club</span>
                        <ArrowRight size={17} />
                    </Boton>
                </form>

                <div className="separador"><span>o continuá con</span></div>
                <BotonGoogle
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    texto="continue_with"
                />
                <p className="pie">
                    ¿No tenés cuenta?&nbsp;<Link to="/register">Registrate gratis</Link>
                </p>
                <p className="pie pie--legales">
                    Al continuar con Google aceptás los{" "}
                    <button type="button" className="enlace-legal" onClick={() => setLegal("terminos")}>Términos</button> y la{" "}
                    <button type="button" className="enlace-legal" onClick={() => setLegal("privacidad")}>Política de privacidad</button>.
                </p>
            </div>
            {legal && <ModalLegal documento={legal} onCerrar={() => setLegal(null)} />}
        </AuthPanelLayout>
    );
}