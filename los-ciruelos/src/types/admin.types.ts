import type { Rol } from "./auth.types";
import type { CanalNotificacion } from "./perfil.types";
import type {
    Bonificacion, CanchaResponse, CodigoProducto, CrearReservaRequest, EstadoPago, EstadoReserva, Pagina, ProductoPedido, ReservaResponse,
    TipoCancha, TipoProducto, TipoReserva,
} from "./reserva.types";

// ── Reservas del panel (GET /admin/reservas, ADMIN y EMPLEADO) ──

export interface FiltrosReservasAdmin {
    /** Fecha del turno, "yyyy-MM-dd", inclusive */
    desde?: string;
    hasta?: string;
    /** Incluye canceladas y vencidas (a diferencia de /reservas/mias) */
    estado?: EstadoReserva[];
    clienteId?: number;
    /** Nombre, apellido, email o "nombre apellido" (contiene, sin tildes) */
    cliente?: string;
    canchaId?: number;
    /** Solo reservas normales o solo partidos (sin el filtro, las dos) */
    tipo?: TipoReserva;
    /** true: solo las que salen de un turno fijo; false: solo las que no (reservas y partidos sueltos) */
    deTurnoFijo?: boolean;
    /** Los partidos de ese turno fijo (también las fechas dadas de baja) */
    turnoFijoId?: number;
    /** Solo las que deben plata: CONFIRMADA, SEÑADA y PARCIALMENTE_PAGADA, hayan jugado o no */
    pendientes?: boolean;
    /** Por defecto asc si desde es hoy o posterior; desc en el resto */
    orden?: "asc" | "desc";
    page?: number;
    /** 1 a 100 (por defecto 20) */
    size?: number;
}

/** Totales del filtro completo (no solo de la página) */
export interface TotalesReservas {
    reservas: number;
    montoTotal: number;
    /** Lo que el club se quedó de los pagos (aprobado menos lo devuelto o por devolver) */
    montoCobrado: number;
    /** De montoCobrado, lo cobrado en efectivo (pago-efectivo) */
    cobradoEfectivo: number;
    /** De montoCobrado, con Mercado Pago: online y los del club */
    cobradoMercadoPago: number;
    /** De montoCobrado, con Cuenta DNI */
    cobradoCuentaDni: number;
    /** Con tarjeta en otro posnet (la del posnet de Mercado Pago va en cobradoMercadoPago) */
    cobradoTarjeta?: number;
    /** Lo que el ADMIN bonificó (no es plata y no está en montoCobrado) */
    montoBonificado: number;
    /** Lo que deben las SEÑADA y PARCIALMENTE_PAGADA */
    montoPendiente: number;
}

export interface ListadoReservas extends Pagina<ReservaResponse> {
    totales: TotalesReservas;
}

// ── Búsqueda de clientes (GET /admin/clientes, ADMIN y EMPLEADO) ──

export interface ClienteBusqueda {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string | null;
    telefonoVerificado: boolean;
    categoria: string | null;
    posicion: string | null;
    /** false: todavía no se le puede reservar (celular sin verificar, sin categoría o posición) */
    perfilCompleto: boolean;
    enabled: boolean;
}

// ── Usuarios (/admin/usuarios, solo ADMIN) ──

/** Roles que el ADMIN puede asignar (no se puede crear ni editar a otro ADMIN) */
export type RolGestionable = Exclude<Rol, "ADMIN">;

export interface UsuarioAdmin {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string | null;
    telefonoVerificado: boolean;
    canalNotificaciones: CanalNotificacion;
    rol: Rol;
    enabled: boolean;
    emailVerificado: boolean;
    provider: "LOCAL" | "GOOGLE";
    categoria: string | null;
    posicion: string | null;
}

/** Alta (POST) y edición (PUT; el email no se cambia) */
export interface UsuarioAdminRequest {
    email?: string;
    nombre: string;
    apellido: string;
    telefono: string;
    rol: RolGestionable;
    /**
     * Al crear un CLIENTE son opcionales (sin ellas queda con el perfil incompleto y las carga él);
     * al editarlo, obligatorias
     */
    categoria?: string | null;
    posicion?: string | null;
}

export interface FiltrosUsuarios {
    rol?: RolGestionable;
    enabled?: boolean;
    /** Busca en nombre o apellido (contiene) */
    nombre?: string;
    email?: string;
}

// ── Reserva a nombre de un cliente (POST /admin/reservas) ──

export interface CrearReservaAdminRequest extends CrearReservaRequest {
    /** Un CLIENTE habilitado con el perfil completo */
    clienteId: number;
    /** Solo ADMIN: crear la reserva ya bonificada (monto null = todo) */
    bonificacion?: Bonificacion;
}

/** Medios para cobrar en el club (POST /admin/reservas/{id}/cobros/{medio}) */
/**
 * Cobro cargado a mano en el club. "transferencia": a la cuenta de Mercado Pago del club (reemplaza a
 * "presencial"); "tarjeta-mp": tarjeta en el posnet de Mercado Pago; "tarjeta": en otro posnet (Clover…)
 */
export type MedioCobro = "efectivo" | "transferencia" | "tarjeta-mp" | "cuenta-dni" | "tarjeta";

/** Cómo se agrupan los medios en el panel (MedioDeCaja del backend, más la bonificación del ADMIN) */
export type GrupoMedio = "EFECTIVO" | "MERCADO_PAGO" | "CUENTA_DNI" | "TARJETA" | "BONIFICACION";

/** Producto que el personal suma a una reserva: del catálogo o escrito a mano */
export type ProductoAgregado =
    | { productoId: number; cantidad: number }
    | { nombre: string; precio: number; cantidad: number };

// ── Cobro con el QR de la caja (/admin/reservas/{id}/cobros/qr) ──

export interface CobroQr {
    pagoId: number;
    orderId: string;
    monto: number;
    venceAt: string;
    /** EN_PROCESO: esperando que el cliente pague · APROBADO · EXPIRADO · A_REEMBOLSAR (otro monto) */
    estado: EstadoPago;
    estadoReserva: EstadoReserva;
    montoPendiente: number;
}

// ── Partidos y turnos fijos (ADMIN) ──

/** Un jugador: cliente registrado (usuarioId) o invitado (nombre y teléfono opcional) */
export type JugadorRequest =
    | { usuarioId: number }
    | { nombre: string; telefono?: string | null };

export interface PartidoRequest {
    canchaId: number;
    fechaReserva: string;
    horaInicio: string;
    horaFin: string;
    /** Exactamente 4, en orden. El 1 es el responsable: tiene que ser un cliente registrado */
    jugadores: JugadorRequest[];
    productos: ProductoPedido[];
}

export type DiaSemana = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface TurnoFijoRequest {
    canchaId: number;
    /** Primera fecha (hoy o futuro); el día de la semana es el de esta fecha */
    desde: string;
    horaInicio: string;
    horaFin: string;
    jugadores: JugadorRequest[];
    productos: ProductoPedido[];
}

export interface PartidoDeTurnoFijo {
    reservaId: number;
    fecha: string;
    estado: EstadoReserva;
    montoTotal: number;
    montoPendiente: number;
}

export interface TurnoFijo {
    id: number;
    canchaId: number;
    canchaNumero: number;
    diaSemana: DiaSemana;
    horaInicio: string;
    horaFin: string;
    desde: string;
    productos: { productoId: number; nombre: string; cantidad: number }[];
    activo: boolean;
    createdAt: string;
    dadoDeBajaAt: string | null;
    jugadores: { posicion: number; usuarioId: number | null; nombre: string; telefono: string | null; invitado: boolean }[];
    /** Partidos creados que todavía no empezaron, incluidas las fechas dadas de baja (CANCELADA) */
    proximosPartidos: PartidoDeTurnoFijo[];
    /** Solo al crear o modificar: fechas que no se pudieron crear (el job lo reintenta) */
    fechasOmitidas?: { fecha: string; motivo: string }[] | null;
    /** Solo al modificar: partidos con pagos que quedaron como estaban */
    partidosSinCambiar?: PartidoDeTurnoFijo[] | null;
}

// ── Ventas sueltas (/admin/ventas, ADMIN y EMPLEADO) ──

/** BONIFICACION: solo ADMIN, el club no se la cobra (el stock baja, pero no es plata) */
export type MedioVenta = "EFECTIVO" | "MERCADO_PAGO" | "TRANSFERENCIA_MP" | "TARJETA_MP" | "CUENTA_DNI" | "TARJETA" | "BONIFICACION";

/** GET /admin/ventas/medios: los medios con que se puede cobrar una venta suelta */
export interface MedioVentaInfo {
    medio: MedioVenta;
    etiqueta: string;
    /** EFECTIVO, MERCADO_PAGO (QR, transferencia y tarjeta en su posnet), CUENTA_DNI, TARJETA (otro posnet) o BONIFICACION */
    grupo: GrupoMedio;
    /** Cómo se llama dentro de su grupo ("Transferencia") */
    opcion: string;
    /** Solo lo usa el ADMIN (la bonificación) */
    soloAdmin?: boolean;
    /** false: no se puede usar ahora (por ejemplo, el QR de la caja sin configurar) */
    disponible: boolean;
    /** Se cobra con el QR de la caja: la venta queda esperando el pago */
    conQr: boolean;
    detalle: string | null;
}

/**
 * COBRADA: cuenta en la caja. ANULADA: sin efecto (el stock volvió). ESPERANDO_PAGO: con Mercado Pago,
 * el QR de la caja espera el pago (el stock queda apartado). NO_COBRADA: el QR venció o se canceló.
 */
export type EstadoVenta = "COBRADA" | "ANULADA" | "ESPERANDO_PAGO" | "NO_COBRADA";

/** Filtros de GET /admin/ventas (todos opcionales). El EMPLEADO no manda fechas: ve su jornada. */
export interface FiltrosVentasApi {
    desde?: string;
    hasta?: string;
    productoId?: number;
    /** Nombre, apellido o email del cliente (3 letras o más) */
    cliente?: string;
    medio?: MedioVenta[];
    estado?: EstadoVenta[];
    page?: number;
    size?: number;
    orden?: "asc" | "desc";
}

/** Una página de ventas con los totales de todo el filtro (solo cuentan las cobradas, netas de lo devuelto) */
export interface ListadoVentas {
    contenido: Venta[];
    pagina: number;
    tamanio: number;
    totalElementos: number;
    totalPaginas: number;
    /** La jornada de la primera y la de la última venta (sin filtros): de qué a qué va "Todo el período" */
    rango?: { desde: string | null; hasta: string | null };
    totales: {
        ventas: number;
        anuladas: number;
        total: number;
        devuelto: number;
        porMedio: Partial<Record<MedioVenta, number>>;
    };
}

export interface VentaItem {
    productoId: number;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    /** Unidades que el cliente ya devolvió */
    devueltas: number;
}

export interface DevolucionVenta {
    id: number;
    fecha: string;
    /** Nombre del ADMIN que la registró */
    registradaPor: string;
    motivo: string;
    monto: number;
    items: { productoId: number; nombre: string; cantidad: number; vuelveAlStock: boolean }[];
}

export interface DevolucionVentaRequest {
    motivo: string;
    /** Hasta 20 productos distintos, de 1 a 99 unidades cada uno */
    items: { productoId: number; cantidad: number; vuelveAlStock: boolean }[];
}

export interface Venta {
    id: number;
    fecha: string;
    total: number;
    medio: MedioVenta;
    clienteId: number | null;
    clienteNombre: string | null;
    registradaPor: string;
    items: VentaItem[];
    /** Cuenta DNI: si el ADMIN comprobó que la plata entró (null en otros medios) */
    verificada: boolean | null;
    verificadaAt: string | null;
    estado: EstadoVenta;
    /** Anulada: cuándo, quién y por qué (null si no) */
    anuladaAt: string | null;
    anuladaPor: string | null;
    motivoAnulacion: string | null;
    /** Lo que ya se le devolvió al cliente (suma de las devoluciones) */
    montoDevuelto: number;
    devoluciones: DevolucionVenta[];
    /** Con Mercado Pago: la order del QR de la caja y hasta cuándo se puede pagar */
    qr: { orderId: string; venceAt: string } | null;
    /** Bonificada: por qué no se le cobró (null si no se escribió) */
    motivoBonificacion?: string | null;
}

export interface VentaRequest {
    medio: MedioVenta;
    /** Solo con BONIFICACION (opcional, hasta 200) */
    motivo?: string | null;
    clienteId?: number | null;
    /** De 1 a 20: del catálogo o escrito a mano */
    items: ProductoAgregado[];
}

// ── Configuración del club (GET/PUT /admin/configuracion, ADMIN) ──

/** Un día de apertura: "Lunes" a "Domingo", horas "HH:mm". Un día que no está, el club no abre */
export interface HorarioDia {
    dia: string;
    apertura: string;
    cierre: string;
}

export interface ConfiguracionClub {
    /** Precio del turno: montoReserva + montoXMediaHora por cada media hora */
    montoReserva: number;
    montoXMediaHora: number;
    /** 0 a 100 */
    porcentajeSenia: number;
    /** Múltiplos de 30 minutos (30 a 600); la mínima no supera la máxima */
    duracionMinimaTurno: number;
    duracionMaximaTurno: number;
    /** Política de cancelación del cliente: minutos antes del turno (0 a 10080); total ≥ seña */
    minutosReembolsoTotal: number;
    minutosReembolsoSenia: number;
    recordatorioActivo: boolean;
    /** 15 a 1440 */
    minutosRecordatorio: number;
    /**
     * Si el club manda WhatsApp a los clientes (avisos y el código del celular). Apagado: todo por
     * mail y el celular del cliente no se verifica. Opcional en el PUT (sin él, queda como estaba).
     */
    whatsappClientes?: boolean;
    /** Si los clientes reservan desde la web (el ADMIN las pausa). Opcional en el PUT */
    reservasOnline?: boolean;
    /** Lo que ven los clientes mientras están pausadas (hasta 200; null: sin mensaje) */
    mensajeReservasPausadas?: string | null;
    /** 1 a 365 */
    diasAnticipacion: number;
    /** De lunes a domingo */
    horarios: HorarioDia[];
}

/** Lo que pasó al confirmar un horario nuevo o un día cerrado: las reservas que se cancelaron solas */
export interface CancelacionesResultado {
    canceladas: number[];
    /** Las que no se pudieron cancelar (por ejemplo, un pago en proceso): hay que cancelarlas a mano */
    sinCancelar: { reservaId: number; motivo: string }[];
}

/** La respuesta del PUT: la configuración nueva y, si se confirmó, lo que se canceló */
export interface ConfiguracionClubGuardada extends ConfiguracionClub {
    cancelaciones: CancelacionesResultado | null;
}

/** Un día puntual en que el club no abre (/admin/configuracion/cierres) */
export interface DiaCerrado {
    fecha: string;
    /** Lo ven los clientes */
    motivo: string;
    cerradoAt?: string;
    /** Solo al cerrar con confirmar: las reservas de ese día que se cancelaron */
    cancelaciones?: CancelacionesResultado | null;
}

export interface ConfiguracionClubRequest extends ConfiguracionClub {
    /** true: guarda aunque el horario nuevo deje afuera reservas o turnos fijos (no se tocan) */
    confirmar?: boolean;
}

/** El 409 de PUT /admin/configuracion: lo que el horario nuevo deja afuera */
export interface FueraDeHorario {
    error: string;
    reservasFueraDeHorario: {
        id: number; fecha: string; horaInicio: string; horaFin: string; canchaNumero: number;
        clienteNombre: string; tipo: "NORMAL" | "PARTIDO";
    }[];
    turnosFijosFueraDeHorario: { id: number; diaSemana: DiaSemana; horaInicio: string; horaFin: string; canchaNumero: number }[];
}

/** GET /club/horarios (público): días de apertura, próximos días cerrados y duración de los turnos */
export interface HorariosClub {
    horarios: HorarioDia[];
    /** De hoy en adelante: esos días el club no abre */
    cierres: { fecha: string; motivo: string }[];
    duracionMinimaTurno: number;
    duracionMaximaTurno: number;
}

// ── Configuración de reservas (ADMIN) ──

export interface ConfigReservas {
    /** Hasta cuántos días adelante reserva el cliente (1 a 365); también el tope de los turnos fijos */
    diasAnticipacion: number;
}

// ── Resumen de un período (GET /admin/reservas/resumen?desde&hasta) ──
// Base: las reservas cuyo turno (fechaReserva) cae en el período.

export interface ProductoVendido {
    productoId: number;
    nombre: string;
    tipo: TipoProducto;
    /** Unidades vendidas (VENTA) o alquiladas (ALQUILER) en los turnos no cancelados */
    cantidad: number;
    monto: number;
}

/**
 * jugados, porJugar, cancelaciones y productos: reservas cuyo TURNO cae en el período
 * (SEÑADA, PARCIALMENTE_PAGADA, PAGADA y COMPLETADA; jugado = el turno ya terminó).
 * caja: pagos cobrados y devueltos en el período por FECHA DE PAGO (cierre de caja).
 */
export interface ResumenAdmin {
    desde: string;
    hasta: string;
    jugados: {
        turnos: number;
        montoTotal: number;
        /** Plata que el club se quedó (sin bonificaciones) */
        montoCobrado: number;
        montoBonificado: number;
        /** montoTotal − montoCobrado − montoBonificado: turnos jugados que no se terminaron de pagar */
        deuda: number;
    };
    porJugar: {
        turnos: number;
        montoTotal: number;
        /** Señas y pagos por adelantado */
        cobradoAnticipado: number;
        montoBonificado: number;
        /** El saldo normal: se cobra el día del turno */
        aCobrar: number;
    };
    caja: {
        /** efectivo + mercadoPago + cuentaDni + tarjeta (incluye las ventas sueltas) */
        total: number;
        efectivo: number;
        /** Online y en el club (con la tarjeta en el posnet de Mercado Pago) */
        mercadoPago: number;
        cuentaDni: number;
        /** Tarjeta en otro posnet (Clover…) */
        tarjeta?: number;
        /** Lo devuelto en el período (lo que queda "a devolver a mano" no está acá) */
        devoluciones: number;
        /** total − devoluciones (puede ser negativo) */
        neto: number;
    };
    cancelaciones: {
        turnos: number;
        /** Lo pagado que el club no devolvió */
        retenido: number;
    };
    /** Ventas sueltas del período (ya sumadas en caja) */
    /** devoluciones: lo devuelto de ventas en el período (ya descontado en caja.devoluciones) */
    ventas: { cantidad: number; total: number; devoluciones: number };
    /** Lo pedido en las reservas del período más lo vendido suelto */
    productos: ProductoVendido[];
}

// ── Caja de la jornada (GET /admin/caja): el cierre de caja del EMPLEADO ──

/** Lo de un medio de pago en la jornada */
export interface MontosPorMedio {
    efectivo: number;
    /** Con la tarjeta en el posnet de Mercado Pago */
    mercadoPago: number;
    cuentaDni: number;
    /** Tarjeta en otro posnet */
    tarjeta?: number;
    total: number;
}

export type TipoMovimientoCaja = "COBRO" | "VENTA" | "DEVOLUCION" | "ANULACION";

/** Un movimiento de la jornada: un cobro, una venta, una devolución entregada o una anulación */
export interface MovimientoCaja {
    fecha: string;
    tipo: TipoMovimientoCaja;
    /** EFECTIVO, MERCADO_PAGO, CUENTA_DNI o TARJETA */
    medio: string;
    /** Positivo si entra, negativo si sale */
    monto: number;
    /** "Reserva #12 · Ana Pérez", "Venta #8"… */
    detalle: string;
    reservaId: number | null;
    ventaId: number | null;
    registradoPor: string | null;
}

/**
 * La caja de una jornada (de la apertura de un día a la del siguiente): lo cobrado y lo devuelto por
 * medio, el efectivo que tiene que haber en la caja y los movimientos, para contar la plata al cerrar.
 */
export interface CajaJornada {
    fecha: string;
    inicio: string;
    fin: string;
    cobrado: MontosPorMedio;
    /** Devoluciones entregadas en la jornada */
    devuelto: MontosPorMedio;
    /** Efectivo cobrado menos las devoluciones en efectivo entregadas: lo que tiene que haber en la caja */
    efectivoEnCaja: number;
    bonificado: number;
    /** Devoluciones de la jornada que todavía hay que entregar */
    aEntregar: { cantidad: number; monto: number };
    movimientos: MovimientoCaja[];
}

// ── Métricas del club (GET /admin/metricas, solo ADMIN) ──

/** Un valor del período con el del período anterior de igual duración. variacion: % con un decimal, null si el anterior es 0 */
export interface Comparado {
    actual: number;
    anterior: number;
    variacion: number | null;
}

export type DiaSemanaIngles = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface ClienteMetrica {
    clienteId: number;
    nombre: string;
    reservas: number;
    gasto: number;
}

export interface ProductoMetrica {
    productoId: number;
    nombre: string;
    tipo: TipoProducto;
    cantidad: number;
    monto: number;
}

export interface MetricasClub {
    desde: string;
    hasta: string;
    anterior: { desde: string; hasta: string };
    ocupacion: {
        porcentaje: Comparado;
        horasOcupadas: Comparado;
        horasAbiertas: Comparado;
        porCancha: { canchaId: number; numero: number; porcentaje: number; horasOcupadas: number; ingresos: number }[];
        /** Día de la semana × franja de 1 h; porcentaje null si ese día no abre a esa hora */
        mapa: { dia: DiaSemanaIngles; franjas: { hora: string; porcentaje: number | null }[] }[];
        porFranja: { franja: "MANIANA" | "TARDE" | "NOCHE"; porcentaje: number; horasOcupadas: number; ingresoPorHora: number }[];
        proximos7Dias: { fecha: string; porcentaje: number; horasOcupadas: number; horasAbiertas: number }[];
    };
    ingresos: {
        total: Comparado;
        cancha: Comparado;
        productosDeReservas: Comparado;
        ventasSueltas: Comparado;
        online: Comparado;
        enElClub: Comparado;
        ticketPromedio: Comparado;
        porHoraOcupada: Comparado;
    };
    clientes: {
        activos: Comparado;
        nuevos: Comparado;
        recurrentes: Comparado;
        frecuencia: Comparado;
        topPorReservas: ClienteMetrica[];
        topPorGasto: ClienteMetrica[];
        dejaronDeVenir: { clienteId: number; nombre: string; telefono: string | null; reservasAntes: number; ultimaReserva: string }[];
    };
    reservas: {
        creadas: Comparado;
        anticipacionPromedioHoras: Comparado;
        anticipacion: { mismoDia: number; unoADosDias: number; tresASieteDias: number; masDeSieteDias: number };
        duraciones: { minutos: number; cantidad: number }[];
        porTipo: { normales: number; partidos: number; turnosFijos: number };
        porOrigen: { cliente: number; personal: number };
    };
    cancelaciones: {
        tasa: Comparado;
        canceladas: Comparado;
        porCliente: number;
        porClub: number;
        sinDato: number;
        anticipacion: { menosDe2Horas: number; de2a24Horas: number; de1a3Dias: number; masDe3Dias: number };
        retenido: Comparado;
        vencidasSinPagar: Comparado;
    };
    deuda: {
        total: number;
        hasta7Dias: number;
        de8a30Dias: number;
        masDe30Dias: number;
        deudores: { clienteId: number; nombre: string; telefono: string | null; monto: number; reservas: number; masVieja: string }[];
    };
    /** A hoy. porCobrar y turnos: de hoy hasta donde se puede reservar (dias = la anticipación de la Configuración) */
    futuro: { asegurado: number; porCobrar: number; turnos: number; dias: number };
    productos: {
        masVendidos: ProductoMetrica[];
        alquilados: ProductoMetrica[];
        noDevueltos: { unidades: number; montoAlquiler: number; reservas: number; sinRegistrar: number };
        stockBajo: { productoId: number; nombre: string; stock: number }[];
    };
}

// ── Canchas (/admin/canchas, solo ADMIN) ──

export interface CanchaRequest {
    numero: number;
    nombre: string | null;
    descripcion: string | null;
    tipo: TipoCancha;
    superficie: string | null;
    iluminacion: boolean;
}

/** PUT /admin/canchas/{id}/baja: la cancha y, si se confirmó, lo que se canceló */
export interface BajaDeCancha {
    cancha: CanchaResponse;
    cancelaciones: CancelacionesResultado | null;
    turnosFijosDadosDeBaja: number[];
}

// ── Novedades (/admin/novedades, solo ADMIN; GET /novedades, público) ──

export type EstadoNovedad = "BORRADOR" | "PUBLICADA" | "VENCIDA";

export interface Novedad {
    id: number;
    titulo: string;
    descripcion: string;
    etiqueta: string | null;
    /** Url pública de la imagen (GET /archivos/{nombre}, hasta 1600 px), o null */
    imagenUrl: string | null;
    /** La misma de hasta 480 px, para tarjetas y listados (null sin imagen) */
    imagenMiniaturaUrl: string | null;
    /** Después de esa fecha deja de mostrarse sola (null: hasta que se oculte) */
    visibleHasta: string | null;
    publicada: boolean;
    publicadaAt: string | null;
    /** Solo en /admin/novedades */
    estado?: EstadoNovedad;
    creadoPor?: string | null;
    creadoAt?: string;
    actualizadoAt?: string;
}

export interface NovedadRequest {
    titulo: string;
    descripcion: string;
    etiqueta: string | null;
    visibleHasta: string | null;
}

// ── Productos (/admin/configuracion/productos) ──

export interface ProductoAdmin {
    id: number;
    codigo: CodigoProducto | null;
    nombre: string;
    descripcion: string | null;
    tipo: TipoProducto;
    precio: number;
    /** VENTA: unidades disponibles. ALQUILER: total de unidades (se controla el uso por horario) */
    stock: number;
    activo: boolean;
    /** Si el cliente lo ve y lo puede pedir al reservar; si no, solo lo carga el personal */
    ofrecerAlReservar: boolean;
    /** false: el stock no se mira ni se descuenta */
    controlaStock: boolean;
}

export interface ProductoRequest {
    nombre: string;
    descripcion: string | null;
    /** Solo al crear: no se puede cambiar */
    tipo?: TipoProducto;
    precio: number;
    stock: number;
    activo: boolean;
    /** Al crear: por defecto false. Al editar: si no viene, no cambia */
    ofrecerAlReservar?: boolean;
    /** Al crear: por defecto true. Al editar: si no viene, no cambia */
    controlaStock?: boolean;
}
