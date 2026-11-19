import { fechaISO } from "./fechas";

/* Helpers de los calendarios propios (SelectorFecha y SelectorPeriodo). */

export const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
export const NOMBRES_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** "YYYY-MM-DD" → Date local */
export function aFecha(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** Días a mostrar en la grilla del mes (semanas de lunes a domingo; null = celda vacía) */
export function diasDelMes(anio: number, mes: number): (string | null)[] {
    const primero = new Date(anio, mes, 1);
    const offset = (primero.getDay() + 6) % 7; // lunes = 0
    const cantidad = new Date(anio, mes + 1, 0).getDate();
    const celdas: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= cantidad; d++) celdas.push(fechaISO(new Date(anio, mes, d)));
    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
}

/** "octubre de 2026" */
export function nombreMes(anio: number, mes: number): string {
    return new Date(anio, mes, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

/** "oct" */
export function nombreMesCorto(mes: number): string {
    return new Date(2000, mes, 1).toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
}

/** Primer y último día del mes, "YYYY-MM-DD" */
export function limitesDelMes(anio: number, mes: number): { desde: string; hasta: string } {
    return { desde: fechaISO(new Date(anio, mes, 1)), hasta: fechaISO(new Date(anio, mes + 1, 0)) };
}
