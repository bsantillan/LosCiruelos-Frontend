import { useState, useEffect } from "react";
import { Lock, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import Boton from "../../components/ui/Boton/Boton";
import { ErroresResetPassword, useResetPassword } from "../../hooks/useResetPassword";
import "../Login/Login.css";
import "./NuevaContrasena.css";

function Logo() {
    return (
        <div className="logo">
            <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo__imagen" />
            <span className="logo-texto">LOS CIRUELOS</span>
        </div>
    );
}

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
            <div className="panel-visual__logo animar-subir"><Logo /></div>
            <div className="panel-visual__contenido">
                <span className="etiqueta animar-subir demora-1">Club de Pádel · La Plata</span>
                <h1 className="titular animar-subir demora-2">
                    NUEVA<br /><em>CONTRASEÑA</em>
                </h1>
            </div>
        </aside>
    );
}

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
        <main className="pagina-login">
            <PanelVisual />

            <section className="panel-formulario" aria-label="Nueva contraseña">
                <div
                    className="panel-formulario__imagen"
                    style={{ backgroundImage: `url(${padelBg})` }}
                    aria-hidden="true"
                />
                <div className="formulario-contenedor">

                    <div className="logo-mobile">
                        <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo-mobile__imagen" />
                        <span className="logo-mobile__texto">LOS CIRUELOS</span>
                    </div>

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

                                {erroresApi.general && (
                                    <p className="nueva-contrasena__error-general">
                                        {erroresApi.general}
                                    </p>
                                )}
                            </div>

                            <div className="nueva-contrasena__boton">
                                <Boton type="submit" variante="primario" cargando={cargando}>
                                    <span>Guardar contraseña</span>
                                    <Check size={17} />
                                </Boton>
                            </div>
                        </form>

                    </div>
                </div>
            </section>
        </main>
    );
}