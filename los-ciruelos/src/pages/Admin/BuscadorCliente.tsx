import { useEffect, useState } from "react";
import { UserPlus, UserRound, X } from "lucide-react";
import CampoBusqueda from "../../components/ui/CampoBusqueda/CampoBusqueda";
import { MINIMO_BUSQUEDA, useBusqueda } from "../../hooks/useBusqueda";
import { adminService } from "../../services/adminService";
import type { ClienteBusqueda } from "../../types/admin.types";
import { CATEGORIAS, etiquetaDe } from "../../config/opcionesJugador";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatTelefono } from "../../utils/telefono";
import { Mensaje } from "./comunes";
import "./NuevaReserva.css";

/**
 * Buscar un cliente activo por nombre, apellido, email o "nombre apellido"
 * (GET /admin/usuarios/clientes, ADMIN y EMPLEADO). Con onCrear se ofrece darlo de alta si no está.
 */
export default function BuscadorCliente({
    cliente, onElegir, id = "buscar-cliente", label = "Cliente", onCrear, avisarPerfilIncompleto = true,
}: {
    cliente: ClienteBusqueda | null;
    onElegir: (c: ClienteBusqueda | null) => void;
    id?: string;
    label?: string;
    /** Alta del cliente en el momento (por ejemplo, el responsable de un partido sin cuenta) */
    onCrear?: (texto: string) => void;
    /** Marcar a los que no tienen el perfil completo (no se les puede reservar) */
    avisarPerfilIncompleto?: boolean;
}) {
    // Busca con 3 letras o más, al dejar de escribir, con Enter o con la lupa
    const campo = useBusqueda();
    const busqueda = campo.termino;
    const [resultados, setResultados] = useState<ClienteBusqueda[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (busqueda.length < MINIMO_BUSQUEDA) return;
        let activo = true;
        adminService.clientes(busqueda)
            .then(r => { if (activo) { setResultados(r.slice(0, 8)); setError(null); } })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudo buscar.")) ?? null); });
        return () => { activo = false; };
    }, [busqueda]);

    if (cliente) {
        return (
            <div className="nr-cliente">
                <UserRound size={18} />
                <div className="nr-cliente__datos">
                    <span className="nr-cliente__nombre">{cliente.nombre} {cliente.apellido}</span>
                    <span className="nr-cliente__detalle">
                        {cliente.email}{cliente.telefono && ` · ${formatTelefono(cliente.telefono)}`}
                        {cliente.categoria && ` · ${etiquetaDe(CATEGORIAS, cliente.categoria)}`}
                    </span>
                </div>
                <button type="button" className="accion accion--chica" onClick={() => onElegir(null)}>
                    <X size={14} />
                    Cambiar
                </button>
            </div>
        );
    }

    const mostrarResultados = busqueda.length >= MINIMO_BUSQUEDA && busqueda === campo.texto.trim();
    return (
        <div className="nr-buscador">
            <CampoBusqueda id={id} label={label} placeholder="Nombre, apellido o email" busqueda={campo} />
            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {mostrarResultados && (
                resultados.length === 0 ? (
                    <p className="nr-ayuda">No hay clientes activos con "{busqueda}".</p>
                ) : (
                    <ul className="nr-resultados">
                        {resultados.map(c => (
                            <li key={c.id}>
                                <button type="button" className="nr-resultado" onClick={() => { onElegir(c); campo.limpiar(); }}>
                                    <span className="nr-cliente__nombre">{c.nombre} {c.apellido}</span>
                                    <span className="nr-cliente__detalle">{c.email}</span>
                                    {avisarPerfilIncompleto && !c.perfilCompleto && <span className="admin-chip admin-chip--alerta">Perfil incompleto</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )
            )}
            {onCrear && mostrarResultados && (
                <button type="button" className="accion accion--chica nr-crear" onClick={() => onCrear(campo.texto.trim())}>
                    <UserPlus size={14} />
                    No está: darlo de alta
                </button>
            )}
        </div>
    );
}
