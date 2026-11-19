import { Search } from "lucide-react";
import CampoInput from "../CampoInput/CampoInput";
import type { Busqueda } from "../../../hooks/useBusqueda";
import "./CampoBusqueda.css";

/**
 * Campo de búsqueda contra el backend (con `useBusqueda`): busca al dejar de escribir o con Enter, y
 * avisa si faltan letras. Es un formulario para que Enter busque en el momento.
 */
export default function CampoBusqueda({ id, label, placeholder, busqueda }: {
    id: string;
    label: string;
    placeholder?: string;
    busqueda: Busqueda;
}) {
    return (
        <form className="campo-busqueda" role="search" onSubmit={e => { e.preventDefault(); busqueda.buscarYa(); }}>
            <CampoInput id={id} name={id} label={label} value={busqueda.texto} placeholder={placeholder}
                onChange={e => busqueda.setTexto(e.target.value)} icono={<Search size={16} />} />
            {busqueda.corto && <p className="campo-busqueda__ayuda">Escribí al menos {busqueda.minimo} letras para buscar.</p>}
        </form>
    );
}
