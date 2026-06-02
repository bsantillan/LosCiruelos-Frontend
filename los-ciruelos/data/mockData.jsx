export const CANCHAS = [
    { id: 1, numero: 1, tipo: "Techada", descripcion: "Cancha premium con cristal lateral panorámico", precio: 10000 },
    { id: 2, numero: 2, tipo: "Techada", descripcion: "Cancha central con iluminación LED profesional", precio: 10000 },
    { id: 3, numero: 3, tipo: "Al aire libre", descripcion: "Vista al jardín, ideal para tardes soleadas", precio: 8000 },
    { id: 4, numero: 4, tipo: "Al aire libre", descripcion: "Cancha renovada con césped sintético premium", precio: 8000 },
];

export const HORARIOS = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00", "18:30", "20:00", "21:30"];

export const RESERVAS_OCUPADAS = {
    "2026-05-29": { 1: ["09:30", "14:00"], 2: ["08:00", "15:30", "20:00"], 3: ["11:00"], 4: ["17:00", "18:30"] },
    "2026-05-30": { 1: ["08:00", "11:00", "17:00"], 2: ["09:30", "20:00"], 3: ["14:00", "21:30"], 4: ["08:00"] },
    "2026-05-31": { 1: ["15:30"], 2: ["08:00", "14:00"], 3: ["09:30", "18:30"], 4: ["11:00", "20:00"] },
    "2026-06-01": { 1: ["08:00"], 2: ["11:00"], 3: ["15:30", "20:00"], 4: ["09:30"] },
    "2026-06-02": { 1: ["14:00", "18:30"], 2: ["08:00"], 3: ["09:30"], 4: ["17:00"] },
};

export const MIS_RESERVAS = [
    { id: 1, canchaNumero: 2, tipo: "Techada", fecha: "2026-05-29", horaInicio: "18:30", horaFin: "20:00", estado: "PAGADA", monto: 10000, montoPagado: 10000, pelotas: true, paletas: false },
    { id: 2, canchaNumero: 1, tipo: "Techada", fecha: "2026-06-02", horaInicio: "09:30", horaFin: "11:00", estado: "SEÑADA", monto: 10000, montoPagado: 5000, pelotas: false, paletas: true },
    { id: 3, canchaNumero: 3, tipo: "Al aire libre", fecha: "2026-06-05", horaInicio: "14:00", horaFin: "15:30", estado: "PENDIENTE", monto: 8000, montoPagado: 0, pelotas: false, paletas: false },
    { id: 4, canchaNumero: 4, tipo: "Al aire libre", fecha: "2026-04-15", horaInicio: "17:00", horaFin: "18:30", estado: "COMPLETADA", monto: 8000, montoPagado: 8000, pelotas: true, paletas: true },
    { id: 5, canchaNumero: 2, tipo: "Techada", fecha: "2026-04-08", horaInicio: "20:00", horaFin: "21:30", estado: "CANCELADA", monto: 10000, montoPagado: 0, pelotas: false, paletas: false },
];

export const USUARIO_MOCK = {
    id: 1, nombre: "Martín", apellido: "Rodríguez", email: "martin@ejemplo.com",
    telefono: "+54 221 555-0123", categoria: "Intermedio", posicion: "Drive",
    totalReservas: 24, horasJugadas: 36,
};

export const ESTADISTICAS_CLUB = [
    { label: "Años de historia", valor: "12+" },
    { label: "Canchas", valor: "4" },
    { label: "Jugadores activos", valor: "500+" },
    { label: "Torneos anuales", valor: "8" },
];

export const TESTIMONIOS = [
    { nombre: "Lucas M.", texto: "El mejor club de pádel de La Plata. Las canchas techadas son increíbles.", categoria: "Avanzado" },
    { nombre: "Carolina P.", texto: "Ambiente familiar y profesional. La app hace que reservar sea muy fácil.", categoria: "Intermedio" },
    { nombre: "Roberto S.", texto: "Llevo 3 años jugando acá. La calidad de las canchas y el trato es excelente.", categoria: "Primera" },
];

export const DURATIONS = [
    { label: "90 min", minutos: 90 },
    { label: "120 min", minutos: 120 },
    { label: "150 min", minutos: 150 },
    { label: "180 min", minutos: 180 },
];