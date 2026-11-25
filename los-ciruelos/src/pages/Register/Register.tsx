import { useState } from "react";
import { User, Mail, Lock, ArrowRight, ArrowLeft, Check, FileText } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoTelefono from "../../components/ui/CampoTelefono/CampoTelefono";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import Boton from "../../components/ui/Boton/Boton";
import { AuthPanelLayout } from "../../layouts/AuthLayout/AuthPanelLayout";
import { useRegister, type ErroresRegister } from "../../hooks/useRegister";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import BotonGoogle from "../../components/ui/Boton/BotonGoogle";
import type { RegisterRequest } from "../../types/register.types";
import type { CredentialResponse } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";
import { celularValido } from "../../utils/telefono";
import { destinoDespuesDelLogin } from "../../utils/seleccionReserva";
import { CATEGORIAS, POSICIONES } from "../../config/opcionesJugador";
import "./Register.css";
import ModalLegal, { type DocumentoLegal } from "../../components/Legales/ModalLegal";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";

const PASOS = [
    { numero: 1, etiqueta: "Personal" },
    { numero: 2, etiqueta: "Club" },
    { numero: 3, etiqueta: "Términos" },
];

const INFO_PASOS = [
    { subtitulo: "Empecemos", titulo: "TUS DATOS" },
    { subtitulo: "Tu nivel de juego", titulo: "EN CANCHA" },
    { subtitulo: "Casi listo", titulo: "LEÉ Y ACEPTÁ" },
];

const TITULAR_PASOS = [
    <>CONTANOS<br />QUIÉN<br />SOS <em>VOS</em></>,
    <>TU NIVEL<br />EN LA<br /><em>CANCHA</em></>,
    <>CASI<br />ESTÁS<br /><em>ADENTRO</em></>,
];

/** Los dos textos que hay que aceptar en el paso 3: cada uno se lee en un modal */
const DOCUMENTOS_A_ACEPTAR: { documento: DocumentoLegal; titulo: string; resumen: string }[] = [
    {
        documento: "terminos",
        titulo: "Términos y condiciones",
        resumen: "Tu cuenta, cómo se reserva y se paga, las cancelaciones y devoluciones, y el uso del club.",
    },
    {
        documento: "privacidad",
        titulo: "Política de privacidad",
        resumen: "Qué datos guardamos, para qué los usamos, con quién los compartimos y cómo pedir verlos o borrarlos.",
    },
];

export default function Register() {
    const navigate = useNavigate();
    const [paso, setPaso] = useState(1);
    const [datos, setDatos] = useState<RegisterRequest>({
        nombre: "", apellido: "", email: "",
        password: "", telefono: "", categoria: "",
        posicion: "", termsAccepted: false, aceptarNotificacion: false,
    });
    const [confirmarPassword, setConfirmarPassword] = useState("");
    const [errores, setErrores] = useState<ErroresRegister>({});
    // Hay que aceptar los dos por separado; al backend va termsAccepted solo si están los dos
    const [aceptados, setAceptados] = useState<Record<DocumentoLegal, boolean>>({ terminos: false, privacidad: false });
    const [legal, setLegal] = useState<{ documento: DocumentoLegal; paraAceptar: boolean } | null>(null);
    const { register, cargando, erroresApi, setErroresApi } = useRegister();
    const { loginConGoogle, handleGoogleError, erroresApi: erroresGoogle, setErroresApi: setErroresGoogle } = useGoogleAuth();

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        try {
            const respuesta = await loginConGoogle(credentialResponse);
            // Si venía de elegir un turno, se retoma (antes, a completar el perfil si hace falta)
            const destino = destinoDespuesDelLogin(respuesta.perfilCompleto, respuesta.rol);
            navigate(destino, destino === "/reservas" || destino === "/perfil" ? { state: { desdeReserva: true } } : undefined);
        } catch {
            // el error ya se muestra en pantalla
        }
    };

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "confirmarPassword") {
            setConfirmarPassword(value);
        } else {
            setDatos(prev => ({ ...prev, [name]: value }));
        }
        setErrores({});
        setErroresApi({});
        setErroresGoogle({});
    };

    const cambiarSelect = (name: keyof RegisterRequest) => (e: { target: { value: string | number } }) => {
        setDatos(prev => ({ ...prev, [name]: e.target.value }));
        setErrores({});
        setErroresApi({});
    };

    const cambiarNotificacion = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDatos(p => ({ ...p, aceptarNotificacion: e.target.checked }));
        setErrores({});
        setErroresApi({});
    };

    const cambiarAceptado = (documento: DocumentoLegal, valor: boolean) => {
        setAceptados(p => ({ ...p, [documento]: valor }));
        setErrores({});
        setErroresApi({});
    };

    const validarPaso1 = (): boolean => {
        const e: ErroresRegister = {};
        if (!datos.nombre) e.nombre = "El nombre es obligatorio.";
        else if (datos.nombre.length < 2) e.nombre = "Mínimo 2 caracteres.";
        else if (datos.nombre.length > 50) e.nombre = "Máximo 50 caracteres.";
        if (!datos.apellido) e.apellido = "El apellido es obligatorio.";
        else if (datos.apellido.length < 2) e.apellido = "Mínimo 2 caracteres.";
        else if (datos.apellido.length > 50) e.apellido = "Máximo 50 caracteres.";
        if (!datos.email) e.email = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) e.email = "El correo no es válido.";
        if (!datos.telefono) e.telefono = "El celular es obligatorio.";
        else if (!celularValido(datos.telefono)) e.telefono = "Ingresá un celular válido, con el código de área.";
        if (!datos.password) {
            e.password = "La contraseña es obligatoria.";
        } else if (
            datos.password.length < 8 || datos.password.length > 30 ||
            !/[A-Z]/.test(datos.password) || !/[a-z]/.test(datos.password) ||
            !/[0-9]/.test(datos.password) || !/[^A-Za-z0-9]/.test(datos.password)
        ) {
            e.password = "Debe tener entre 8 y 30 caracteres, una mayúscula, una minúscula, un número y un símbolo.";
        }
        if (!confirmarPassword) e.confirmarPassword = "Confirmá tu contraseña.";
        else if (datos.password !== confirmarPassword) e.confirmarPassword = "Las contraseñas no coinciden.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const validarPaso2 = (): boolean => {
        const e: ErroresRegister = {};
        if (!datos.categoria) e.categoria = "La categoría es obligatoria.";
        if (!datos.posicion) e.posicion = "La posición es obligatoria.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const validarPaso3 = (): boolean => {
        const e: ErroresRegister = {};
        if (!aceptados.terminos) e.termsAccepted = "Debés aceptar los términos y condiciones para continuar.";
        if (!aceptados.privacidad) e.privacidadAceptada = "Debés aceptar la política de privacidad para continuar.";
        if (!datos.aceptarNotificacion) e.aceptarNotificacion = "Necesitamos poder avisarte sobre tus reservas.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const siguientePaso = () => {
        const esValido = paso === 1 ? validarPaso1() : paso === 2 ? validarPaso2() : true;
        if (!esValido) return;
        setPaso(prev => prev + 1);
    };

    const irAPaso = (numero: number) => {
        if (numero < paso) { setErrores({}); setPaso(numero); }
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validarPaso3()) return;
        try {
            await register({ ...datos, termsAccepted: aceptados.terminos && aceptados.privacidad });
            // El backend ya envió el código de verificación al email
            navigate("/verificar-codigo", { state: { email: datos.email, tipo: "VERIFY_EMAIL" } });
        } catch (error) {
            const e = error as ErroresRegister;
            if (e.nombre || e.apellido || e.email || e.telefono || e.password) setPaso(1);
            else if (e.categoria || e.posicion) setPaso(2);
            else if (e.termsAccepted || e.aceptarNotificacion) setPaso(3);
        }
    };

    const porcentajeProgreso = ((paso - 1) / (PASOS.length - 1)) * 100;

    return (
        <AuthPanelLayout
            titular={TITULAR_PASOS[paso - 1]}
            ariaLabel="Formulario de registro"
        >
            <div className="formulario-vista">

                {/* Indicador de pasos */}
                <div className="register-tabs" role="tablist">
                    {PASOS.map(p => {
                        const completado = paso > p.numero;
                        const activo = paso === p.numero;
                        return (
                            <button
                                key={p.numero}
                                role="tab"
                                aria-selected={activo}
                                className={`register-tab${activo ? " register-tab--activo" : ""}${completado ? " register-tab--completado" : ""}`}
                                onClick={() => irAPaso(p.numero)}
                                type="button"
                                tabIndex={completado ? 0 : -1}
                            >
                                <span className="register-tab__numero">
                                    {completado ? <Check size={11} /> : p.numero}
                                </span>
                                <span className="register-tab__etiqueta">{p.etiqueta}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Barra de progreso */}
                <div className="register-progreso">
                    <div
                        className="register-progreso__barra"
                        style={{ width: `${porcentajeProgreso === 0 ? 8 : porcentajeProgreso}%` }}
                    />
                </div>

                {/* Cabecera */}
                <div key={paso} style={{ marginTop: 24 }}>
                    <p className="formulario-subtitulo animar-subir">
                        {INFO_PASOS[paso - 1].subtitulo}
                    </p>
                    <h2 className="formulario-titulo animar-subir demora-1">
                        {INFO_PASOS[paso - 1].titulo}
                    </h2>
                </div>

                <form onSubmit={enviar} noValidate>

                    {/* Paso 1 */}
                    {paso === 1 && (
                        <div className="campos animar-subir demora-1">
                            <div className="register-campos-fila">
                                <CampoInput
                                    id="nombre" name="nombre" label="Nombre"
                                    value={datos.nombre} onChange={cambiarInput}
                                    placeholder="Juan" icono={<User size={16} />}
                                    required error={errores.nombre || erroresApi.nombre}
                                />
                                <CampoInput
                                    id="apellido" name="apellido" label="Apellido"
                                    value={datos.apellido} onChange={cambiarInput}
                                    placeholder="Pérez" icono={<User size={16} />}
                                    required error={errores.apellido || erroresApi.apellido}
                                />
                            </div>
                            <CampoInput
                                id="email" name="email" label="Correo electrónico"
                                type="email" value={datos.email} onChange={cambiarInput}
                                placeholder="vos@email.com" icono={<Mail size={16} />}
                                autoComplete="email" required error={errores.email || erroresApi.email}
                            />
                            <CampoTelefono
                                id="telefono" name="telefono" label="Celular"
                                value={datos.telefono}
                                onChange={telefono => { setDatos(prev => ({ ...prev, telefono })); setErrores({}); setErroresApi({}); }}
                                required error={errores.telefono || erroresApi.telefono}
                            />
                            <CampoInput
                                id="password" name="password" label="Contraseña"
                                type="password" value={datos.password} onChange={cambiarInput}
                                placeholder="Mínimo 8 caracteres" icono={<Lock size={16} />}
                                autoComplete="new-password" required error={errores.password || erroresApi.password}
                            />
                            <CampoInput
                                id="confirmarPassword" name="confirmarPassword"
                                label="Confirmá tu contraseña"
                                type="password" value={confirmarPassword} onChange={cambiarInput}
                                placeholder="Repetí tu contraseña" icono={<Lock size={16} />}
                                autoComplete="new-password" required error={errores.confirmarPassword}
                            />
                        </div>
                    )}

                    {/* Paso 2 */}
                    {paso === 2 && (
                        <div className="campos animar-subir demora-1">
                            <CampoSelect
                                id="categoria" name="categoria" label="Categoría"
                                value={datos.categoria} onChange={cambiarSelect("categoria")}
                                placeholder="Seleccioná tu categoría" opciones={CATEGORIAS}
                                required error={errores.categoria || erroresApi.categoria}
                            />
                            <CampoSelect
                                id="posicion" name="posicion" label="Posición en cancha"
                                value={datos.posicion} onChange={cambiarSelect("posicion")}
                                placeholder="Seleccioná tu posición" opciones={POSICIONES}
                                required error={errores.posicion || erroresApi.posicion}
                            />
                            <div className="info-nivel">
                                <p className="info-nivel__texto">
                                    ¿No sabés tu categoría? Podés registrarte como <strong>Principiante</strong>. Un administrador del club puede actualizarla cuando sea necesario.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error general */}
                        {(erroresApi.general || erroresGoogle.general) && <AvisoTransitorio tipo="error">{erroresApi.general || erroresGoogle.general}</AvisoTransitorio>}

                    {/* Paso 3 */}
                    {paso === 3 && (
                        <div className="campos animar-subir demora-1">
                            {DOCUMENTOS_A_ACEPTAR.map(({ documento, titulo, resumen }) => (
                                <div key={documento} className="registro-legal">
                                    <div className="registro-legal__cabecera">
                                        <span className="registro-legal__icono"><FileText size={18} /></span>
                                        <div className="registro-legal__textos">
                                            <span className="registro-legal__titulo">{titulo}</span>
                                            <span className="registro-legal__resumen">{resumen}</span>
                                        </div>
                                        <Boton variante="secundario" ancho="auto" onClick={() => setLegal({ documento, paraAceptar: true })}>
                                            <span>Leer</span>
                                        </Boton>
                                    </div>
                                    <CampoToggle
                                        id={`acepto-${documento}`} name={`acepto-${documento}`}
                                        label={documento === "terminos" ? "Acepto los términos y condiciones" : "Acepto la política de privacidad"}
                                        checked={aceptados[documento]}
                                        onChange={e => cambiarAceptado(documento, e.target.checked)}
                                        error={documento === "terminos"
                                            ? errores.termsAccepted || erroresApi.termsAccepted
                                            : errores.privacidadAceptada}
                                    />
                                </div>
                            ))}
                            <CampoToggle
                                id="aceptarNotificacion" name="aceptarNotificacion"
                                label="Acepto recibir notificaciones del club"
                                descripcion="Te avisamos por mail sobre tus reservas. Desde tu perfil podés verificar tu celular y pasarte a WhatsApp."
                                checked={datos.aceptarNotificacion}
                                onChange={cambiarNotificacion}
                                error={errores.aceptarNotificacion || erroresApi.aceptarNotificacion}
                            />
                        </div>
                    )}

                    {/* Navegación */}
                    <div className={`navegacion-pasos${paso > 1 ? " navegacion-pasos--doble" : ""}`}>
                        {paso > 1 && (
                            <Boton variante="fantasma" ancho="auto" onClick={() => irAPaso(paso - 1)} type="button">
                                <ArrowLeft size={17} />
                                <span>Volver</span>
                            </Boton>
                        )}
                        {paso < 3 && (
                            <Boton variante="primario" ancho={paso === 1 ? "completo" : "auto"} onClick={siguientePaso} type="button">
                                <span>Continuar</span>
                                <ArrowRight size={17} />
                            </Boton>
                        )}
                        {paso === 3 && (
                            <Boton type="submit" variante="primario" cargando={cargando} ancho="auto">
                                <span>Crear cuenta</span>
                                <Check size={17} />
                            </Boton>
                        )}
                    </div>

                </form>

                {paso === 1 && (
                    <>
                        <div className="separador"><span>o continuá con</span></div>
                        <BotonGoogle
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            texto="signup_with"
                        />
                        <p className="pie pie--legales">
                            Al registrarte con Google aceptás los{" "}
                            <button type="button" className="enlace-legal" onClick={() => setLegal({ documento: "terminos", paraAceptar: false })}>Términos</button> y la{" "}
                            <button type="button" className="enlace-legal" onClick={() => setLegal({ documento: "privacidad", paraAceptar: false })}>Política de privacidad</button>.
                        </p>
                    </>
                )}

                <p className="pie">
                    ¿Ya tenés cuenta?&nbsp;<Link to="/login">Ingresá acá</Link>
                </p>

            </div>
            {legal && (
                <ModalLegal
                    documento={legal.documento}
                    onCerrar={() => setLegal(null)}
                    onAceptar={legal.paraAceptar ? () => cambiarAceptado(legal.documento, true) : undefined}
                />
            )}
        </AuthPanelLayout>
    );
}