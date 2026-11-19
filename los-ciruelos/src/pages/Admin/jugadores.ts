import type { ClienteBusqueda, JugadorRequest } from "../../types/admin.types";
import { telefonoValido } from "../../utils/telefono";

/** Un lugar del partido: un cliente registrado o un invitado sin cuenta */
export type Jugador =
    | { tipo: "cliente"; cliente: ClienteBusqueda | null }
    | { tipo: "invitado"; nombre: string; telefono: string };

export const JUGADORES_VACIOS: Jugador[] = [1, 2, 3, 4].map(() => ({ tipo: "cliente", cliente: null }));

/** Un cliente conocido solo por id y nombre (al editar un partido o turno fijo) */
export function clienteConocido(usuarioId: number, nombre: string, telefono: string | null): ClienteBusqueda {
    const [primero, ...resto] = nombre.split(" ");
    return {
        id: usuarioId, nombre: primero, apellido: resto.join(" "), email: "", telefono,
        telefonoVerificado: false, categoria: null, posicion: null, perfilCompleto: true, enabled: true,
    };
}

/** Los jugadores de una respuesta del backend, en orden */
export function jugadoresDe(lista: { posicion: number; usuarioId: number | null; nombre: string; telefono: string | null }[]): Jugador[] {
    const ordenados = [...lista].sort((a, b) => a.posicion - b.posicion);
    return [0, 1, 2, 3].map(i => {
        const j = ordenados[i];
        if (!j) return { tipo: "cliente", cliente: null };
        return j.usuarioId !== null
            ? { tipo: "cliente", cliente: clienteConocido(j.usuarioId, j.nombre, j.telefono) }
            : { tipo: "invitado", nombre: j.nombre, telefono: j.telefono ?? "" };
    });
}

/** Un lugar sin completar (del 2 al 4 son opcionales: se dejan vacíos y no se mandan) */
export const lugarVacio = (j: Jugador) => j.tipo === "cliente" ? j.cliente === null : j.nombre.trim() === "" && j.telefono.trim() === "";

/**
 * El body (de 1 a 4 jugadores, en orden) o el primer error. El 1 es obligatorio y es un cliente
 * registrado (el responsable); del 2 al 4 son opcionales: clientes o invitados, y los vacíos no van.
 */
export function validarJugadores(jugadores: Jugador[]): { jugadores?: JugadorRequest[]; error?: string } {
    const ids = new Set<number>();
    const salida: JugadorRequest[] = [];
    for (const [i, j] of jugadores.entries()) {
        const lugar = `Jugador ${i + 1}`;
        if (i > 0 && lugarVacio(j)) continue;
        if (j.tipo === "cliente") {
            if (!j.cliente) return { error: "Elegí al responsable (jugador 1): tiene que ser un cliente registrado." };
            if (ids.has(j.cliente.id)) return { error: `${j.cliente.nombre} está dos veces.` };
            ids.add(j.cliente.id);
            salida.push({ usuarioId: j.cliente.id });
        } else {
            if (i === 0) return { error: "El jugador 1 tiene que ser un cliente registrado: es el responsable del partido." };
            const nombre = j.nombre.trim();
            if (nombre.length < 2) return { error: `${lugar}: escribí el nombre del invitado.` };
            if (j.telefono.trim() && !telefonoValido(j.telefono)) return { error: `${lugar}: el celular no es válido.` };
            salida.push({ nombre, telefono: j.telefono.trim() || null });
        }
    }
    return { jugadores: salida };
}
