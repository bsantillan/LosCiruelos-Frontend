// Las horas llegan como "HH:MM" o "HH:MM:SS" según el serializador: usar horaCorta / timeToMin.

export type TipoCancha = "TECHADA" | "AIRE_LIBRE";

/** Una foto de una cancha: url pública (GET /archivos/{nombre}) y su lugar en el orden */
export interface FotoCancha {
    id: number;
    url: string;
    orden: number;
}

/** GET /canchas (público: solo las activas) y /admin/canchas (todas, con eliminable) */
export interface CanchaResponse {
    id: number;
    numero: number;
    nombre: string | null;
    descripcion: string | null;
    tipo: TipoCancha;
    superficie: string | null;
    iluminacion: boolean;
    activa: boolean;
    fotos: FotoCancha[];
    /** Solo en /admin/canchas: true si nunca se usó (se puede eliminar) */
    eliminable?: boolean;
}

export interface Turno {
    horaInicio: string;
    horaFin: string;
}

export interface DisponibilidadResponse {
    horarioApertura: string;
    horarioCierre: string;
    duracionMinimaTurno: number; // minutos
    duracionMaximaTurno: number;
    /** Duración con la que se calcularon los turnos (la pedida o, si no se pidió, la mínima) */
    duracion: number;
    /** Si la fecha es hoy, el primer inicio posible; null si ya no quedan turnos ese día */
    horarioMinimoInicio: string | null;
    slotsOcupados: Turno[];
    /** Turnos libres de `duracion` minutos, con las mismas reglas que POST /reservas */
    turnosDisponibles: Turno[];
    /**
     * Precio de la cancha para `duracion` (montoReserva + montoXMediaHora × bloques de 30 min).
     * Pendiente de agregar en el backend: mientras no venga, el precio de la cancha se ve al confirmar.
     */
    montoCancha?: number | null;
    /**
     * Último día que el CLIENTE puede reservar (hoy + días de anticipación de la configuración).
     * La disponibilidad responde también fechas posteriores porque el personal puede reservar más lejos.
     */
    reservableHasta?: string | null;
}

export type TipoProducto = "VENTA" | "ALQUILER";
/** Productos del sistema; los que crea el admin tienen codigo null */
export type CodigoProducto = "PELOTAS" | "PALETAS";

/** GET /productos/disponibilidad: unidades que se pueden pedir en ese horario */
export interface ProductoDisponible {
    id: number;
    codigo: CodigoProducto | null;
    nombre: string;
    tipo: TipoProducto;
    precio: number;
    /** null: el producto no controla stock (no tiene tope) */
    disponibles: number | null;
    /** Si se ofrece al reservar (en la consulta pública, siempre true) */
    ofrecerAlReservar?: boolean;
}

/** Un producto pedido en la reserva (cantidad de 1 a 99; uno repetido suma sus cantidades) */
export interface ProductoPedido {
    productoId: number;
    cantidad: number;
}

export interface CrearReservaRequest {
    canchaId: number;
    fechaReserva: string; // "YYYY-MM-DD"
    horaInicio: string;   // "HH:MM"
    horaFin: string;
    /** Hasta 20 ítems. El cliente solo puede pedir los que se ofrecen al reservar */
    productos: ProductoPedido[];
}

/** Bonificación del ADMIN: parte o todo del turno que no se le cobra al cliente */
export interface Bonificacion {
    /** null o sin mandar: todo lo que falta pagar */
    monto?: number | null;
    /** Opcional, hasta 200 caracteres ("socio", "torneo", "cortesía") */
    motivo?: string | null;
    /** Qué líneas cubre (cancha o productos); sin mandar, primero la cancha */
    imputaciones?: Imputacion[];
}

export type EstadoReserva =
    | "PENDIENTE"
    /** Partido sin nada pagado: no vence */
    | "CONFIRMADA"
    /** Solo reservas normales: un partido no tiene seña */
    | "SEÑADA"
    | "PARCIALMENTE_PAGADA"
    | "PAGADA"
    | "CANCELADA"
    | "EXPIRADA"
    | "COMPLETADA";

export interface ReservaProducto {
    productoId: number;
    codigo: CodigoProducto | null;
    nombre: string;
    tipo: TipoProducto;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    cantidadDevuelta: number | null;
    devueltaAt: string | null;
    // Imputación de pagos por línea (pendiente en el backend: mientras no venga, el front reparte
    // lo cubierto primero a la cancha y después a los productos, en orden)
    /** id de la línea (ReservaProducto) */
    lineaId?: number;
    /** Lo cobrado o bonificado de esta línea */
    montoPagado?: number;
    montoPendiente?: number;
}

export type EstadoPago =
    | "PENDIENTE"
    | "APROBADO"
    | "RECHAZADO"
    | "EN_PROCESO"
    | "DEVUELTO"
    | "EXPIRADO"
    | "A_REEMBOLSAR"
    /** Reserva cancelada con reembolso que Mercado Pago todavía no aceptó: un job lo reintenta cada 2 min */
    | "REEMBOLSO_PENDIENTE"
    /** Cobro cargado por error y dado de baja: no cuenta en caja, queda en el historial */
    | "ANULADO";

/**
 * MANUAL: efectivo. MERCADO_PAGO: online, o cargado a mano en el club (QR de la caja, transferencia).
 * CUENTA_DNI: Banco Provincia, cargado a mano; el ADMIN lo verifica contra la cuenta del club.
 * BONIFICACION: el ADMIN no le cobró al cliente; cubre el monto pero no es plata.
 */
export type PaymentProvider = "MANUAL" | "MERCADO_PAGO" | "TRANSFERENCIA_MP" | "CUENTA_DNI" | "BONIFICACION";

/** Qué parte de la cuenta cubre un pago: la cancha o una línea de producto */
export type ConceptoCuenta = "CANCHA" | "PRODUCTO";

export interface Imputacion {
    concepto: ConceptoCuenta;
    /** id de la línea de producto (null para la cancha) */
    lineaId: number | null;
    /** "Cancha" o el nombre del producto (en las respuestas) */
    nombre?: string;
    monto: number;
}

/** A_REEMBOLSAR: hay que entregar la plata a mano · REEMBOLSO_PENDIENTE: Mercado Pago no la aceptó todavía · DEVUELTO */
export type EstadoDevolucion = "A_REEMBOLSAR" | "REEMBOLSO_PENDIENTE" | "DEVUELTO";

/** Por dónde entró la plata (lo calcula el backend a partir del provider) */
export type CanalDePago = "EFECTIVO" | "MERCADO_PAGO_ONLINE" | "MERCADO_PAGO_QR" | "TRANSFERENCIA_MP" | "CUENTA_DNI" | "BONIFICACION";

/** GET /admin/reservas/devoluciones-a-entregar: plata que hay que darle al cliente a mano */
export interface DevolucionAEntregar {
    devolucionId: number;
    reservaId: number;
    fechaReserva: string;
    pagoId: number;
    clienteId: number;
    cliente: string;
    monto: number;
    /** Por dónde había entrado la plata */
    medio: CanalDePago;
    motivo: string | null;
    creadoAt: string;
}

/** Devolución (total o por línea) de un pago */
export interface DevolucionPago {
    id: number;
    monto: number;
    /** Vacía en las devoluciones de antes de que existieran por línea */
    lineas: Imputacion[];
    estado: EstadoDevolucion;
    motivo?: string | null;
    creadoAt: string;
    entregadoAt: string | null;
    /** Quién la registró (null: el sistema, por ejemplo al cancelar el cliente) */
    usuario?: string | null;
    entregadoPor?: string | null;
    /** Las del EMPLEADO nacen sin revisar hasta que el ADMIN las controla; las del ADMIN y del sistema, revisadas */
    revisada?: boolean | null;
    /** Solo cuando la revisó el ADMIN (las que nacen revisadas lo tienen en null) */
    revisadaAt?: string | null;
    revisadaPor?: string | null;
}

/** GET /admin/reservas/devoluciones-sin-revisar (ADMIN): devoluciones del EMPLEADO para controlar */
export interface DevolucionSinRevisar {
    devolucionId: number;
    reservaId: number;
    fechaReserva: string;
    pagoId: number;
    cliente: string;
    monto: number;
    medio: CanalDePago;
    estado: EstadoDevolucion;
    motivo: string | null;
    creadoAt: string;
    /** Quién la registró (null: el sistema) */
    registradaPor: string | null;
    revisada: boolean;
}

export interface PagoResponse {
    id: number;
    reservaId: number;
    monto: number;
    estado: EstadoPago;
    provider: PaymentProvider;
    canal?: CanalDePago;
    /** Motivo de una bonificación ("socio", "torneo", …) */
    motivo?: string | null;
    /** id de la preferencia de Mercado Pago */
    paymentToken: string | null;
    externalPaymentId: string | null;
    createdAt: string;
    paidAt: string | null;
    /** Estado de la reserva después de la operación */
    estadoReserva: EstadoReserva;
    /** status_detail de Mercado Pago (solo al cobrar) */
    detalle?: string | null;
    /** Cuánto se devolvió de este pago al cancelar la reserva */
    montoReembolsado?: number | null;
    /** Cuenta DNI: si el ADMIN comprobó que la plata entró a la cuenta del club (null en otros medios) */
    verificado?: boolean | null;
    verificadoAt?: string | null;
    /** Qué cubre el pago (lo vigente, sin lo devuelto) */
    imputaciones?: Imputacion[];
    devoluciones?: DevolucionPago[];
    anuladoAt?: string | null;
    motivoAnulacion?: string | null;
    anuladoPor?: string | null;
}

export type TipoReserva = "NORMAL" | "PARTIDO";

/** Jugador de un partido (posición 1 = el responsable, siempre un cliente registrado) */
export interface JugadorPartido {
    id: number;
    posicion: number;
    usuarioId: number | null;
    nombre: string;
    /** Solo para el personal: a un jugador le llega null */
    telefono: string | null;
    invitado: boolean;
}

export interface ReservaResponse {
    id: number;
    canchaId: number;
    canchaNumero: number;
    fechaReserva: string;
    horaInicio: string;
    horaFin: string;
    montoCancha: number;
    montoProductos: number;
    montoTotal: number;
    montoSenia: number;
    /** Solo plata cobrada (sin bonificaciones) */
    montoPagado: number;
    /** Lo que el ADMIN bonificó: cubre el turno pero no es plata */
    montoBonificado: number;
    /** montoTotal − montoPagado − montoBonificado */
    montoPendiente: number;
    /** Lo cobrado o bonificado de la cancha (pendiente en el backend) */
    montoCanchaPagado?: number;
    montoCanchaPendiente?: number;
    productos: ReservaProducto[];
    estado: EstadoReserva;
    tipo: TipoReserva;
    /** Si el partido lo creó un turno fijo */
    turnoFijoId: number | null;
    /** Solo en un partido; [] en una reserva normal */
    jugadores: JugadorPartido[];
    /** En un partido, el jugador 1 (el responsable) */
    clienteId: number;
    clienteNombre: string;
    createdAt: string;
    /** Vencimiento de una reserva PENDIENTE (LocalDateTime del backend, hora de Argentina) */
    expiresAt: string | null;
    pagos: PagoResponse[];

    // Cancelación por el cliente, calculada por el backend con la política de la configuración:
    // faltando ≥ minutosReembolsoTotal (24 h) se devuelve todo lo pagado, ≥ minutosReembolsoSenia
    // (12 h) hasta la seña, y con menos se puede cancelar sin devolución hasta que empieza el turno.
    /** Si el cliente puede cancelar ahora */
    cancelable: boolean;
    /** Hasta cuándo se puede cancelar (inicio del turno) */
    cancelableHasta: string | null;
    /** Cuánto se devolvería si se cancela ahora */
    montoReembolso: number;
    /** Hasta cuándo se devuelve todo lo pagado (null si no aplica) */
    reembolsoTotalHasta: string | null;
    /** Hasta cuándo se devuelve la seña (null si no aplica) */
    reembolsoSeniaHasta: string | null;
    /** El turno ya pasó */
    turnoTerminado: boolean;
    /** El turno ya pasó y la reserva sigue SEÑADA o PARCIALMENTE_PAGADA (falta pagar montoPendiente) */
    debeSaldo: boolean;
}

/** Página de resultados (GET /reservas/mias) */
export interface Pagina<T> {
    contenido: T[];
    pagina: number;
    tamanio: number;
    totalElementos: number;
    totalPaginas: number;
    /**
     * La primera y la última fecha de toda la lista de ese usuario (sin el filtro de fechas ni los
     * otros filtros, sin paginar): de qué fecha a qué fecha va "Todo el período". En /reservas/mias,
     * /admin/reservas y /admin/ventas.
     */
    rango?: { desde: string | null; hasta: string | null };
}

export interface FiltrosMisReservas {
    tipo?: "proximas" | "historial";
    estado?: EstadoReserva[];
    desde?: string; // "YYYY-MM-DD"
    hasta?: string;
    /** Incluir canceladas y vencidas que nunca movieron plata (el backend las oculta por defecto) */
    incluirDescartadas?: boolean;
    page?: number;
    size?: number; // 1 a 50
}

/** Datos que entrega el Card Payment Brick de Mercado Pago en onSubmit */
export interface DatosTarjetaMP {
    token: string;
    issuer_id: string;
    payment_method_id: string;
    transaction_amount: number;
    installments: number;
    payer: {
        email?: string;
        identification?: { type: string; number: string };
    };
}

export interface SlotLibre {
    inicio: number; // minutos desde medianoche
    fin: number;
}
