import { useState, useEffect } from "react";
import { Lock, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import { ErroresResetPassword, useResetPassword } from "../../hooks/useResetPassword";
import { AuthPanelLayout } from "../../layouts/AuthLayout/AuthPanelLayout";

export default function NuevaContrasena() {
    const navigate = useNavigate();
    const location = useLocation();
    const { email } = (location.state ?? {}) as { email?: string };

    useEffect(() => {
        if (!email) navigate("/login", { replace: true });
    }, []);

    const [datos, setDatos] = useState({ nuevaPassword: "", confirmarPassword: "" });
    const [errores, setErrores] = useState<ErroresResetPassword>({});
    const { confirmarReset, cargando, erroresApi, setErroresApi } = useResetPassword();

    const cambiar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDatos(p => ({ ...p, [name]: value }));
        setErrores({});
        setErroresApi({});
    };

    const validar = (): boolean => {
        const nuevosErrores: ErroresResetPassword = {};
        if (!datos.nuevaPassword) {
            nuevosErrores.nuevaPassword = "La contraseña es obligatoria.";
        } else if (
            datos.nuevaPassword.length < 8 ||
            datos.nuevaPassword.length > 30 ||
            !/[A-Z]/.test(datos.nuevaPassword) ||
            !/[a-z]/.test(datos.nuevaPassword) ||
            !/[0-9]/.test(datos.nuevaPassword) ||
            !/[^A-Za-z0-9]/.test(datos.nuevaPassword)
        ) {
            nuevosErrores.nuevaPassword = "Debe tener entre 8 y 30 caracteres, una mayúscula, una minúscula, un número y un símbolo.";
        }

        if (!datos.confirmarPassword) nuevosErrores.repeatNuevaPassword = "Confirmá tu contraseña.";
        else if (datos.nuevaPassword !== datos.confirmarPassword) nuevosErrores.repeatNuevaPassword = "Las contraseñas no coinciden.";
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validar()) return;

        try {
            await confirmarReset(email!, datos.nuevaPassword);
            navigate("/login", { state: { passwordReseteado: true } });
        } catch (error) {
        }
    };

    return (
        <AuthPanelLayout
            titular={<>NUEVA<br /><em>CONTRASEÑA</em></>}
            ariaLabel="Nueva contraseña"
        >
            <div className="formulario-vista">

                <button
                    className="verificacion-panel__volver"
                    onClick={() => navigate(-1)}
                    type="button"
                >
                    <ArrowLeft size={14} />
                    Volver
                </button>
                <div className="animar-subir">
                    <div className="badge-sistema">
                        <span className="badge-sistema__punto" />
                        Club de Pádel · La Plata
                    </div>
                    <p className="formulario-subtitulo">Último paso</p>
                    <h2 className="formulario-titulo">NUEVA<br />CONTRASEÑA</h2>
                    <p className="formulario-descripcion">
                        Elegí una contraseña segura para tu cuenta.
                    </p>
                </div>

                <form onSubmit={enviar} noValidate>

                    <div className={`alerta-error${erroresApi.general ? " alerta-error--visible" : ""}`} role="alert">
                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                        {erroresApi.general}
                    </div>

                    <div className="campos">
                        <CampoInput
                            id="nuevaPassword"
                            name="nuevaPassword"
                            label="Nueva contraseña"
                            type="password"
                            value={datos.nuevaPassword}
                            onChange={cambiar}
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                            icono={<Lock size={16} />}
                            required
                            error={errores.nuevaPassword || erroresApi.nuevaPassword}
                        />
                        <CampoInput
                            id="confirmarPassword"
                            name="confirmarPassword"
                            label="Confirmá tu contraseña"
                            type="password"
                            value={datos.confirmarPassword}
                            onChange={cambiar}
                            placeholder="Repetí tu contraseña"
                            autoComplete="new-password"
                            icono={<Lock size={16} />}
                            required
                            error={errores.repeatNuevaPassword}
                        />
                    </div>

                    <div className="nueva-contrasena__boton">
                        <Boton type="submit" variante="primario" cargando={cargando}>
                            <span>Guardar contraseña</span>
                            <Check size={17} />
                        </Boton>
                    </div>
                </form>

            </div>
        </AuthPanelLayout>
    );
}