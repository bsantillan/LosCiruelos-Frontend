import { useState } from "react";
import { User, Mail, Lock, Phone, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import Boton from "../../components/ui/Boton/Boton";
import "./Register.css";
import { ErroresRegister, useRegister } from "../../hooks/useRegister";
import { RegisterRequest } from "../../types/register.types";
import { useNavigate } from "react-router-dom";

/* ─── OPCIONES ───────────────────────────────────── */
const CATEGORIAS = [
    { valor: "Principiante", etiqueta: "Principiante" },
    { valor: "Septima", etiqueta: "Séptima" },
    { valor: "Sexta", etiqueta: "Sexta" },
    { valor: "Quinta", etiqueta: "Quinta" },
    { valor: "Cuarta", etiqueta: "Cuarta" },
    { valor: "Tercera", etiqueta: "Tercera" },
    { valor: "Segunda", etiqueta: "Segunda" },
    { valor: "Primera", etiqueta: "Primera" },
];

const POSICIONES = [
    { valor: "Drive", etiqueta: "Drive" },
    { valor: "Reves", etiqueta: "Revés" },
    { valor: "Ambos", etiqueta: "Ambos" },
];

const PASOS = [
    { numero: 1, etiqueta: "Personal" },
    { numero: 2, etiqueta: "Club" },
    { numero: 3, etiqueta: "Términos y condiciones" },
];

/* ─── TÍTULOS POR PASO ───────────────────────────── */
const INFO_PASOS = [
    { subtitulo: "Empecemos", titulo: "TUS DATOS" },
    { subtitulo: "Tu nivel de juego", titulo: "EN CANCHA" },
    { subtitulo: "Casi listo", titulo: "LEÉ Y ACEPTÁ" },
];

/* ─── TÉRMINOS ───────────────────────────────────── */
function TerminosContenido() {
    return (
        <div className="terminos-contenido">
            <p>Al registrarte en <strong>Los Ciruelos Pádel</strong>, aceptás los siguientes términos:</p>
            <h4>1. Uso de la plataforma</h4>
            <p>Este sistema es exclusivo para socios del club. Tu cuenta es personal e intransferible.</p>
            <h4>2. Reservas</h4>
            <p>Las reservas están sujetas a disponibilidad. La cancelación debe realizarse con al menos 2 horas de anticipación.</p>
            <h4>3. Datos personales</h4>
            <p>Tus datos serán utilizados únicamente para la gestión del club y no serán compartidos con terceros sin tu consentimiento, conforme a la Ley 25.326 de Protección de Datos Personales.</p>
            <h4>4. Conducta</h4>
            <p>Los socios deben respetar las instalaciones y a los demás miembros. El incumplimiento puede resultar en la suspensión de la cuenta.</p>
            <h4>5. Modificaciones</h4>
            <p>El club se reserva el derecho de modificar estos términos con previo aviso.</p>
        </div>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Register() {
    const navigate = useNavigate();
    const [paso, setPaso] = useState(1);
    const [datos, setDatos] = useState<RegisterRequest>({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        telefono: "",
        categoria: "",
        posicion: "",
        termsAccepted: false,
    });
    const [confirmarPassword, setConfirmarPassword] = useState("");
    const [errores, setErrores] = useState<ErroresRegister>({});
    const { register, cargando, erroresApi } = useRegister();

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setDatos(prev => ({
            ...prev,
            [name]: value,
        }));

        name === "confirmarPassword" ? setConfirmarPassword(value) : null;

        setErrores({});
    };

    const cambiarSelect = (name: keyof RegisterRequest) => (e: { target: { value: string | number } }) => {

        setDatos(prev => ({
            ...prev,
            [name]: e.target.value,
        }));

        setErrores({});
    };

    /* ── Validaciones ── */
    const validarPaso1 = (): boolean => {
        const nuevosErrores: ErroresRegister = {};

        if (!datos.nombre)
            nuevosErrores.nombre = "El nombre es obligatorio.";
        else if (datos.nombre.length < 2)
            nuevosErrores.nombre = "Mínimo 2 caracteres.";
        else if (datos.nombre.length > 50)
            nuevosErrores.nombre = "Máximo 50 caracteres.";

        if (!datos.apellido)
            nuevosErrores.apellido = "El apellido es obligatorio.";
        else if (datos.apellido.length < 2)
            nuevosErrores.apellido = "Mínimo 2 caracteres.";
        else if (datos.apellido.length > 50)
            nuevosErrores.apellido = "Máximo 50 caracteres.";

        if (!datos.email)
            nuevosErrores.email = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email))
            nuevosErrores.email = "El correo no es válido.";

        if (!datos.telefono)
            nuevosErrores.telefono = "El teléfono es obligatorio.";
        else if (!/^\+?[0-9]{8,15}$/.test(datos.telefono))
            nuevosErrores.telefono = "Formato inválido. Ej: +5491123456789";

        if (!datos.password) {
            nuevosErrores.password = "La contraseña es obligatoria.";
        } else if (
            datos.password.length < 8 ||
            datos.password.length > 30 ||
            !/[A-Z]/.test(datos.password) ||
            !/[a-z]/.test(datos.password) ||
            !/[0-9]/.test(datos.password) ||
            !/[^A-Za-z0-9]/.test(datos.password)
        ) {
            nuevosErrores.password = "Debe tener entre 8 y 30 caracteres, una mayúscula, una minúscula, un número y un símbolo.";
        }

        if (!confirmarPassword)
            nuevosErrores.confirmarPassword = "Confirmá tu contraseña.";
        else if (datos.password !== confirmarPassword)
            nuevosErrores.confirmarPassword = "Las contraseñas no coinciden.";

        setErrores(nuevosErrores);

        return Object.keys(nuevosErrores).length === 0;
    };

    const validarPaso2 = (): boolean => {
        const nuevosErrores: ErroresRegister = {};

        if (!datos.categoria)
            nuevosErrores.categoria = "La categoría es obligatoria.";

        if (!datos.posicion)
            nuevosErrores.posicion = "La posición es obligatoria.";

        setErrores(nuevosErrores);

        return Object.keys(nuevosErrores).length === 0;
    };

    const validarPaso3 = (): boolean => {
        const nuevosErrores: ErroresRegister = {};

        if (!datos.termsAccepted)
            nuevosErrores.termsAccepted =
                "Debés aceptar los términos para continuar.";

        setErrores(nuevosErrores);

        return Object.keys(nuevosErrores).length === 0;
    };

    const siguientePaso = () => {
        const esValido =
            paso === 1
                ? validarPaso1()
                : paso === 2
                    ? validarPaso2()
                    : true;

        if (!esValido) return;

        setPaso(prev => prev + 1);
    };

    const irAPaso = (numero: number) => {
        if (numero < paso) {
            setErrores({});
            setPaso(numero);
        }
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validarPaso3()) return;

        const ok = await register(datos);

        if (ok) {
            navigate("/login");
        }
    };

    const porcentajeProgreso = ((paso - 1) / (PASOS.length - 1)) * 100;

    return (
        <main className="pagina-register">

            {/* Fondo */}
            <div
                className="register-fondo"
                style={{ backgroundImage: `url(${padelBg})` }}
                aria-hidden="true"
            />
            <div className="register-fondo__overlay" aria-hidden="true" />

            {/* Logo flotante — igual que en Login */}
            <div className="panel-visual__logo" style={{ position: "fixed", zIndex: 10 }}>
                <div className="logo">
                    <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo__imagen" />
                    <span className="logo-texto">LOS CIRUELOS</span>
                </div>
            </div>

            {/* Card */}
            <div className="register-card">

                {/* Header */}
                <div className="register-card__header">

                    {/* Tabs */}
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
                                    {p.etiqueta}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Barra de progreso */}
                <div className="register-progreso">
                    <div
                        className="register-progreso__barra"
                        style={{ width: `${porcentajeProgreso === 0 ? 8 : porcentajeProgreso}%` }}
                    />
                </div>

                {/* Cuerpo */}
                <div className="register-card__cuerpo">
                    <div key={paso}>
                        <p className="register-card__subtitulo animar-subir">
                            {INFO_PASOS[paso - 1].subtitulo}
                        </p>
                        <h2 className="register-card__titulo animar-subir demora-1">
                            {INFO_PASOS[paso - 1].titulo}
                        </h2>
                    </div>

                    <form onSubmit={enviar} noValidate>

                        {/* Paso 1 */}
                        {paso === 1 && (
                            <div className="campos animar-subir demora-1">
                                <div className="campos-fila">
                                    <CampoInput
                                        id="nombre" name="nombre" label="Nombre"
                                        value={datos.nombre} onChange={cambiarInput}
                                        placeholder="Juan" icono={<User size={16} />}
                                        required error={errores.nombre}
                                    />
                                    <CampoInput
                                        id="apellido" name="apellido" label="Apellido"
                                        value={datos.apellido} onChange={cambiarInput}
                                        placeholder="Pérez" icono={<User size={16} />}
                                        required error={errores.apellido}
                                    />
                                </div>
                                <CampoInput
                                    id="email" name="email" label="Correo electrónico"
                                    type="email" value={datos.email} onChange={cambiarInput}
                                    placeholder="vos@email.com" icono={<Mail size={16} />}
                                    autoComplete="email" required error={errores.email}
                                />
                                <CampoInput
                                    id="telefono" name="telefono" label="Teléfono"
                                    type="tel" value={datos.telefono} onChange={cambiarInput}
                                    placeholder="+5491123456789" icono={<Phone size={16} />}
                                    required error={errores.telefono}
                                />
                                <CampoInput
                                    id="password" name="password" label="Contraseña"
                                    type="password" value={datos.password} onChange={cambiarInput}
                                    placeholder="Mínimo 8 caracteres" icono={<Lock size={16} />}
                                    autoComplete="new-password" required error={errores.password}
                                />
                                <CampoInput
                                    id="confirmarPassword" name="confirmarPassword"
                                    label="Confirmá tu contraseña"
                                    type="password" value={confirmarPassword}
                                    onChange={cambiarInput}
                                    placeholder="Repetí tu contraseña" icono={<Lock size={16} />}
                                    autoComplete="new-password" required
                                    error={errores.confirmarPassword}
                                />
                            </div>
                        )}

                        {/* Paso 2 */}
                        {paso === 2 && (
                            <div className="campos animar-subir demora-1">
                                <CampoSelect
                                    id="categoria" name="categoria" label="Categoría"
                                    value={datos.categoria}
                                    onChange={cambiarSelect("categoria")}
                                    placeholder="Seleccioná tu categoría"
                                    opciones={CATEGORIAS}
                                    required error={errores.categoria}
                                />
                                <CampoSelect
                                    id="posicion" name="posicion" label="Posición en cancha"
                                    value={datos.posicion}
                                    onChange={cambiarSelect("posicion")}
                                    placeholder="Seleccioná tu posición"
                                    opciones={POSICIONES}
                                    required error={errores.posicion}
                                />
                                <div className="info-nivel">
                                    <p className="info-nivel__texto">
                                        ¿No sabés tu categoría? Podés registrarte como <strong>Principiante</strong>. Un administrador del club puede actualizarla cuando sea necesario.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Paso 3 */}
                        {paso === 3 && (
                            <div className="campos animar-subir demora-1">
                                <div className="terminos-box">
                                    <TerminosContenido />
                                </div>
                                <CampoToggle
                                    id="terminos" name="terminos"
                                    label="Acepto los términos y condiciones"
                                    descripcion="Leí y acepto los términos de uso del club."
                                    checked={datos.termsAccepted}
                                    onChange={e => {
                                        setDatos(p => ({ ...p, termsAccepted: e.target.checked }));
                                        if (errores.termsAccepted)
                                            setErrores(p => ({ ...p, termsAccepted: undefined }));
                                    }}
                                    error={errores.termsAccepted}
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
                </div>

                {/* Footer */}
                <div className="register-card__footer">
                    {paso === 1 && (
                        <>
                            <div className="separador"><span>o continuá con</span></div>
                            <Boton variante="secundario" onClick={() => { }}>
                                <FcGoogle size={18} />
                                Registrate con Google
                            </Boton>
                        </>
                    )}
                    <p className="pie">
                        ¿Ya tenés cuenta?&nbsp;<a href="/login">Ingresá acá</a>
                    </p>
                </div>

            </div>
        </main>
    );
}