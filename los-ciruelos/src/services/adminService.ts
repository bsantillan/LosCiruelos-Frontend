import api from "../api/axiosInstance";
import { prepararImagen } from "../utils/archivos";
import type {
    ClienteBusqueda, CobroQr, ConfiguracionClub, ConfiguracionClubGuardada, ConfiguracionClubRequest, DiaCerrado, HorariosClub, ConfigReservas, CrearReservaAdminRequest, FiltrosReservasAdmin, FiltrosUsuarios,
    ListadoReservas, MedioCobro, PartidoRequest, ProductoAdmin, ProductoAgregado, ProductoRequest, ResumenAdmin, CajaJornada, MetricasClub, BajaDeCancha, CanchaRequest, Novedad, NovedadRequest, FiltrosVentasApi, ListadoVentas,
    TurnoFijo, TurnoFijoRequest, UsuarioAdmin, UsuarioAdminRequest, DevolucionVentaRequest, MedioVentaInfo, Venta, VentaRequest,
} from "../types/admin.types";
import type { ConfigAvisos } from "../types/perfil.types";
import type { CanchaResponse, Pagina } from "../types/reserva.types";
import type { Bonificacion, DevolucionAEntregar, DevolucionSinRevisar, Imputacion, PagoResponse, ProductoDisponible, ReservaResponse } from "../types/reserva.types";

export type Reembolso = "TOTAL" | "SENIA" | "NADA";

/** Saca los filtros vacíos de los parámetros */
const sinVacios = (params: object) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/** Endpoints del personal del club (ADMIN y, donde se indica, EMPLEADO). */
/**
 * Para subir archivos: la instancia manda JSON por defecto y axios convertiría el FormData en JSON. Con
 * multipart, el navegador arma el encabezado con su boundary.
 */
const MULTIPART = { "Content-Type": "multipart/form-data" };

export const adminService = {
    // ── Recordatorio del turno (ADMIN) ──

    getConfigAvisos: async (): Promise<ConfigAvisos> => {
        const res = await api.get<ConfigAvisos>("/admin/configuracion/avisos");
        return res.data;
    },

    // Minutos entre 15 y 1440
    updateConfigAvisos: async (datos: ConfigAvisos): Promise<ConfigAvisos> => {
        const res = await api.put<ConfigAvisos>("/admin/configuracion/avisos", datos);
        return res.data;
    },

    // ── Configuración de reservas (ADMIN): días de anticipación para reservar ──

    getConfigReservas: async (): Promise<ConfigReservas> => {
        const res = await api.get<ConfigReservas>("/admin/configuracion/reservas");
        return res.data;
    },

    // Entre 1 y 365 días; también es hasta dónde se generan los partidos de los turnos fijos
    updateConfigReservas: async (datos: ConfigReservas): Promise<ConfigReservas> => {
        const res = await api.put<ConfigReservas>("/admin/configuracion/reservas", datos);
        return res.data;
    },

    // ── Resumen de un período (ADMIN, EMPLEADO) ── fechas "yyyy-MM-dd", inclusive.
    // El EMPLEADO solo puede ver el día de hoy (otro período → 403); sin fechas, es hoy.
    // Toda la configuración del club (ADMIN). El PUT responde 409 (FueraDeHorario) si el horario nuevo
    // deja afuera reservas o turnos fijos y no vino confirmar: true
    configuracion: async (): Promise<ConfiguracionClub> => {
        const res = await api.get<ConfiguracionClub>("/admin/configuracion");
        return res.data;
    },

    // Con confirmar: true, guarda y cancela las reservas que quedaron afuera (reembolso total y aviso)
    actualizarConfiguracion: async (datos: ConfiguracionClubRequest): Promise<ConfiguracionClubGuardada> => {
        const res = await api.put<ConfiguracionClubGuardada>("/admin/configuracion", datos);
        return res.data;
    },

    // Días cerrados (ADMIN): de hoy en adelante. Cerrar con reservas ese día da 409 salvo confirmar
    cierres: async (): Promise<DiaCerrado[]> => {
        const res = await api.get<DiaCerrado[]>("/admin/configuracion/cierres");
        return res.data;
    },

    cerrarDia: async (datos: { fecha: string; motivo: string; confirmar?: boolean }): Promise<DiaCerrado> => {
        const res = await api.post<DiaCerrado>("/admin/configuracion/cierres", datos);
        return res.data;
    },

    // Vuelve a abrir ese día (las reservas canceladas al cerrarlo no vuelven)
    abrirDia: async (fecha: string): Promise<void> => {
        await api.delete(`/admin/configuracion/cierres/${fecha}`);
    },

    // Público: días y horarios de apertura (para la grilla, también en días pasados)
    horariosClub: async (): Promise<HorariosClub> => {
        const res = await api.get<HorariosClub>("/club/horarios");
        return res.data;
    },

    resumen: async (desde?: string, hasta?: string): Promise<ResumenAdmin> => {
        const res = await api.get<ResumenAdmin>("/admin/reservas/resumen", { params: desde && hasta ? { desde, hasta } : undefined });
        return res.data;
    },

    // ── Canchas (ADMIN) ──
    canchasAdmin: async (): Promise<CanchaResponse[]> => {
        const res = await api.get<CanchaResponse[]>("/admin/canchas");
        return res.data;
    },
    crearCancha: async (datos: CanchaRequest): Promise<CanchaResponse> => {
        const res = await api.post<CanchaResponse>("/admin/canchas", datos);
        return res.data;
    },
    editarCancha: async (id: number, datos: CanchaRequest): Promise<CanchaResponse> => {
        const res = await api.put<CanchaResponse>(`/admin/canchas/${id}`, datos);
        return res.data;
    },
    // Sin confirmar: 409 con las reservas y turnos fijos que tiene (FueraDeHorario); con confirmar, los cancela
    bajaCancha: async (id: number, confirmar = false): Promise<BajaDeCancha> => {
        const res = await api.put<BajaDeCancha>(`/admin/canchas/${id}/baja`, null, { params: confirmar ? { confirmar } : undefined, timeout: 60000 });
        return res.data;
    },
    reactivarCancha: async (id: number): Promise<CanchaResponse> => {
        const res = await api.put<CanchaResponse>(`/admin/canchas/${id}/reactivacion`);
        return res.data;
    },
    // Solo si nunca se usó; si no, 409
    eliminarCancha: async (id: number): Promise<void> => {
        await api.delete(`/admin/canchas/${id}`);
    },
    agregarFotoCancha: async (id: number, archivo: File): Promise<CanchaResponse> => {
        const datos = new FormData();
        datos.append("archivo", await prepararImagen(archivo));
        const res = await api.post<CanchaResponse>(`/admin/canchas/${id}/fotos`, datos, { timeout: 60000, headers: MULTIPART });
        return res.data;
    },
    sacarFotoCancha: async (id: number, fotoId: number): Promise<CanchaResponse> => {
        const res = await api.delete<CanchaResponse>(`/admin/canchas/${id}/fotos/${fotoId}`);
        return res.data;
    },
    ordenarFotosCancha: async (id: number, fotos: number[]): Promise<CanchaResponse> => {
        const res = await api.put<CanchaResponse>(`/admin/canchas/${id}/fotos/orden`, { fotos });
        return res.data;
    },

    // ── Novedades (ADMIN) ──
    novedadesAdmin: async (page = 0, size = 50): Promise<Pagina<Novedad>> => {
        const res = await api.get<Pagina<Novedad>>("/admin/novedades", { params: { page, size } });
        return res.data;
    },
    crearNovedad: async (datos: NovedadRequest): Promise<Novedad> => {
        const res = await api.post<Novedad>("/admin/novedades", datos);
        return res.data;
    },
    editarNovedad: async (id: number, datos: NovedadRequest): Promise<Novedad> => {
        const res = await api.put<Novedad>(`/admin/novedades/${id}`, datos);
        return res.data;
    },
    publicarNovedad: async (id: number, publicada: boolean): Promise<Novedad> => {
        const res = await api.put<Novedad>(`/admin/novedades/${id}/publicacion`, { publicada });
        return res.data;
    },
    eliminarNovedad: async (id: number): Promise<void> => {
        await api.delete(`/admin/novedades/${id}`);
    },
    subirImagenNovedad: async (id: number, archivo: File): Promise<Novedad> => {
        const datos = new FormData();
        datos.append("archivo", await prepararImagen(archivo));
        const res = await api.post<Novedad>(`/admin/novedades/${id}/imagen`, datos, { timeout: 60000, headers: MULTIPART });
        return res.data;
    },
    sacarImagenNovedad: async (id: number): Promise<Novedad> => {
        const res = await api.delete<Novedad>(`/admin/novedades/${id}/imagen`);
        return res.data;
    },

    // Métricas del club (ADMIN): las dos fechas o ninguna (los últimos 30 días); hasta 366 días
    metricas: async (desde: string, hasta: string): Promise<MetricasClub> => {
        const res = await api.get<MetricasClub>("/admin/metricas", { params: { desde, hasta } });
        return res.data;
    },

    // Caja de una jornada (EMPLEADO: la suya). Sin fecha, la jornada en curso.
    caja: async (fecha?: string): Promise<CajaJornada> => {
        const res = await api.get<CajaJornada>("/admin/caja", { params: fecha ? { fecha } : undefined });
        return res.data;
    },

    // ── Reservas de cualquier cliente, paginadas y con los totales del filtro (ADMIN, EMPLEADO) ──
    reservas: async (filtros: FiltrosReservasAdmin = {}, signal?: AbortSignal): Promise<ListadoReservas> => {
        const params = sinVacios({
            ...filtros,
            estado: filtros.estado?.length ? filtros.estado.join(",") : undefined,
            pendientes: filtros.pendientes ? true : undefined,
        });
        const res = await api.get<ListadoReservas>("/admin/reservas", { params, signal });
        return res.data;
    },

    // Clientes por nombre, apellido o email (mínimo 2 caracteres, hasta 20). Solo rol CLIENTE.
    clientes: async (buscar: string, soloActivos = true): Promise<ClienteBusqueda[]> => {
        const res = await api.get<ClienteBusqueda[]>("/admin/usuarios/clientes", { params: { buscar, soloActivos } });
        return res.data;
    },

    // Detalle de cualquier reserva o partido, con los pagos
    reserva: async (id: number): Promise<ReservaResponse> => {
        const res = await api.get<ReservaResponse>(`/admin/reservas/${id}`);
        return res.data;
    },

    // Cancelar como personal: con dinero cobrado hay que elegir qué se devuelve. Un partido, solo el ADMIN.
    // entregada: lo cobrado en el club se devuelve en el momento (true) o queda "A devolver" (false)
    cancelarReserva: async (id: number, reembolso?: Reembolso, entregada?: boolean): Promise<ReservaResponse> => {
        const res = await api.delete<ReservaResponse>(`/admin/reservas/${id}/cancelar`, {
            params: reembolso ? { reembolso, entregada } : undefined,
            timeout: 30000,
        });
        return res.data;
    },

    // ── Reservas (ADMIN, EMPLEADO) ──

    // Turnos que ya empezaron con paletas sin devolver
    devolucionesPendientes: async (): Promise<ReservaResponse[]> => {
        const res = await api.get<ReservaResponse[]>("/admin/reservas/devoluciones-pendientes");
        return res.data;
    },

    // Registra cuántas paletas volvieron; las faltantes se descuentan del stock
    registrarDevolucion: async (reservaId: number, paletasDevueltas: number): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>(`/admin/reservas/${reservaId}/devolucion`, { paletasDevueltas });
        return res.data;
    },

    // Reserva a nombre de un CLIENTE habilitado (queda PENDIENTE 15 min hasta que se cobre)
    crearReserva: async (datos: CrearReservaAdminRequest): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>("/admin/reservas", datos);
        return res.data;
    },

    // Suma un producto (del catálogo o escrito a mano) a una reserva o partido: el total sube
    agregarProducto: async (reservaId: number, producto: ProductoAgregado): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>(`/admin/reservas/${reservaId}/productos`, producto);
        return res.data;
    },

    // Saca unidades de un producto (sin cantidad, todas); lo que ya tiene cobrado no se puede sacar
    // (409: primero hay que anular o devolver ese cobro)
    quitarProducto: async (reservaId: number, productoId: number, cantidad?: number): Promise<ReservaResponse> => {
        const res = await api.delete<ReservaResponse>(`/admin/reservas/${reservaId}/productos/${productoId}`, {
            params: cantidad ? { cantidad } : undefined,
        });
        return res.data;
    },

    // Cobro en el club: efectivo, transferencia a Mercado Pago o Cuenta DNI (queda sin verificar).
    // También en partidos. Si la reserva queda paga y el turno ya terminó, pasa a COMPLETADA.
    // Con imputaciones, el cobro dice qué líneas cubre (cancha o productos); sin ellas, el backend
    // lo reparte solo: primero la cancha y después los productos.
    registrarCobro: async (reservaId: number, monto: number, medio: MedioCobro, imputaciones?: Imputacion[]): Promise<PagoResponse> => {
        const res = await api.post<PagoResponse>(`/admin/reservas/${reservaId}/cobros/${medio}`, { monto, imputaciones });
        return res.data;
    },

    // Anula un cobro cargado por error en el club (no los de Mercado Pago online ni QR: esos se
    // devuelven). ADMIN siempre; EMPLEADO, los de la jornada.
    anularPago: async (reservaId: number, pagoId: number, motivo: string): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>(`/admin/reservas/${reservaId}/pagos/${pagoId}/anulacion`, { motivo });
        return res.data;
    },

    // Devuelve todo o parte de un pago, por línea (el EMPLEADO, cobros de su jornada y con motivo:
    // quedan sin revisar). Online vuelve por Mercado Pago; lo cobrado en el club se da en el momento
    // (entregada) o queda A_REEMBOLSAR hasta que se entrega.
    devolverPago: async (reservaId: number, pagoId: number, lineas: Imputacion[], motivo?: string, entregada = true): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>(`/admin/reservas/${reservaId}/pagos/${pagoId}/devoluciones`, { lineas, motivo: motivo || undefined, entregada });
        return res.data;
    },

    // Lo que hay que devolverle a mano a cada cliente (A_REEMBOLSAR). El EMPLEADO ve las de su jornada.
    devolucionesAEntregar: async (): Promise<DevolucionAEntregar[]> => {
        const res = await api.get<DevolucionAEntregar[]>("/admin/reservas/devoluciones-a-entregar");
        return res.data;
    },

    // ADMIN: marca (o desmarca) como revisada una devolución que registró el EMPLEADO
    revisarDevolucion: async (reservaId: number, devolucionId: number, revisada: boolean): Promise<unknown> => {
        const res = await api.put(`/admin/reservas/${reservaId}/devoluciones/${devolucionId}/revision`, { revisada });
        return res.data;
    },

    // ADMIN: las devoluciones del personal que falta revisar
    devolucionesSinRevisar: async (): Promise<DevolucionSinRevisar[]> => {
        const res = await api.get<DevolucionSinRevisar[]>("/admin/reservas/devoluciones-sin-revisar");
        return res.data;
    },

    // Marca como entregada una devolución del club (A_REEMBOLSAR → DEVUELTO)
    entregarDevolucion: async (reservaId: number, devolucionId: number): Promise<ReservaResponse> => {
        const res = await api.put<ReservaResponse>(`/admin/reservas/${reservaId}/devoluciones/${devolucionId}/entrega`);
        return res.data;
    },

    // ADMIN: marca un pago con Cuenta DNI como verificado (la plata entró a la cuenta del club) o lo desmarca
    verificarPago: async (reservaId: number, pagoId: number, verificado: boolean): Promise<PagoResponse> => {
        const res = await api.put<PagoResponse>(`/admin/reservas/${reservaId}/pagos/${pagoId}/verificacion`, { verificado });
        return res.data;
    },

    // ADMIN: bonifica la reserva (todo o una parte) cuando no se le cobra al cliente. Sin monto,
    // todo lo que falta. Cubre el turno pero no es plata: no cuenta como cobrado ni se devuelve.
    bonificar: async (reservaId: number, datos: Bonificacion = {}): Promise<PagoResponse> => {
        const res = await api.post<PagoResponse>(`/admin/reservas/${reservaId}/bonificacion`, datos);
        return res.data;
    },

    // ── Cobro con el QR impreso de la caja (un solo cobro esperando a la vez) ──

    // Le asigna a la caja el monto (sin monto, todo lo que falta). 503 si no está configurado.
    iniciarCobroQr: async (reservaId: number, monto?: number, imputaciones?: Imputacion[]): Promise<CobroQr> => {
        const res = await api.post<CobroQr>(`/admin/reservas/${reservaId}/cobros/qr`, monto ? { monto, imputaciones } : undefined);
        return res.data;
    },

    // Estado del último cobro con QR (solo lee la base: se consulta cada 3 s)
    estadoCobroQr: async (reservaId: number): Promise<CobroQr> => {
        const res = await api.get<CobroQr>(`/admin/reservas/${reservaId}/cobros/qr`);
        return res.data;
    },

    // Cierra el cobro y libera la caja; si Mercado Pago ya lo cobró, responde APROBADO
    cancelarCobroQr: async (reservaId: number): Promise<CobroQr> => {
        const res = await api.delete<CobroQr>(`/admin/reservas/${reservaId}/cobros/qr`);
        return res.data;
    },

    // ── Partidos (ADMIN): 4 jugadores, sin seña, no vencen y se cobran en el club ──

    crearPartido: async (datos: PartidoRequest): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>("/admin/reservas/partidos", datos);
        return res.data;
    },

    // Body completo; solo partidos que todavía no se jugaron
    editarPartido: async (id: number, datos: PartidoRequest): Promise<ReservaResponse> => {
        const res = await api.put<ReservaResponse>(`/admin/reservas/partidos/${id}`, datos);
        return res.data;
    },

    // ── Turnos fijos (ADMIN): el mismo partido todas las semanas ──

    turnosFijos: async (activos?: boolean): Promise<TurnoFijo[]> => {
        const res = await api.get<TurnoFijo[]>("/admin/turnos-fijos", { params: sinVacios({ activos }) });
        return res.data;
    },

    turnoFijo: async (id: number): Promise<TurnoFijo> => {
        const res = await api.get<TurnoFijo>(`/admin/turnos-fijos/${id}`);
        return res.data;
    },

    crearTurnoFijo: async (datos: TurnoFijoRequest): Promise<TurnoFijo> => {
        const res = await api.post<TurnoFijo>("/admin/turnos-fijos", datos);
        return res.data;
    },

    // Los partidos futuros sin pagos se rehacen; los que tienen pagos vienen en partidosSinCambiar
    editarTurnoFijo: async (id: number, datos: TurnoFijoRequest): Promise<TurnoFijo> => {
        const res = await api.put<TurnoFijo>(`/admin/turnos-fijos/${id}`, datos);
        return res.data;
    },

    // Baja general: cancela los partidos que todavía no empezaron
    // entregada (con reembolso): la plata cobrada en el club se dio en el momento o queda para entregar
    bajaTurnoFijo: async (id: number, reembolso?: Reembolso, entregada?: boolean): Promise<TurnoFijo> => {
        const res = await api.delete<TurnoFijo>(`/admin/turnos-fijos/${id}`, {
            params: reembolso ? { reembolso, entregada } : undefined, timeout: 30000,
        });
        return res.data;
    },

    // Baja de una fecha: esa semana no vienen y el horario queda libre
    bajaFechaTurnoFijo: async (id: number, fecha: string, reembolso?: Reembolso, entregada?: boolean): Promise<ReservaResponse> => {
        const res = await api.delete<ReservaResponse>(`/admin/turnos-fijos/${id}/fechas/${fecha}`, {
            params: reembolso ? { reembolso, entregada } : undefined, timeout: 30000,
        });
        return res.data;
    },

    // ── Ventas sueltas (ADMIN, EMPLEADO): sin reserva, cobradas en el momento ──

    // Sin fechas, las de hoy. El EMPLEADO solo puede ver hoy.
    // Paginadas, con filtros y los totales del filtro. Los medios y estados van separados por coma.
    ventas: async (filtros: FiltrosVentasApi = {}): Promise<ListadoVentas> => {
        const { medio, estado, ...resto } = filtros;
        const res = await api.get<ListadoVentas>("/admin/ventas", {
            params: { ...resto, medio: medio?.join(","), estado: estado?.join(",") },
        });
        return res.data;
    },

    // Medios de pago de las ventas (los define el backend)
    mediosVenta: async (): Promise<MedioVentaInfo[]> => {
        const res = await api.get<MedioVentaInfo[]>("/admin/ventas/medios");
        return res.data;
    },

    registrarVenta: async (datos: VentaRequest): Promise<Venta> => {
        const res = await api.post<Venta>("/admin/ventas", datos);
        return res.data;
    },

    // ADMIN: una venta con Cuenta DNI, verificada contra la cuenta del club
    verificarVenta: async (id: number, verificada: boolean): Promise<Venta> => {
        const res = await api.put<Venta>(`/admin/ventas/${id}/verificacion`, { verificada });
        return res.data;
    },

    // Una venta (el EMPLEADO, solo las de hoy): el modal del QR la consulta para ver si se pagó
    venta: async (id: number): Promise<Venta> => {
        const res = await api.get<Venta>(`/admin/ventas/${id}`);
        return res.data;
    },

    // Sin efecto, con motivo. El EMPLEADO, solo las de hoy sin verificar; con QR, Mercado Pago devuelve el total
    anularVenta: async (id: number, motivo: string): Promise<Venta> => {
        const res = await api.post<Venta>(`/admin/ventas/${id}/anulacion`, { motivo });
        return res.data;
    },

    // ADMIN: el cliente devuelve todo o parte (cuenta en la caja de hoy)
    devolverVenta: async (id: number, datos: DevolucionVentaRequest): Promise<Venta> => {
        const res = await api.post<Venta>(`/admin/ventas/${id}/devoluciones`, datos);
        return res.data;
    },

    // null: venta al público. El EMPLEADO, solo en las de hoy
    cambiarClienteVenta: async (id: number, clienteId: number | null): Promise<Venta> => {
        const res = await api.put<Venta>(`/admin/ventas/${id}/cliente`, { clienteId });
        return res.data;
    },

    // Se cerró el QR sin que se pagara: la venta queda NO_COBRADA (si ya se pagó, vuelve COBRADA)
    cancelarQrVenta: async (id: number): Promise<Venta> => {
        const res = await api.delete<Venta>(`/admin/ventas/${id}/qr`);
        return res.data;
    },

    // ── Usuarios (ADMIN) ── nunca incluye a los ADMIN

    usuarios: async (filtros: FiltrosUsuarios = {}): Promise<UsuarioAdmin[]> => {
        const res = await api.get<UsuarioAdmin[]>("/admin/usuarios", { params: sinVacios(filtros) });
        return res.data;
    },

    // Contraseña temporal y código de verificación por mail
    crearUsuario: async (datos: UsuarioAdminRequest): Promise<UsuarioAdmin> => {
        const res = await api.post<UsuarioAdmin>("/admin/usuarios", datos);
        return res.data;
    },

    editarUsuario: async (id: number, datos: UsuarioAdminRequest): Promise<UsuarioAdmin> => {
        const res = await api.put<UsuarioAdmin>(`/admin/usuarios/${id}`, datos);
        return res.data;
    },

    reactivarUsuario: async (id: number): Promise<void> => {
        await api.put(`/admin/usuarios/${id}/reactivar`);
    },

    desactivarUsuario: async (id: number): Promise<void> => {
        await api.delete(`/admin/usuarios/${id}/desactivar`);
    },

    // ── Productos (ADMIN; EMPLEADO puede listar y ajustar stock) ──

    productos: async (): Promise<ProductoAdmin[]> => {
        const res = await api.get<ProductoAdmin[]>("/admin/configuracion/productos");
        return res.data;
    },

    crearProducto: async (datos: ProductoRequest): Promise<ProductoAdmin> => {
        const res = await api.post<ProductoAdmin>("/admin/configuracion/productos", datos);
        return res.data;
    },

    editarProducto: async (id: number, datos: ProductoRequest): Promise<ProductoAdmin> => {
        const res = await api.put<ProductoAdmin>(`/admin/configuracion/productos/${id}`, datos);
        return res.data;
    },

    // Unidades libres de TODOS los productos activos en un horario (se ofrezcan o no al reservar), con
    // el mismo cálculo que valida el stock al guardar. Con excluirReservaId, las unidades de esa
    // reserva o partido cuentan como libres (al editarla).
    disponibilidadProductos: async (
        fecha: string, horaInicio: string, horaFin: string, excluirReservaId?: number, signal?: AbortSignal,
    ): Promise<ProductoDisponible[]> => {
        const res = await api.get<ProductoDisponible[]>("/admin/configuracion/productos/disponibilidad", {
            params: sinVacios({ fecha, horaInicio, horaFin, excluirReservaId }),
            signal,
        });
        return res.data;
    },

    // Suma (reposición) o resta (rotura) unidades; 409 si quedaría negativo
    ajustarStock: async (id: number, ajuste: number): Promise<ProductoAdmin> => {
        const res = await api.patch<ProductoAdmin>(`/admin/configuracion/productos/${id}/stock`, { ajuste });
        return res.data;
    },

    // Baja lógica (activo = false): deja de poder pedirse en reservas y ventas nuevas
    bajaProducto: async (id: number): Promise<ProductoAdmin> => {
        const res = await api.put<ProductoAdmin>(`/admin/configuracion/productos/${id}/baja`);
        return res.data;
    },

    // Borrado definitivo (un producto cargado mal): solo si nunca se usó en reservas ni ventas; si
    // se usó, el backend responde 409 y hay que darlo de baja
    eliminarProducto: async (id: number): Promise<void> => {
        await api.delete(`/admin/configuracion/productos/${id}`);
    },

    // Vuelve a estar disponible (activo = true), con sus datos de antes
    reactivarProducto: async (id: number): Promise<ProductoAdmin> => {
        const res = await api.put<ProductoAdmin>(`/admin/configuracion/productos/${id}/reactivacion`);
        return res.data;
    },
};
