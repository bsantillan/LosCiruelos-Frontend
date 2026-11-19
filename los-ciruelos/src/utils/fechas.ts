/** Fecha local en formato YYYY-MM-DD (no usar toISOString: devuelve UTC). */
export function fechaISO(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Zona horaria del club: las fechas y horas se muestran siempre en hora de Argentina */
export const ZONA_CLUB = "America/Argentina/Buenos_Aires";

/** Hoy en el club ("YYYY-MM-DD"), aunque el dispositivo esté en otra zona horaria */
export function hoyISO(): string {
    // en-CA formatea como YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_CLUB }).format(new Date());
}

export function sumarDias(iso: string, dias: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    return fechaISO(new Date(y, m - 1, d + dias));
}

export function formatFecha(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    // "sábado 17 de octubre" (Intl agrega una coma después del día de la semana)
    return new Date(y, m - 1, d)
        .toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
        .replace(",", "");
}

/** "HH:MM" o "HH:MM:SS" → minutos desde la medianoche */
export function timeToMin(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

/** minutos desde la medianoche → "HH:MM" */
export function minToTime(min: number): string {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}

/** "HH:MM:SS" → "HH:MM" */
export function horaCorta(time: string): string {
    return time.substring(0, 5);
}

export function formatMonto(monto: number): string {
    return monto.toLocaleString("es-AR", {
        style: "currency", currency: "ARS", maximumFractionDigits: 2,
    });
}

/**
 * Fecha y hora del backend ("2026-10-17T18:15:00.123-03:00", con offset desde el cambio de
 * formato; antes sin zona) ("2026-10-15T21:05:34.4050946", hora de Argentina, sin zona)
 * → Date local. Se recortan los decimales a milisegundos: algunos navegadores (Safari)
 * no aceptan más de 3.
 */
export function parseFechaHora(valor: string): Date {
    return new Date(valor.replace(/(\.\d{3})\d+/, "$1"));
}

/** 90 → "1 h 30 min", 60 → "1 h", 30 → "30 min" */
export function formatDuracion(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** LocalDateTime del backend → "jueves 16 de octubre, 16:00" */
export function formatFechaHora(valor: string): string {
    const d = parseFechaHora(valor);
    const fecha = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA_CLUB }).replace(",", "");
    const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA_CLUB });
    return `${fecha} a las ${hora} hs`;
}

/** Fecha y hora del backend → "16:05" (hora del club) */
export function formatHora(valor: string): string {
    return parseFechaHora(valor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA_CLUB });
}
