// Datos del condominio que gestiona esta instalación del frontend.
export const CONDOMINIO = {
  /** NEXT_PUBLIC_CONDOMINIO. Se incrusta al compilar: cambiarlo exige reiniciar `npm run dev` o reconstruir. */
  nombre: process.env.NEXT_PUBLIC_CONDOMINIO?.trim() || "Condominio",
  /** Zona horaria en la que se interpretan y muestran las fechas (UTC-06:00). */
  zonaHoraria: "America/El_Salvador",
};

/** Fecha de hoy ("YYYY-MM-DD") en la zona horaria del condominio. */
export function hoyEnCondominio() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CONDOMINIO.zonaHoraria }).format(new Date());
}

/** Hora actual ("HH:mm") en la zona horaria del condominio. */
export function horaEnCondominio(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CONDOMINIO.zonaHoraria,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ahora);
}

/** Fecha y hora local del condominio a ISO 8601 con desfase: "2026-11-14T10:00:00-06:00". */
export function aIsoCondominio(fecha: string, hora: string) {
  const instante = new Date(`${fecha}T${hora}:00Z`);
  const nombre =
    new Intl.DateTimeFormat("en-US", {
      timeZone: CONDOMINIO.zonaHoraria,
      timeZoneName: "longOffset",
    })
      .formatToParts(instante)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const desfase = nombre === "GMT" ? "+00:00" : nombre.replace("GMT", "");
  return `${fecha}T${hora}:00${desfase}`;
}

/** "05 nov 2026, 11:10 h" en la hora local del condominio. */
export function marcaHoraCondominio(ahora = new Date()) {
  const fecha = new Intl.DateTimeFormat("es", {
    timeZone: CONDOMINIO.zonaHoraria,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(ahora)
    .replace(".", "");
  return `${fecha}, ${horaEnCondominio(ahora)} h`;
}
