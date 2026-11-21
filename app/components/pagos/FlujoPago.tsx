"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  Lock,
  Printer,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { pagarCuotas, type ErrorPago } from "@/app/actions/pagos";
import EstadoCuotaBadge from "@/app/components/pagos/EstadoCuotaBadge";
import MedioDePago, { type Medio } from "@/app/components/pagos/MedioDePago";
import {
  MONEDA,
  RUTA_ESTADO_CUENTA,
  SIMBOLO_MONEDA,
  TARJETAS_GUARDADAS,
  centavos,
  esVencida,
  estadoVista,
  fechaCorta,
  folioPago,
  formatMonto,
  horaDeIso,
  leerMonto,
  nuevaReferencia,
  tituloCuota,
  type Cuota,
  type PagoRegistrado,
} from "@/lib/estado-cuenta";
import { TARJETA_VACIA, ultimos4, validarTarjeta, type DatosTarjeta, type ErroresTarjeta } from "@/lib/tarjeta";

type Paso = "seleccion" | "revision" | "comprobante";

type Residente = {
  nombre: string;
  condominio: string;
  unidad: string;
  descripcion: string;
};

type Props = {
  /** Cuotas por pagar (pendientes o parciales), de la que vence primero a la última. */
  cuotas: Cuota[];
  saldoTotal: number;
  hoy: string;
  preseleccion: number[];
  residente: Residente;
};

/** Lo necesario para el comprobante: se guarda al confirmar porque las props se actualizan. */
type Comprobante = {
  pago: PagoRegistrado;
  cuotas: Map<number, Cuota>;
  saldoAnterior: number;
  monto: number;
  /** "Tarjeta de prueba · •••• 2026" */
  medio: string;
  referencia: string;
};

/** Errores que invalidan la selección: se vuelve al primer paso para corregirla. */
const ERRORES_DE_SELECCION = new Set(["CUOTA_YA_PAGADA", "CUOTA_INEXISTENTE", "MONTO_EXCEDE_DEUDA", "SOLICITUD_INVALIDA"]);

const PASOS: { id: Paso; texto: string }[] = [
  { id: "seleccion", texto: "Seleccionar cuotas" },
  { id: "revision", texto: "Revisar y confirmar" },
  { id: "comprobante", texto: "Comprobante" },
];

const ENCABEZADOS: Record<Paso, { antetitulo: string; titulo: string; texto: string }> = {
  seleccion: {
    antetitulo: "Cuotas y pagos",
    titulo: "Realizar un pago",
    texto: "Elige las cuotas que deseas cubrir. Podrás revisar el detalle antes de confirmar.",
  },
  revision: {
    antetitulo: "Antes de continuar",
    titulo: "Revisa tu pago",
    texto: "Comprueba las cuotas, el medio de pago y el importe. Aún no se ha enviado nada.",
  },
  comprobante: {
    antetitulo: "Tu tranquilidad, al día",
    titulo: "Pago confirmado",
    texto: "Tu pago de ejemplo se registró correctamente. Aquí tienes el resumen y tu nuevo saldo.",
  },
};

const tarjeta = "rounded-xl border border-border bg-surface";
const botonPrimario =
  "inline-flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function FlujoPago({ cuotas, saldoTotal, hoy, preseleccion, residente }: Props) {
  const [paso, setPaso] = useState<Paso>("seleccion");
  const [seleccion, setSeleccion] = useState<number[]>(preseleccion);
  const [montoTexto, setMontoTexto] = useState("");
  const [montoManual, setMontoManual] = useState(false);
  const [medio, setMedio] = useState<Medio>({ tipo: "guardada", ultimos4: TARJETAS_GUARDADAS[0].ultimos4 });
  // Tarjeta de un solo uso: vive solo en el navegador y se borra al terminar el pago.
  const [tarjetaUnica, setTarjetaUnica] = useState<DatosTarjeta>(TARJETA_VACIA);
  const [erroresTarjeta, setErroresTarjeta] = useState<ErroresTarjeta>({});
  const [referencia, setReferencia] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<ErrorPago | null>(null);
  const [errorPaso1, setErrorPaso1] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const [enviando, startTransition] = useTransition();
  // Evita un segundo envío aunque el doble clic llegue antes de que React deshabilite el botón.
  const enviandoRef = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primerRender = useRef(true);

  // Al cambiar de paso se lleva la vista y el foco al título, para teclado y lectores de pantalla.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    tituloRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    tituloRef.current?.focus({ preventScroll: true });
  }, [paso]);

  // Las props se actualizan tras cada intento (se revalida la ruta): una cuota que ya no está
  // por pagar sale de la selección sola.
  const seleccionadas = cuotas.filter((c) => seleccion.includes(c.id));
  const totalSeleccion = centavos(seleccionadas.reduce((suma, c) => suma + c.saldo, 0));
  const monto = montoManual ? leerMonto(montoTexto) : totalSeleccion;
  const saldoDespues = centavos(saldoTotal - (monto ?? 0));
  const todas = cuotas.length > 0 && seleccionadas.length === cuotas.length;
  // Lo único que sale del navegador es el final del número de la tarjeta.
  const ultimosMedio = medio.tipo === "guardada" ? medio.ultimos4 : ultimos4(tarjetaUnica.numero);
  const descripcionMedio =
    medio.tipo === "guardada" ? `Tarjeta de prueba · •••• ${ultimosMedio}` : `Tarjeta •••• ${ultimosMedio} · pago único`;

  /** Valida la tarjeta de un solo uso; devuelve true si se puede usar. */
  function tarjetaValida() {
    if (medio.tipo === "guardada") return true;
    const errores = validarTarjeta(tarjetaUnica, hoy);
    setErroresTarjeta(errores);
    return Object.keys(errores).length === 0;
  }

  function cambiarMedio(nuevo: Medio) {
    setMedio(nuevo);
    setErroresTarjeta({});
    setErrorPaso1(null);
    setError(null);
  }

  function cambiarTarjeta(datos: DatosTarjeta) {
    setTarjetaUnica(datos);
    setErrorPaso1(null);
    setError(null);
    // Al corregir un campo se quita su aviso; el resto se revalida al continuar.
    setErroresTarjeta((actuales) => {
      const siguen = { ...actuales };
      for (const campo of Object.keys(siguen) as (keyof DatosTarjeta)[]) {
        if (datos[campo] !== tarjetaUnica[campo]) delete siguen[campo];
      }
      return siguen;
    });
  }

  function alternar(id: number) {
    setErrorPaso1(null);
    setSeleccion((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));
  }

  function continuar() {
    setError(null);
    if (seleccionadas.length === 0) return setErrorPaso1("Elige al menos una cuota para continuar.");
    if (monto === null || monto <= 0) {
      return setErrorPaso1(`Escribe un monto mayor a ${formatMonto(0)}, con hasta dos decimales.`);
    }
    if (monto > totalSeleccion) {
      return setErrorPaso1(
        `El monto (${formatMonto(monto)}) supera lo que debes en las cuotas elegidas (${formatMonto(totalSeleccion)}). ` +
          "Ajusta el monto: no se realizará ningún cobro.",
      );
    }
    if (!tarjetaValida()) return setErrorPaso1("Revisa los datos de la tarjeta.");
    setErrorPaso1(null);
    setConfirmado(false);
    // Una referencia por revisión: si el mismo pago se envía dos veces, la API no cobra dos veces.
    setReferencia(nuevaReferencia());
    setPaso("revision");
  }

  function confirmar() {
    if (enviandoRef.current || !confirmado || monto === null) return;
    // La tarjeta pudo editarse en la revisión (p. ej. tras un rechazo).
    if (!tarjetaValida()) return;
    enviandoRef.current = true;
    setError(null);

    const datos = {
      cuotaIds: seleccionadas.map((c) => c.id),
      monto,
      referencia,
      tarjetaUltimos4: ultimosMedio,
    };
    const instantanea = {
      cuotas: new Map(seleccionadas.map((c) => [c.id, c])),
      saldoAnterior: saldoTotal,
      medio: descripcionMedio,
    };

    startTransition(async () => {
      try {
        const resultado = await pagarCuotas(datos);
        if (resultado.ok) {
          setComprobante({ ...instantanea, pago: resultado.pago, monto, referencia });
          setSeleccion([]);
          setTarjetaUnica(TARJETA_VACIA);
          setMontoManual(false);
          setMontoTexto("");
          setPaso("comprobante");
        } else {
          setError(resultado.error);
          if (ERRORES_DE_SELECCION.has(resultado.error.codigo)) setPaso("seleccion");
        }
      } catch {
        setError({
          codigo: "SIN_CONEXION",
          titulo: "No hay conexión con el servidor",
          mensaje:
            "No sabemos si el pago llegó. Vuelve a intentarlo: si ya se había registrado, no se te cobrará dos veces.",
        });
      } finally {
        enviandoRef.current = false;
      }
    });
  }

  function otroPago() {
    setComprobante(null);
    setError(null);
    setPaso("seleccion");
  }

  const encabezado = ENCABEZADOS[paso];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">{encabezado.antetitulo}</p>
        <h1 ref={tituloRef} tabIndex={-1} className="mt-2 scroll-mt-6 font-serif text-4xl outline-none sm:text-[40px]">
          {encabezado.titulo}
        </h1>
        <p className="mt-2 text-sm text-secondary">{encabezado.texto}</p>
      </div>

      <Pasos actual={paso} />

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/5 px-5 py-4 text-sm">
          <CircleAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold">{error.titulo}</p>
            <p className="mt-1 text-secondary">{error.mensaje}</p>
          </div>
        </div>
      )}

      {paso === "seleccion" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="titulo-pendientes" className={`overflow-hidden ${tarjeta}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-6 pb-5 sm:px-6">
                <div>
                  <h2 id="titulo-pendientes" className="text-lg font-semibold">
                    Cuotas pendientes
                  </h2>
                  <p className="mt-1 text-xs text-secondary">Pendientes y vencidas · la que vence primero arriba</p>
                </div>
                <p className="text-xs text-secondary" aria-live="polite">
                  {seleccionadas.length} de {cuotas.length} seleccionadas
                </p>
              </div>

              {cuotas.length === 0 ? (
                <p className="border-t border-border px-6 py-10 text-center text-sm text-secondary">
                  No tienes cuotas por pagar. Estás al día.
                </p>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-3 bg-sand/30 px-4 py-3 text-[11px] font-semibold tracking-wide uppercase sm:px-6">
                    <input
                      type="checkbox"
                      checked={todas}
                      ref={(el) => {
                        if (el) el.indeterminate = seleccionadas.length > 0 && !todas;
                      }}
                      onChange={() => {
                        setErrorPaso1(null);
                        setSeleccion(todas ? [] : cuotas.map((c) => c.id));
                      }}
                      className="size-4 accent-primary"
                    />
                    <span className="flex-1">Seleccionar todas</span>
                    <span>Saldo ({MONEDA})</span>
                  </label>
                  <ul>
                    {cuotas.map((cuota) => {
                      const elegida = seleccion.includes(cuota.id);
                      return (
                        <li key={cuota.id} className="border-t border-border">
                          <label
                            className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors sm:px-6 ${
                              elegida ? "bg-sage/20" : "hover:bg-sand/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={elegida}
                              onChange={() => alternar(cuota.id)}
                              className="mt-1 size-4 shrink-0 accent-primary"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{tituloCuota(cuota)}</span>
                              <span className="mt-1 block text-xs text-muted">
                                Cuota #{cuota.id} · Vence {fechaCorta(cuota.fechaVencimiento)}
                              </span>
                              <span className="mt-2 block">
                                <EstadoCuotaBadge estado={estadoVista(cuota, hoy)} />
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block font-semibold">{formatMonto(cuota.saldo)}</span>
                              {cuota.saldo !== cuota.monto && (
                                <span className="block text-xs text-muted">de {formatMonto(cuota.monto)}</span>
                              )}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            <section aria-labelledby="titulo-medio" className={`p-4 sm:p-6 ${tarjeta}`}>
              <h2 id="titulo-medio" className="text-lg font-semibold">
                Medio de pago
              </h2>
              <MedioDePago
                medio={medio}
                onMedio={cambiarMedio}
                tarjeta={tarjetaUnica}
                onTarjeta={cambiarTarjeta}
                errores={erroresTarjeta}
                titular={residente.nombre}
              />
              <p className="mt-4 text-xs text-secondary">
                Este recorrido es una demostración: no se realiza ningún cargo real.
              </p>
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section aria-labelledby="titulo-resumen" className={`p-6 ${tarjeta}`}>
              <h2 id="titulo-resumen" className="text-lg font-semibold">
                Resumen del pago
              </h2>
              <p className="mt-2 text-xs text-secondary">
                {residente.condominio} · Unidad {residente.unidad}
              </p>
              <dl className="mt-5 flex flex-col gap-3 border-t border-border pt-5 text-sm">
                <Fila termino="Saldo pendiente actual" valor={formatMonto(saldoTotal)} />
                <Fila termino={`Cuotas seleccionadas (${seleccionadas.length})`} valor={formatMonto(totalSeleccion)} />
                <Fila termino="Comisión" valor={formatMonto(0)} />
              </dl>

              <div className="mt-5 border-t border-border pt-5">
                <label htmlFor="monto" className="text-sm text-secondary">
                  Total a pagar
                </label>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-3xl">{SIMBOLO_MONEDA}</span>
                  <input
                    id="monto"
                    inputMode="decimal"
                    autoComplete="off"
                    value={montoManual ? montoTexto : totalSeleccion.toFixed(2)}
                    onChange={(e) => {
                      setErrorPaso1(null);
                      setMontoManual(true);
                      setMontoTexto(e.target.value);
                    }}
                    aria-describedby="ayuda-monto"
                    className="w-full min-w-0 rounded-lg border border-sage bg-surface px-3 py-2 font-serif text-3xl outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                  <span className="text-[10px] font-semibold text-secondary">{MONEDA}</span>
                </div>
                <p id="ayuda-monto" className="mt-2 text-xs text-secondary">
                  Puedes pagar una parte: se aplica primero a la cuota que vence antes.
                  {montoManual && monto !== totalSeleccion && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => setMontoManual(false)}
                        className="font-semibold text-foreground underline underline-offset-4"
                      >
                        Pagar el total
                      </button>
                    </>
                  )}
                </p>
              </div>

              {monto !== null && monto > 0 && monto <= totalSeleccion && (
                <p className="mt-4 rounded-lg bg-sand/30 px-4 py-3 text-xs">
                  Tu saldo después del pago será de {formatMonto(saldoDespues)} {MONEDA}.
                </p>
              )}
              {errorPaso1 && (
                <p role="alert" className="mt-4 flex items-start gap-2 text-xs text-danger">
                  <CircleAlert size={16} aria-hidden="true" className="shrink-0" />
                  {errorPaso1}
                </p>
              )}

              <button type="button" onClick={continuar} disabled={cuotas.length === 0} className={`mt-5 ${botonPrimario}`}>
                <ArrowRight size={18} aria-hidden="true" />
                Continuar a revisión
              </button>
              <p className="mt-3 text-center text-[11px] text-muted">Aún no se enviará el pago.</p>
            </section>

            <p className="flex items-start gap-3 px-2 text-xs text-secondary">
              <ShieldCheck size={18} aria-hidden="true" className="shrink-0" />
              Tú eliges qué cubrir. El detalle y el total se mantienen visibles en cada paso.
            </p>
            <Link href={RUTA_ESTADO_CUENTA} className="px-2 text-sm font-semibold underline underline-offset-4">
              Volver al estado de cuenta
            </Link>
          </aside>
        </div>
      )}

      {paso === "revision" && monto !== null && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="titulo-destino" className={`p-4 sm:p-6 ${tarjeta}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titulo-destino" className="text-lg font-semibold">
                  Cuenta de destino
                </h2>
                <span className="rounded-full bg-sage/30 px-3 py-1 text-xs font-semibold">Datos de tu cuenta</span>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-secondary">Residente</dt>
                  <dd className="mt-1">{residente.nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Condominio</dt>
                  <dd className="mt-1">{residente.condominio}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Unidad</dt>
                  <dd className="mt-1">{residente.descripcion}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="titulo-cubrir" className={`p-4 sm:p-6 ${tarjeta}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titulo-cubrir" className="text-lg font-semibold">
                  Cuotas a cubrir
                </h2>
                <button
                  type="button"
                  onClick={() => setPaso("seleccion")}
                  disabled={enviando}
                  className="text-xs font-semibold underline underline-offset-4 disabled:opacity-50"
                >
                  Editar selección
                </button>
              </div>
              <ul className="mt-2">
                {seleccionadas.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-4 border-b border-border py-4 text-sm">
                    <span>
                      <span className="block font-medium">{tituloCuota(c)}</span>
                      <span className="mt-1 block text-xs text-muted">
                        Cuota #{c.id} · Vence {fechaCorta(c.fechaVencimiento)}
                        {esVencida(c, hoy) && " · vencida"}
                      </span>
                    </span>
                    <span className="font-semibold">{formatMonto(c.saldo)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between gap-4 pt-4 text-sm text-secondary">
                <span>Subtotal · {plural(seleccionadas.length, "cuota", "cuotas")}</span>
                <span className="text-foreground">{formatMonto(totalSeleccion)} {MONEDA}</span>
              </p>
              {monto < totalSeleccion && (
                <p className="mt-3 rounded-lg bg-sand/30 px-4 py-3 text-xs">
                  Pagarás {formatMonto(monto)} de {formatMonto(totalSeleccion)}. Se aplica primero a la cuota que
                  vence antes; la que no se cubra por completo quedará con pago parcial.
                </p>
              )}
            </section>

            <section aria-labelledby="titulo-medio-rev" className={`p-4 sm:p-6 ${tarjeta}`}>
              <h2 id="titulo-medio-rev" className="text-lg font-semibold">
                Medio de pago
              </h2>
              <MedioDePago
                medio={medio}
                onMedio={cambiarMedio}
                tarjeta={tarjetaUnica}
                onTarjeta={cambiarTarjeta}
                errores={erroresTarjeta}
                titular={residente.nombre}
                deshabilitado={enviando}
              />
            </section>

            <div className="flex items-start gap-3 rounded-xl border border-sand bg-surface px-5 py-4 text-sm">
              <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Estás en un recorrido de demostración</p>
                <p className="mt-1 text-xs text-secondary">
                  Al confirmar se generará un comprobante de ejemplo. No se moverá dinero ni se afectará una
                  cuenta real.
                </p>
              </div>
            </div>
          </div>

          <aside className={`p-6 ${tarjeta}`}>
            <h2 className="text-lg font-semibold">Todo listo para confirmar</h2>
            <dl className="mt-5 flex flex-col gap-3 text-sm">
              <Fila termino={`Cuotas seleccionadas (${seleccionadas.length})`} valor={formatMonto(totalSeleccion)} />
              <Fila termino="Comisión" valor={formatMonto(0)} />
            </dl>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm text-secondary">Total a pagar · {MONEDA}</p>
              <p className="mt-2 font-serif text-4xl">{formatMonto(monto)}</p>
            </div>
            <dl className="mt-5 flex flex-col gap-3 text-sm">
              <Fila termino="Saldo actual" valor={formatMonto(saldoTotal)} />
              <Fila termino="Saldo después del pago" valor={formatMonto(saldoDespues)} />
            </dl>

            <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-border pt-5 text-xs">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                disabled={enviando}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              He revisado los datos y confirmo el pago de ejemplo por {formatMonto(monto)} {MONEDA}.
            </label>

            <button
              type="button"
              onClick={confirmar}
              disabled={!confirmado || enviando}
              aria-disabled={!confirmado || enviando}
              className={`mt-5 ${botonPrimario}`}
            >
              {enviando ? (
                <>
                  <LoaderCircle size={18} aria-hidden="true" className="animate-spin" />
                  Enviando pago…
                </>
              ) : (
                <>
                  <Lock size={18} aria-hidden="true" />
                  {error ? "Reintentar pago" : "Confirmar pago de ejemplo"}
                </>
              )}
            </button>
            <p aria-live="polite" className="mt-3 text-center text-[11px] text-muted">
              {enviando
                ? "La pasarela de prueba tarda unos segundos. Espera la confirmación sin cerrar esta ventana."
                : `Pagarás con ${descripcionMedio}.`}
            </p>
            <button
              type="button"
              onClick={() => setPaso("seleccion")}
              disabled={enviando}
              className="mt-4 w-full text-center text-xs font-semibold underline underline-offset-4 disabled:opacity-50"
            >
              Volver a selección
            </button>
          </aside>
        </div>
      )}

      {paso === "comprobante" && comprobante && (
        <PasoComprobante comprobante={comprobante} cuotasRestantes={cuotas} hoy={hoy} residente={residente} onOtroPago={otroPago} />
      )}
    </div>
  );
}

function Fila({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-secondary">{termino}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Pasos({ actual }: { actual: Paso }) {
  const indiceActual = PASOS.findIndex((p) => p.id === actual);
  return (
    <ol className={`grid gap-3 p-4 sm:grid-cols-3 sm:p-6 ${tarjeta}`} aria-label="Pasos del pago">
      {PASOS.map((p, i) => {
        const hecho = i < indiceActual;
        const activo = i === indiceActual;
        return (
          <li key={p.id} aria-current={activo ? "step" : undefined} className="flex items-center gap-3 text-sm">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                hecho || activo ? "bg-primary text-primary-foreground" : "bg-sand/40 text-secondary"
              }`}
            >
              {hecho ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            <span className={activo ? "font-semibold" : "text-secondary"}>
              {p.texto}
              {hecho && <span className="sr-only"> (completado)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PasoComprobante({
  comprobante,
  cuotasRestantes,
  hoy,
  residente,
  onOtroPago,
}: {
  comprobante: Comprobante;
  /** Cuotas por pagar ya actualizadas tras el pago. */
  cuotasRestantes: Cuota[];
  hoy: string;
  residente: Residente;
  onOtroPago: () => void;
}) {
  const { pago, cuotas, saldoAnterior, monto, medio, referencia } = comprobante;
  const aplicadas = pago.aplicado.filter((a) => a.montoAplicado > 0);
  const cubiertas = aplicadas.filter((a) => a.estadoResultante === "PAGADA").length;
  const vencidasRestantes = cuotasRestantes.filter((c) => esVencida(c, hoy)).length;
  const primerNombre = residente.nombre.split(" ")[0];

  return (
    <>
      <div role="status" className="flex flex-wrap items-center gap-4 rounded-xl border border-sage bg-sage/20 px-5 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            Gracias, {primerNombre}.{" "}
            {cubiertas === aplicadas.length
              ? `${cubiertas === 1 ? "Tu cuota quedó cubierta" : `Tus ${cubiertas} cuotas quedaron cubiertas`}.`
              : `Tu pago se aplicó a ${plural(aplicadas.length, "cuota", "cuotas")}.`}
          </p>
          <p className="mt-1 text-sm text-secondary">
            Pago de {formatMonto(monto)} {MONEDA} · {fechaCorta(pago.fechaPago)}, {horaDeIso(pago.fechaPago)}
          </p>
        </div>
        <span className="text-xs font-semibold">Pago de ejemplo · Exitoso</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="titulo-comprobante" className={`p-4 sm:p-6 ${tarjeta}`}>
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
                Comprobante de ejemplo
              </p>
              <h2 id="titulo-comprobante" className="mt-2 font-serif text-3xl break-all">
                {folioPago(pago)}
              </h2>
            </div>
            <ReceiptText size={28} aria-hidden="true" className="shrink-0 text-secondary" />
          </div>

          <div className="flex flex-wrap justify-between gap-4 py-5 text-sm">
            <div>
              <p className="font-semibold">{residente.nombre}</p>
              <p className="mt-1 text-xs text-secondary">
                {residente.condominio} · {residente.descripcion}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-secondary">Fecha de registro</p>
              <p className="mt-1">
                {fechaCorta(pago.fechaPago)} · {horaDeIso(pago.fechaPago)}
              </p>
            </div>
          </div>

          <h3 className="text-xs font-semibold tracking-wide uppercase">Cuotas cubiertas</h3>
          <ul>
            {aplicadas.map((a) => {
              const cuota = cuotas.get(a.cuotaId);
              return (
                <li key={a.cuotaId} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 text-sm">
                  <span>
                    <span className="block font-medium">{cuota ? tituloCuota(cuota) : `Cuota #${a.cuotaId}`}</span>
                    <span className="mt-1 block text-xs text-muted">Cuota #{a.cuotaId}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <EstadoCuotaBadge estado={a.estadoResultante === "PAGADA" ? "pagada" : "parcial"} />
                    <span className="font-semibold">{formatMonto(a.montoAplicado)}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <dl className="flex flex-col gap-3 py-5 text-sm">
            <Fila termino="Subtotal" valor={formatMonto(monto)} />
            <Fila termino="Comisión" valor={formatMonto(0)} />
          </dl>
          <p className="flex flex-wrap items-baseline justify-between gap-3 rounded-lg bg-sage/20 px-5 py-4">
            <span className="text-sm">Total pagado</span>
            <span className="font-serif text-2xl">{formatMonto(monto)} {MONEDA}</span>
          </p>

          <dl className="mt-5 grid gap-4 border-b border-border pb-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-secondary">Medio de pago</dt>
              <dd className="mt-1">{medio}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Referencia de operación</dt>
              <dd className="mt-1 break-all">{referencia}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-3 rounded-lg border border-sage px-5 py-3 text-sm font-semibold transition-colors hover:bg-sand/30"
            >
              <Printer size={18} aria-hidden="true" />
              Imprimir comprobante
            </button>
            <p className="max-w-sm text-[11px] text-muted">
              Documento de demostración sin validez fiscal ni bancaria. No acredita un cobro real.
            </p>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl bg-primary p-6 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm">Saldo pendiente actualizado</h2>
              <Wallet size={20} aria-hidden="true" className="text-sand" />
            </div>
            <p className="mt-4 flex flex-wrap items-baseline gap-2">
              <span className="font-serif text-4xl">{formatMonto(pago.saldoRestante)}</span>
              <span className="text-[10px] font-semibold text-primary-foreground/70">{MONEDA}</span>
            </p>
            <p className="mt-4 text-xs text-sand">
              {vencidasRestantes === 0
                ? "Sin cuotas vencidas"
                : plural(vencidasRestantes, "cuota vencida", "cuotas vencidas")}
            </p>
            <p className="mt-3 text-[11px] text-primary-foreground/70">
              {residente.condominio} · Unidad {residente.unidad}
            </p>
          </section>

          <section className={`p-6 ${tarjeta}`}>
            <h2 className="text-lg font-semibold">Así queda tu cuenta</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Fila termino="Saldo anterior" valor={formatMonto(saldoAnterior)} />
              <Fila termino="Pago aplicado" valor={`− ${formatMonto(monto)}`} />
            </dl>
            <dl className="mt-4 border-t border-border pt-4 text-sm">
              <Fila termino="Saldo restante" valor={formatMonto(pago.saldoRestante)} />
            </dl>
            {cuotasRestantes.slice(0, 3).map((c) => (
              <div key={c.id} className="mt-4 rounded-lg bg-sand/30 px-4 py-3 text-sm">
                <EstadoCuotaBadge estado={estadoVista(c, hoy)} />
                <p className="mt-2 font-medium">{tituloCuota(c)}</p>
                <p className="mt-1 text-xs text-secondary">
                  Saldo {formatMonto(c.saldo)} · Vence el {fechaCorta(c.fechaVencimiento)}
                </p>
              </div>
            ))}
            {cuotasRestantes.length > 3 && (
              <p className="mt-3 text-xs text-secondary">
                Y {plural(cuotasRestantes.length - 3, "cuota más", "cuotas más")} por pagar.
              </p>
            )}
            <Link href={RUTA_ESTADO_CUENTA} className={`mt-5 ${botonPrimario}`}>
              <ArrowRight size={18} aria-hidden="true" />
              Ver estado de cuenta
            </Link>
            {cuotasRestantes.length > 0 && (
              <button
                type="button"
                onClick={onOtroPago}
                className="mt-3 w-full text-center text-xs font-semibold underline underline-offset-4"
              >
                Hacer otro pago
              </button>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
