import { useState } from "react";
import { UserPlus } from "lucide-react";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import { adminService } from "../../services/adminService";
import type { ClienteBusqueda } from "../../types/admin.types";
import { extraerErrores, type ErroresApi } from "../../utils/apiErrors";
import { telefonoValido } from "../../utils/telefono";

/**
 * Alta rápida de un cliente con lo mínimo (solo ADMIN: POST /admin/usuarios). `texto` es lo que se
 * buscó: si parece un email va al email; si no, a nombre y apellido.
 */
export default function ModalAltaCliente({ texto, onCerrar, onCreado }: {
    texto: string;
    onCerrar: () => void;
    onCreado: (c: ClienteBusqueda) => void;
}) {
    const esEmail = texto.includes("@");
    const [primero, ...resto] = esEmail ? [""] : texto.split(" ");
    const [datos, setDatos] = useState({ nombre: primero, apellido: resto.join(" "), email: esEmail ? texto : "", telefono: "" });
    const [errores, setErrores] = useState<ErroresApi>({});
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setDatos(d => ({ ...d, [campo]: e.target.value }));
        setErrores(er => ({ ...er, [campo]: undefined, general: undefined }));
    };

    const crear = async () => {
        const e: ErroresApi = {};
        if (datos.nombre.trim().length < 2) e.nombre = "Mínimo 2 caracteres.";
        if (datos.apellido.trim().length < 2) e.apellido = "Mínimo 2 caracteres.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) e.email = "Ingresá un email válido.";
        if (!telefonoValido(datos.telefono)) e.telefono = "Ingresá un celular válido. Ej: 11 1234-5678";
        setErrores(e);
        if (Object.keys(e).length) return;
        setGuardando(true);
        try {
            const u = await adminService.crearUsuario({
                email: datos.email.trim(), nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
                telefono: datos.telefono, rol: "CLIENTE",
            });
            onCreado({
                id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email, telefono: u.telefono,
                telefonoVerificado: u.telefonoVerificado, categoria: u.categoria, posicion: u.posicion,
                perfilCompleto: false, enabled: u.enabled,
            });
        } catch (err) {
            setErrores(extraerErrores(err, "No se pudo dar de alta al cliente."));
            setGuardando(false);
        }
    };

    const visibles = ["nombre", "apellido", "email", "telefono"];
    const errorGeneral = errores.general ?? Object.entries(errores).find(([k, v]) => v && !visibles.includes(k))?.[1];

    return (
        <ModalConfirmacion
            titulo="Dar de alta un cliente"
            icono={<UserPlus size={22} />}
            textoConfirmar="Crear cliente"
            cargando={guardando}
            error={errorGeneral ?? null}
            onCerrar={onCerrar}
            onConfirmar={() => void crear()}
        >
            <div className="admin-form">
                <p className="modal__descripcion">
                    Le llega un mail con una contraseña temporal. La categoría y la posición las completa él.
                </p>
                <div className="admin-form__fila">
                    <CampoInput id="ac-nombre" name="nombre" label="Nombre" value={datos.nombre} onChange={cambiar("nombre")} error={errores.nombre} />
                    <CampoInput id="ac-apellido" name="apellido" label="Apellido" value={datos.apellido} onChange={cambiar("apellido")} error={errores.apellido} />
                </div>
                <CampoInput id="ac-email" name="email" label="Email" type="email" value={datos.email} onChange={cambiar("email")} error={errores.email} />
                <CampoInput id="ac-telefono" name="telefono" label="Celular" type="tel" value={datos.telefono} onChange={cambiar("telefono")}
                    placeholder="11 1234-5678" error={errores.telefono} />
            </div>
        </ModalConfirmacion>
    );
}
