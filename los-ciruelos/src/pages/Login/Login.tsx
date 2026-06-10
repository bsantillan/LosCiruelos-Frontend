import { useState } from "react";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import { EmailNoVerificadoError, ErroresLogin, useLogin } from "../../hooks/useLogin";
import { LoginRequest } from "../../types/auth.types";
import { useNavigate } from "react-router-dom";
import { AuthPanelLayout } from "../../layouts/AuthLayout/AuthPanelLayout";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import BotonGoogle from "../../components/ui/Boton/BotonGoogle";
import { CredentialResponse } from "@react-oauth/google";

export default function Login() {
    const navigate = useNavigate();
    const [datos, setDatos] = useState<LoginRequest>({ email: "", password: "" });
    const [recordar, setRecordar] = useState(false);
    const [errores, setErrores] = useState<ErroresLogin>({});
    const { login, cargando, erroresApi, setErroresApi } = useLogin();
    const { loginConGoogle, handleGoogleError, cargando: cargandoGoogle, erroresApi: erroresGoogle, setErroresApi: setErroresGoogle } = useGoogleAuth();

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        try {
            await loginConGoogle(credentialResponse);
            navigate("/");
        } catch (error) {
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
            await login(datos);
            navigate("/");
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
                    <div className={`alerta-error${(erroresApi.general || erroresGoogle.general) ? " alerta-error--visible" : ""}`} role="alert">
                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                        {erroresApi.general || erroresGoogle.general}
                    </div>
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
                        <a href="/olvide-contrasena" className="olvide">¿Olvidaste tu contraseña?</a>
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
                    texto="Continuar con Google"
                />
                <p className="pie">
                    ¿No tenés cuenta?&nbsp;<a href="/register">Registrate gratis</a>
                </p>
            </div>
        </AuthPanelLayout>
    );
}