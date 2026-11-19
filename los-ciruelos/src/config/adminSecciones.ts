import type { ComponentType } from "react";
import {
    CalendarDays, LayoutDashboard, LayoutGrid, Megaphone, Newspaper, Package, Settings, ShoppingBag, UserRound, Users, Wallet,
} from "lucide-react";
import type { Rol } from "../types/auth.types";

export interface SubseccionAdmin {
    /** Ruta, con su query si hace falta (por ejemplo, "?fijo=1") */
    to: string;
    label: string;
    icon: ComponentType<{ size?: number }>;
    roles: Rol[];
}

export interface SeccionAdmin {
    to: string;
    label: string;
    icon: ComponentType<{ size?: number }>;
    /** Roles que la ven (el backend vuelve a validar cada endpoint) */
    roles: Rol[];
    /** Grupo del sidebar */
    grupo: "Club" | "Gestión" | "Cuenta";
    /** Desplegable en el sidebar. Si para el rol queda uno solo, la sección es un link directo a él. */
    hijos?: SubseccionAdmin[];
}

const PERSONAL: Rol[] = ["ADMIN", "EMPLEADO"];

/** Secciones del panel del personal, en el orden del sidebar */
export const SECCIONES_ADMIN: SeccionAdmin[] = [
    // El ADMIN ve el Resumen del club; el EMPLEADO, en la misma ruta, la caja de su jornada
    { to: "/admin", label: "Resumen", icon: LayoutDashboard, roles: ["ADMIN"], grupo: "Club" },
    { to: "/admin", label: "Caja", icon: Wallet, roles: ["EMPLEADO"], grupo: "Club" },
    // Reservas, partidos y turnos fijos (filtros), en grilla o lista: crear (popup con pasos), consultar,
    // cobrar lo que deben, editar y cancelar
    { to: "/admin/reservas", label: "Reservas", icon: CalendarDays, roles: PERSONAL, grupo: "Club" },
    // Lo que se vende sin reserva (las paletas se devuelven desde el detalle de la reserva)
    { to: "/admin/ventas", label: "Ventas", icon: ShoppingBag, roles: PERSONAL, grupo: "Club" },
    // El EMPLEADO los ve pero no crea, edita ni desactiva (solo ADMIN)
    { to: "/admin/usuarios", label: "Usuarios", icon: Users, roles: PERSONAL, grupo: "Gestión" },
    { to: "/admin/productos", label: "Productos y stock", icon: Package, roles: PERSONAL, grupo: "Gestión" },
    // Lo que se ve en el sitio: las canchas (con fotos) y las novedades de la página de inicio
    { to: "/admin/canchas", label: "Canchas", icon: LayoutGrid, roles: ["ADMIN"], grupo: "Gestión" },
    { to: "/admin/novedades", label: "Novedades", icon: Newspaper, roles: ["ADMIN"], grupo: "Gestión" },
    // Anticipación para reservar y recordatorio del turno
    { to: "/admin/configuracion", label: "Configuración", icon: Settings, roles: ["ADMIN"], grupo: "Gestión" },
    // ADMIN y EMPLEADO: el celular y el medio de los avisos; el ADMIN además sus avisos
    { to: "/admin/avisos", label: "Avisos", icon: Megaphone, roles: PERSONAL, grupo: "Cuenta" },
    { to: "/admin/cuenta", label: "Mi cuenta", icon: UserRound, roles: PERSONAL, grupo: "Cuenta" },
];

/**
 * Cobro con el QR impreso de la caja (reservas y ventas). Ya está configurado en el backend; si se
 * desconfigura responde 503 y el cobro avisa. En false, la opción se muestra apagada y en las ventas
 * no se ofrece Mercado Pago (solo se cobra con el QR).
 */
export const COBRO_QR_HABILITADO = true;

/** Por debajo de esto el stock de un producto activo se marca como bajo */
export const STOCK_BAJO = 10;

/** Las secciones (y sus hijos) que ve el rol. Un desplegable con un solo hijo pasa a ser un link a él. */
export const seccionesPara = (rol: Rol | undefined): SeccionAdmin[] => SECCIONES_ADMIN
    .filter(s => rol && s.roles.includes(rol))
    .map(s => {
        if (!s.hijos) return s;
        const hijos = s.hijos.filter(h => rol && h.roles.includes(rol));
        return hijos.length <= 1 ? { ...s, to: hijos[0]?.to ?? s.to, hijos: undefined } : { ...s, hijos };
    });
