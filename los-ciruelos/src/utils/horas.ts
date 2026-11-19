/** "00:00" a "23:30", de media en media hora */
export const HORAS_MEDIA_HORA = Array.from({ length: 48 }, (_, i) =>
    `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
