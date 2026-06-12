import {
    Home,
    Users,
    CalendarDays,
    Trophy,
    Settings,
    BookOpen,
    ClipboardList,
    MapPin
} from "lucide-react";

export const NAVBAR_BY_ROLE = {
    INVITADO: [
        { id: "inicio", label: "Inicio", icon: Home, to: "/#inicio" },
        { id: "club", label: "Club", icon: Users, to: "/#historia" },
        { id: "canchas", label: "Canchas", icon: Trophy, to: "/#canchas" },
        { id: "contacto", label: "Contacto", icon: MapPin, to: "/#contacto" },
    ],

    CLIENTE: [
        { id: "inicio", label: "Inicio", icon: Home, to: "/#inicio" },
        { id: "club", label: "Club", icon: Users, to: "/#historia" },
        { id: "canchas", label: "Canchas", icon: Trophy, to: "/#canchas" },
        { id: "contacto", label: "Contacto", icon: MapPin, to: "/#contacto" },
        { id: "reservas", label: "Reservar", icon: CalendarDays, to: "/reservas" },
        { id: "torneos", label: "Torneos", icon: Trophy, to: "/#torneos" },
    ],

    PROFESOR: [
        { id: "inicio", label: "Inicio", icon: Home, to: "/#inicio" },
        { id: "club", label: "Club", icon: Users, to: "/#historia" },
        { id: "canchas", label: "Canchas", icon: Trophy, to: "/#canchas" },
        { id: "contacto", label: "Contacto", icon: MapPin, to: "/#contacto" },
        { id: "clases", label: "Clases", icon: BookOpen, to: "/clases" },
        { id: "alumnos", label: "Alumnos", icon: Users, to: "/alumnos" },
        { id: "agenda", label: "Agenda", icon: CalendarDays, to: "/agenda" },
    ],

    ADMIN: [
        { id: "dashboard", label: "Panel", icon: Settings, to: "/admin" },
        { id: "usuarios", label: "Usuarios", icon: Users, to: "/admin/usuarios" },
        { id: "canchas", label: "Canchas", icon: Trophy, to: "/admin/canchas" },
        { id: "torneos", label: "Torneos", icon: ClipboardList, to: "/admin/torneos" },
    ],
};