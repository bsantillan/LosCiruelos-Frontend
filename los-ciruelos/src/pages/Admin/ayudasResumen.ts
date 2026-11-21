/*
 * Qué representa cada tarjeta y cada gráfico del Resumen y de la Caja, en palabras simples, para
 * alguien que no sabe de números: se ven al pasar el mouse por el icono (i). No explican cómo se
 * calcula, sino qué te dice esa cifra.
 */

/** Tarjetas de cifras, por su etiqueta (la misma etiqueta quiere decir lo mismo en todas las pestañas) */
export const AYUDA_KPI: Record<string, string> = {
    // Resumen: lo de todos los días
    "Saldo de caja": "La plata que le quedó al club en el período: todo lo que se cobró (efectivo, Mercado Pago, Cuenta DNI) menos lo que se les devolvió a los clientes.",
    "Por cobrar": "Lo que los clientes todavía tienen que pagar: lo que deben de turnos ya jugados más el saldo de los turnos que faltan jugar.",
    "Reservas": "Cuántos turnos hubo en el período: los que ya se jugaron, los que faltan y los que se cancelaron.",
    "Ventas": "Cuántas ventas sueltas se hicieron: bebidas, pelotas y otros productos vendidos en el mostrador, sin una reserva.",
    "Efectivo": "Lo que se cobró en billetes en el período.",
    "Mercado Pago": "Lo que se cobró por Mercado Pago (desde la web, con el QR de la caja, por transferencia o con tarjeta en su posnet). No pasa por la caja: entra a la cuenta del club.",
    "Cuenta DNI": "Lo que se cobró con Cuenta DNI. No pasa por la caja: entra a la cuenta del club.",
    "Tarjeta": "Lo que se cobró con tarjeta en otro posnet (Clover u otro). No pasa por la caja: entra al banco del posnet. La tarjeta en el posnet de Mercado Pago va en Mercado Pago.",
    "Devoluciones": "La plata que se les devolvió a los clientes en el período (por cancelaciones o productos devueltos).",
    "Deuda": "Lo que quedó debiendo la gente de los turnos que ya se jugaron. Se cobra desde Reservas.",
    "Turnos": "Cuántos turnos hay en este grupo.",
    "Total": "Lo que suman todos estos turnos, cobrado o no.",
    "Cobrado": "La parte que ya se cobró.",
    "Bonificado": "Lo que el club decidió no cobrar (por ejemplo, a un socio o en un torneo). No es plata que entró.",
    "A cobrar el día del turno": "Lo que falta cobrar de los turnos que todavía no se jugaron. Normalmente se cobra cuando vienen a jugar.",
    "Total reservado": "Lo que suman los turnos que faltan jugar.",
    "Cobrado por adelantado": "Lo que ya pagaron (señas o pagos completos) de turnos que todavía no se jugaron.",
    "Devuelto": "La plata que se les devolvió a los clientes.",

    // Métricas: cómo va el club
    "Ingresos": "Todo lo que facturó el club en el período: el alquiler de las canchas, los productos que se sumaron a las reservas y las ventas sueltas. La flecha te dice si fue más o menos que en el período anterior del mismo largo.",
    "Ocupación": "Qué parte del tiempo en que el club estuvo abierto las canchas estuvieron reservadas. Un 50 % quiere decir que se usó la mitad de las horas disponibles.",
    "Ticket promedio": "Cuánto deja, en promedio, cada reserva: la cancha más los productos que se agregaron.",
    "Clientes activos": "Cuántas personas distintas jugaron al menos una vez en el período.",
    "Cancelaciones": "De cada 100 reservas, cuántas se cancelaron. Cuanto más baja, mejor.",
    "Asegurado": "Plata que ya cobraste de turnos que todavía no se jugaron (señas y pagos por adelantado).",
    "Deuda de turnos jugados": "Turnos que ya se jugaron y no se terminaron de pagar: es plata que te deben hoy.",

    // Ocupación
    "Horas ocupadas": "Cuántas horas estuvieron reservadas las canchas en el período, sumando todas las canchas.",
    "Horas abiertas": "Cuántas horas se podían reservar: las horas que abrió el club por la cantidad de canchas.",

    // Ingresos
    "Cancha": "Lo que se facturó por el alquiler de las canchas.",
    "Productos en reservas": "Lo que se facturó por productos sumados a las reservas: pelotas, alquiler de paletas, bebidas.",
    "Ventas sueltas": "Lo vendido en el mostrador sin una reserva, descontando lo que se devolvió.",
    "Online": "Lo que los clientes pagaron solos desde la web, con Mercado Pago.",
    "En el club": "Lo que se cobró en el club: efectivo, QR de la caja, transferencia, tarjeta o Cuenta DNI.",
    "Por hora ocupada": "Cuánto deja, en promedio, cada hora de cancha reservada. Si sube, estás sacando más por cada hora.",

    // Clientes
    "Activos": "Cuántas personas distintas jugaron al menos una vez en el período.",
    "Nuevos": "Clientes que jugaron por primera vez en el período.",
    "Recurrentes": "Clientes que ya habían jugado antes y volvieron en el período.",
    "Frecuencia": "Cuántas veces jugó, en promedio, cada cliente en el período.",

    // Reservas y cancelaciones
    "Creadas": "Cuántas reservas se hicieron en el período, contadas por el día en que se reservaron (no por el día del turno).",
    "Anticipación promedio": "Con cuánto tiempo de anticipación reservan, en promedio. Si es poco, la gente decide a último momento.",
    "Desde la web": "Cuántas reservas hicieron los clientes solos desde la web, y cuántas cargó el personal del club.",
    "Tasa": "De cada 100 reservas, cuántas se cancelaron. Cuanto más baja, mejor.",
    "Canceladas": "Cuántas reservas se cancelaron, y si canceló el cliente o el club.",
    "El club retuvo": "Plata que habían pagado reservas canceladas y que el club no devolvió (porque se canceló tarde).",
    "Vencidas sin pagar": "Reservas que alguien empezó desde la web pero no pagó a tiempo: se liberaron solas.",

    // Deuda
    "Hasta 7 días": "Lo que deben de turnos jugados en la última semana: suele ser fácil de cobrar.",
    "8 a 30 días": "Lo que deben de turnos jugados hace entre una semana y un mes.",
    "Más de 30 días": "Lo que deben de turnos jugados hace más de un mes: es lo más difícil de cobrar.",

    // Productos
    "Unidades": "Cuántas unidades alquiladas (por ejemplo, paletas) no volvieron: se rompieron o se perdieron.",
    "Se cobró de alquiler": "Lo que se cobró por alquilar esas unidades. No es lo que cuesta reponerlas.",
    "Sin registrar la devolución": "Turnos ya terminados en los que nadie anotó si volvió lo alquilado. Conviene revisarlos.",

    // Caja de la jornada (EMPLEADO)
    "Efectivo en la caja": "Los billetes que tendría que haber en la caja ahora: lo cobrado en efectivo menos lo devuelto en efectivo. Contalos al cerrar y fijate que coincida.",
    "Para entregar": "Devoluciones que quedaron pendientes: hay que darle esa plata al cliente. Están en Reservas.",
};

/** Tarjetas con la misma etiqueta pero otro sentido en una pestaña */
export const AYUDA_DEUDA_TOTAL = "Todo lo que te deben hoy por turnos que ya se jugaron.";
export const AYUDA_INGRESOS_TOTAL = AYUDA_KPI["Ingresos"];

/** Secciones y gráficos, por su título */
export const AYUDA_SECCION: Record<string, string> = {
    "Cómo va el club": "Las cifras principales del período elegido arriba a la derecha. Debajo de cada una ves si subió o bajó respecto del período anterior del mismo largo (por ejemplo, este mes contra el mes pasado): en verde si mejoró, en rojo si empeoró.",
    "Turnos jugados": "Los turnos del período que ya se jugaron: cuánto sumaban, cuánto se cobró y cuánto quedó debiendo la gente.",
    "Turnos por jugar": "Los turnos del período que todavía no se jugaron: cuánto pagaron por adelantado y cuánto falta cobrar.",
    "Lo que viene": "Lo que ya está reservado para los próximos días. Siempre mira desde hoy, sin importar el período elegido.",
    "Ocupación": "Qué tanto se usaron las canchas en el período elegido arriba a la derecha. Si elegís un mes, ves ese mes; si elegís un día, solo ese día.",
    "Día y hora": "Cada fila es un día de la semana y cada columna una hora. El número es qué tan reservadas estuvieron las canchas ese día a esa hora, en el período elegido (por ejemplo, si elegís noviembre, la celda Lun 19 junta todos los lunes de noviembre a las 19). Cuanto más verde, más se pide ese horario. Los horarios oscuros casi no se usan: sirven para promociones. Los rayados son horarios en que el club está cerrado.",
    "Por franja": "Divide el día en mañana, tarde y noche: qué tan llena está cada parte del día y cuánto deja, en promedio, cada hora de cancha reservada en esa franja. Ayuda a decidir si conviene cobrar distinto según la hora.",
    "Por cancha": "Qué tanto se usó cada cancha y cuánto facturó su alquiler en el período. Sirve para ver si alguna se usa menos que las otras.",
    "Próximos 7 días": "Cómo vienen reservados los próximos 7 días, desde hoy. No depende del período elegido.",
    "Ingresos": "Cuánto facturó el club en el período y de dónde salió esa plata.",
    "De dónde viene": "Qué parte de lo facturado aporta el alquiler de canchas, los productos de las reservas y las ventas del mostrador.",
    "Cómo se cobró": "Cuánto pagan los clientes solos por la web y cuánto se cobra en el club.",
    "Rendimiento": "Cuánto deja cada reserva y cada hora de cancha. Si suben, estás sacando más de lo mismo.",
    "Clientes": "Cuánta gente juega, cuánta es nueva y cuánta vuelve.",
    "Dejaron de venir": "Clientes que venían seguido y hace más de un mes que no reservan. Escribirles puede ayudar a que vuelvan.",
    "Los que más juegan": "Los 10 clientes con más reservas en el período.",
    "Los que más gastan": "Los 10 clientes que más gastaron en el período, sumando canchas y productos.",
    "Cómo se reserva": "Cuántas reservas se hicieron, con cuánto tiempo de anticipación y quién las cargó.",
    "Con cuánta anticipación": "Cuántas reservas se hicieron el mismo día del turno, con uno o dos días, con una semana o con más tiempo.",
    "Duración y tipo": "Cuánto duran los turnos que más se eligen, y cuántos son reservas comunes, partidos o turnos fijos.",
    "Cancelaciones": "Cuántas reservas se cancelaron, quién las canceló y con cuánta anticipación. Las de último momento son las que más cuestan, porque es difícil volver a ocupar la cancha.",
    "Deuda": "Lo que te deben hoy de turnos ya jugados, separado por cuánto hace que se jugaron.",
    "Quién debe": "Los clientes que deben, de mayor a menor deuda, con su celular para contactarlos.",
    "Más vendidos": "Los productos que más se vendieron, en el mostrador y en las reservas.",
    "Alquilados": "Cuántas veces se alquiló cada producto (por ejemplo, paletas) en las reservas.",
    "Alquileres que no volvieron": "Productos alquilados que no se devolvieron (rotos o perdidos), y turnos en los que nadie anotó la devolución.",
    "Stock bajo": "Productos que se están por terminar (5 unidades o menos): conviene reponerlos.",
    "Movimientos": "Cada cobro, venta, devolución y anulación de la jornada, con la hora y quién lo hizo. Sirve para encontrar una diferencia al contar la caja.",
};
