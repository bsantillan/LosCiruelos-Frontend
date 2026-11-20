import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Megaphone, MessageCircle, Smartphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePerfil } from "../../hooks/usePerfil";
import CelularYNotificaciones from "../../components/Notificaciones/CelularYNotificaciones";
import AvisosAdmin from "../../components/Notificaciones/AvisosAdmin";
import WhatsAppClub from "../../components/Notificaciones/WhatsAppClub";
import { Cargando, Encabezado, Mensaje } from "./comunes";
// Las tabs y las tarjetas usan los estilos del perfil
import "../Perfil/Perfil.css";

type TabAvisos = "celular" | "recibis" | "whatsapp";

/**
 * Avisos del personal, en tabs (la elegida queda en la URL: ?tab=recibis):
 *  - Celular: el celular (único lugar del panel donde se carga, cambia y verifica) y el medio
 *    por el que le llegan los avisos. ADMIN y EMPLEADO.
 *  - Avisos que recibís: qué avisos de reservas le llegan. Solo ADMIN.
 *  - WhatsApp: si el club manda WhatsApp a los clientes y cuántos WhatsApp se mandaron. Solo ADMIN.
 * El recordatorio que reciben los clientes es configuración del club: está en Configuración.
 */
export default function Avisos() {
    const { usuario, actualizarUsuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const { perfil, cargando, erroresApi, recargar } = usePerfil();

    // Verificar el celular puede completar el perfil del ADMIN: la sesión se mantiene al día
    const perfilCompleto = perfil?.perfilCompleto;
    useEffect(() => {
        if (perfilCompleto !== undefined) actualizarUsuario({ perfilCompleto });
    }, [perfilCompleto, actualizarUsuario]);

    const tabs: { id: TabAvisos; etiqueta: string; icono: ReactNode }[] = [
        { id: "celular", etiqueta: "Celular", icono: <Smartphone size={15} /> },
        ...(esAdmin ? [
            { id: "recibis" as const, etiqueta: "Avisos que recibís", icono: <Megaphone size={15} /> },
            { id: "whatsapp" as const, etiqueta: "WhatsApp", icono: <MessageCircle size={15} /> },
        ] : []),
    ];
    const [searchParams, setSearchParams] = useSearchParams();
    const tab: TabAvisos = tabs.find(t => t.id === searchParams.get("tab"))?.id ?? "celular";
    const elegirTab = (id: TabAvisos) => setSearchParams({ tab: id }, { replace: true });

    return (
        <div className="admin-pagina">
            <Encabezado
                titulo="Avisos"
                descripcion={esAdmin
                    ? "Tu celular, por dónde te avisamos, qué avisos de reservas recibís y el WhatsApp del club."
                    : "Tu celular y por dónde te avisamos."}
            />

            {tabs.length > 1 && (
                <div className="perfil-tabs" role="tablist" aria-label="Secciones de avisos">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            id={`tab-${t.id}`}
                            aria-selected={tab === t.id}
                            aria-controls={`panel-${t.id}`}
                            className={`perfil-tab${tab === t.id ? " perfil-tab--activa" : ""}`}
                            onClick={() => elegirTab(t.id)}
                        >
                            {t.icono}
                            {t.etiqueta}
                        </button>
                    ))}
                </div>
            )}

            {erroresApi.general && <Mensaje tipo="error">{erroresApi.general}</Mensaje>}

            <div className="avisos-panel" {...(tabs.length > 1 ? { role: "tabpanel", id: `panel-${tab}`, "aria-labelledby": `tab-${tab}` } : {})}>
                {/* El celular queda montado al cambiar de tab: no se pierde el código que se pidió */}
                <div hidden={tab !== "celular"}>
                    {cargando ? <Cargando /> : perfil && (
                        <CelularYNotificaciones perfil={perfil} esCliente={false} onPerfilCambio={() => void recargar()} />
                    )}
                </div>
                {tab === "recibis" && esAdmin && <AvisosAdmin />}
                {tab === "whatsapp" && esAdmin && <WhatsAppClub />}
            </div>
        </div>
    );
}
