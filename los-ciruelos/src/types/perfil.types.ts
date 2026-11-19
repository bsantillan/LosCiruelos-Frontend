export type CanalNotificacion = "EMAIL" | "WHATSAPP";

export interface PerfilResponse {
    nombre: string;
    apellido: string;
    email: string;
    /** Normalizado al formato de WhatsApp ("5491112345678"); null si no lo cargó */
    telefono: string | null;
    telefonoVerificado: boolean;
    canalNotificaciones: CanalNotificacion;
    /** CLIENTE: nombre, apellido, celular verificado, categoría y posición. ADMIN: sin categoría ni posición. */
    perfilCompleto: boolean;
    categoria: string | null;
    posicion: string | null;
    cantDiasMiembro: number;
    cantPartidos: number;
    /** null si nunca jugó */
    diasDesdeUltimoPartido: number | null;
    cantPartidosEsteMes: number;
    categoriaActualizadaAt: string | null;
    /** La categoría se puede cambiar una sola vez y dentro de las 24 h desde que se cargó */
    categoriaEditable: boolean | null;
}

export interface PerfilRequest {
    nombre: string;
    apellido: string;
    /** Opcional: si no se manda no se toca. El celular se edita con PUT /perfil/notificaciones. */
    telefono?: string;
    posicion: string | null;
    categoria: string | null;
}

export interface ErroresPerfil {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    posicion?: string;
    categoria?: string;
    general?: string;
}

// ── Notificaciones (/perfil/notificaciones, /perfil/telefono/*) ──
export interface NotificacionesResponse {
    /** El medio que eligió */
    canal: CanalNotificacion;
    /** El que se usa de verdad: EMAIL hasta que verifique el celular */
    canalEnUso: CanalNotificacion;
    telefono: string | null;
    telefonoVerificado: boolean;
    /** Si el club tiene WhatsApp configurado */
    whatsappDisponible: boolean;
}

export interface NotificacionesRequest {
    canal: CanalNotificacion;
    telefono?: string;
}

// ── Avisos que elige el CLIENTE (/perfil/suscripciones) ──
export interface SuscripcionesResponse {
    /** Siempre true: las cancelaciones se avisan siempre */
    cancelaciones: boolean;
    recordatorios: boolean;
    promociones: boolean;
    /** false mientras el perfil no esté completo */
    editable: boolean;
}

export interface SuscripcionesRequest {
    recordatorios: boolean;
    promociones: boolean;
}

// ── Avisos que recibe el ADMIN (/perfil/avisos) ──
export interface AvisosAdmin {
    /** Interruptor general: en false no llega ninguno, pero se conserva la elección de cada uno */
    activos: boolean;
    reservaConfirmada: boolean;
    saldoCobrado: boolean;
    reservaCancelada: boolean;
    reembolsoManual: boolean;
}

export interface PruebaAvisoResponse {
    enviado: boolean;
    canal: CanalNotificacion | null;
    destino: string | null;
}

// ── Recordatorio del turno (/admin/configuracion/avisos) ──
export interface ConfigAvisos {
    recordatorioActivo: boolean;
    /** Entre 15 y 1440 */
    minutosRecordatorio: number;
}
