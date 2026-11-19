import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import { useResetPassword } from "../../hooks/useResetPassword";
import { AuthPanelLayout } from "../../layouts/AuthLayout/AuthPanelLayout";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";

export default function OlvideContrasena() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [errores, setErrores] = useState<{ email?: string }>({});
    const { solicitarReset, cargando, erroresApi, setErroresApi } = useResetPassword();

    const handleCambiarEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        setErroresApi({});
        setErrores({});
    };

    const validar = (): boolean => {
        const e: typeof errores = {};
        if (!email) e.email = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "El correo no es válido.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validar()) return;
        try {
            await solicitarReset(email);
            navigate("/verificar-codigo", {
                state: { email, tipo: "PASSWORD_RESET" }
            });
        } catch {
            // el error ya se muestra en pantalla
        }
    };

    return (

        <AuthPanelLayout
            titular={<>RECUPERÁ<br />TU <em>ACCESO</em></>}
            ariaLabel="Recuperar contraseña"
        >
            <div className="formulario-vista">

                <button
                    className="accion accion--chica verificacion-panel__volver"
                    onClick={() => navigate("/login")}
                    type="button"
                >
                    <ArrowLeft size={14} />
                    Volver al inicio de sesión
                </button>

                <div className="animar-subir">
                    <div className="badge-sistema">
                        <span className="badge-sistema__punto" />
                        Club de Pádel · La Plata
                    </div>
                    <p className="formulario-subtitulo">Recuperar acceso</p>
                    <h2 className="formulario-titulo">OLVIDÉ MI<br />CONTRASEÑA</h2>
                    <p className="formulario-descripcion">
                        Ingresá tu email y te enviamos un código para recuperar tu cuenta.
                    </p>
                </div>

                <form onSubmit={enviar} noValidate>

                    {/* Error general */}
                        {erroresApi.general && <AvisoTransitorio tipo="error">{erroresApi.general}</AvisoTransitorio>}
                    <div className="campos">
                        <CampoInput
                            id="email"
                            name="email"
                            label="Correo electrónico"
                            type="email"
                            value={email}
                            onChange={handleCambiarEmail}
                            placeholder="vos@email.com"
                            autoComplete="email"
                            icono={<Mail size={16} />}
                            required
                            error={errores.email || erroresApi.email}
                        />
                    </div>
                    <div style={{ marginTop: 80, marginBottom: 0 }}></div>
                    <Boton type="submit" variante="primario" cargando={cargando}>
                        <span>Enviar código</span>
                        <ArrowRight size={17} />
                    </Boton>
                </form>

                <p className="pie">
                    ¿Recordaste tu contraseña?&nbsp;
                    <Link to="/login">Ingresá acá</Link>
                </p>

            </div>
        </AuthPanelLayout>
    );
}