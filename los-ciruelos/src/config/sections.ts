import type { ComponentType } from "react";
import {
    Home,
    Users,
    CalendarDays,
    MapPin,
    Newspaper,
    ListChecks,
    LayoutDashboard,
    MessageSquareQuote,
} from "lucide-react";
import { GiTennisBall } from "react-icons/gi";
import type { Rol } from "../types/auth.types";

export interface ItemNavbar {
    id: string;
    label: string;
    icon: ComponentType<{ size?: number }>;
    to: string;
}

const SECCIONES_HOME: ItemNavbar[] = [
    { id: "inicio", label: "Inicio", icon: Home, to: "/#inicio" },
    { id: "club", label: "Sobre Nosotros", icon: Users, to: "/#historia" },
    { id: "canchas", label: "Canchas", icon: GiTennisBall, to: "/#canchas" },
    { id: "testimonios", label: "Testimonios", icon: MessageSquareQuote, to: "/#testimonios" },
    { id: "noticias", label: "Noticias", icon: Newspaper, to: "/#noticias" },
    { id: "contacto", label: "Contacto", icon: MapPin, to: "/#contacto" },
];

// El personal del club trabaja en su panel (/admin), con su propio menú lateral
const PANEL: ItemNavbar = { id: "panel", label: "Panel", icon: LayoutDashboard, to: "/admin" };
// La disponibilidad es pública: el visitante también la ve (para reservar le pide cuenta)
const RESERVAR: ItemNavbar = { id: "reservas", label: "Reservar", icon: CalendarDays, to: "/reservas" };

/*
 * Los paneles de PROFESOR (clases, alumnos, agenda) y el resto del de EMPLEADO y ADMIN
 * (usuarios, canchas) todavía no existen en el frontend: hasta implementarlos
 * esos roles ven las secciones públicas, en vez de links que no llevan a ningún lado.
 * Los avisos y el recordatorio del ADMIN están en su perfil.
 */
export const NAVBAR_BY_ROLE: Record<Rol | "INVITADO", ItemNavbar[]> = {
    INVITADO: [...SECCIONES_HOME, RESERVAR],
    CLIENTE: [
        ...SECCIONES_HOME,
        RESERVAR,
        { id: "mis-reservas", label: "Mis reservas", icon: ListChecks, to: "/mis-reservas" },
    ],
    PROFESOR: SECCIONES_HOME,
    EMPLEADO: [...SECCIONES_HOME, PANEL],
    ADMIN: [...SECCIONES_HOME, PANEL],
};

export const SECTIONS_FOOTER = [
    { id: "club", label: "Sobre Nosotros", to: "/#historia" },
    { id: "canchas", label: "Canchas", to: "/#canchas" },
    { id: "noticias", label: "Noticias", to: "/#noticias" },
];
