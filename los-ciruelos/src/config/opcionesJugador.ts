/** Valores de los enums Posicion y Categoria del backend, con su etiqueta para mostrar */

export const POSICIONES = [
    { valor: "Drive", etiqueta: "Drive" },
    { valor: "Reves", etiqueta: "Revés" },
    { valor: "Ambos", etiqueta: "Ambos" },
];

export const CATEGORIAS = [
    { valor: "Principiante", etiqueta: "Principiante" },
    { valor: "Septima", etiqueta: "Séptima" },
    { valor: "Sexta", etiqueta: "Sexta" },
    { valor: "Quinta", etiqueta: "Quinta" },
    { valor: "Cuarta", etiqueta: "Cuarta" },
    { valor: "Tercera", etiqueta: "Tercera" },
    { valor: "Segunda", etiqueta: "Segunda" },
    { valor: "Primera", etiqueta: "Primera" },
];

export const etiquetaDe = (opciones: { valor: string; etiqueta: string }[], valor: string | null | undefined) =>
    opciones.find(o => o.valor === valor)?.etiqueta ?? valor ?? "";
