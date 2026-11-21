import type { Metadata } from "next";
import { Aviso, SesionVencida } from "@/app/components/pagos/Aviso";
import ErrorCarga from "@/app/components/pagos/ErrorCarga";
import HistorialPagos from "@/app/components/pagos/HistorialPagos";
import ResumenSaldo from "@/app/components/pagos/ResumenSaldo";
import SelectorUrl from "@/app/components/pagos/SelectorUrl";
import TablaCuotas, { type VistaCuotas } from "@/app/components/pagos/TablaCuotas";
import { CONDOMINIO, hoyEnCondominio } from "@/lib/condominio";
import { getCurrentUser, type Unidad } from "@/lib/current-user";
import {
  MONEDA,
  RUTA_ESTADO_CUENTA,
  anioDe,
  cuotasPorPagar,
  fechaCorta,
  resumenCuenta,
} from "@/lib/estado-cuenta";
import { MENSAJES_ERROR_CARGA, cargarEstadoCuenta, listarUnidades } from "@/lib/pagos-api";

export const metadata: Metadata = {
  title: "Estado de cuenta",
};

const TAMANO_PAGINA = 10;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function paginar<T>(items: T[], paginaParam: string | undefined) {
  const totalPaginas = Math.max(1, Math.ceil(items.length / TAMANO_PAGINA));
  const pagina = Math.min(Math.max(1, Number(paginaParam) || 1), totalPaginas);
  return {
    visibles: items.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA),
    pagina,
    totalPaginas,
  };
}

export default async function EstadoDeCuentaPage(props: PageProps<"/estado-de-cuenta">) {
  const searchParams = await props.searchParams;
  const usuario = await getCurrentUser();
  const esAdmin = usuario?.role === "ADMINISTRADOR";
  const esResidente = usuario?.role === "RESIDENTE";

  // El residente consulta su unidad; el administrador elige cualquiera.
  let unidad: Unidad | null = null;
  let unidades: Unidad[] = [];
  let errorUnidades = false;
  if (esResidente) {
    unidad = usuario?.unit ?? null;
  } else if (esAdmin) {
    try {
      unidades = ((await listarUnidades()) ?? []).sort((a, b) => a.code.localeCompare(b.code, "es"));
    } catch (error) {
      errorUnidades = true;
      console.error("Error al listar unidades:", error);
    }
    unidad = unidades.find((u) => u.id === first(searchParams.unidad)) ?? null;
  }

  const carga = unidad ? await cargarEstadoCuenta(unidad.id) : null;

  const hoy = hoyEnCondominio();
  const generadoEl = new Intl.DateTimeFormat("es", {
    timeZone: CONDOMINIO.zonaHoraria,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  function href(cambios: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries({ ...searchParams, ...cambios })) {
      const v = Array.isArray(valor) ? valor[0] : valor;
      // La página 1 es el valor por defecto: no hace falta en la URL.
      const paginaUno = (clave === "pc" || clave === "pp") && String(v) === "1";
      if (v !== undefined && v !== "" && !paginaUno) {
        params.set(clave, String(v));
      }
    }
    const qs = params.toString();
    return `${RUTA_ESTADO_CUENTA}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 text-foreground">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">
            {esAdmin ? "Administración financiera" : "Tu cuenta, en orden"}
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-[40px]">Estado de cuenta</h1>
          <p className="mt-2 text-sm text-secondary">
            {esAdmin
              ? `Consulta las cuotas y los pagos de cada unidad de ${CONDOMINIO.nombre}.`
              : `Consulta tus cuotas y movimientos de ${CONDOMINIO.nombre}${unidad ? ` · Unidad ${unidad.code}` : ""}.`}
          </p>
        </div>
        {esAdmin && unidades.length > 0 && (
          <SelectorUrl
            parametro="unidad"
            etiqueta="Unidad"
            valor={unidad?.id ?? ""}
            reiniciar={["pc", "pp", "anio", "ver"]}
            opciones={[
              { valor: "", texto: "Elige una unidad" },
              ...unidades.map((u) => ({ valor: u.id, texto: `${u.code} · ${u.tower}` })),
            ]}
            className="w-full sm:w-64"
          />
        )}
      </div>

      {!usuario ? (
        <SesionVencida />
      ) : !esResidente && !esAdmin ? (
        <Aviso>El estado de cuenta solo está disponible para residentes y la administración.</Aviso>
      ) : esResidente && !unidad ? (
        <Aviso>Tu cuenta no tiene una unidad asignada. Contacta a la administración.</Aviso>
      ) : esAdmin && errorUnidades ? (
        <ErrorCarga mensaje="No se pudo cargar la lista de unidades." />
      ) : esAdmin && !unidad ? (
        <Aviso>Elige una unidad para ver su saldo, sus cuotas y sus pagos.</Aviso>
      ) : carga?.error === "sesion" ? (
        <SesionVencida />
      ) : carga?.error === "general" ? (
        <ErrorCarga mensaje={MENSAJES_ERROR_CARGA.general} />
      ) : carga?.error ? (
        <Aviso>{MENSAJES_ERROR_CARGA[carga.error]}</Aviso>
      ) : carga?.estado ? (
        (() => {
          const estado = carga.estado;
          const vista: VistaCuotas = first(searchParams.ver) === "todas" ? "todas" : "por-pagar";
          const porPagar = cuotasPorPagar(estado.cuotas);
          // Por pagar: la que vence primero arriba. Todas: el orden de la API (más reciente primero).
          const cuotas = vista === "todas" ? estado.cuotas : porPagar;
          const pagCuotas = paginar(cuotas, first(searchParams.pc));

          const anios = [...new Set(estado.pagos.map((p) => anioDe(p.fechaPago)))].sort().reverse();
          const anio = anios.find((a) => a === first(searchParams.anio)) ?? "";
          const pagos = anio ? estado.pagos.filter((p) => anioDe(p.fechaPago) === anio) : estado.pagos;
          const pagPagos = paginar(pagos, first(searchParams.pp));

          return (
            <>
              <ResumenSaldo resumen={resumenCuenta(estado, hoy)} />
              <TablaCuotas
                cuotas={pagCuotas.visibles}
                total={cuotas.length}
                vista={vista}
                hoy={hoy}
                puedePagar={esResidente}
                hayPorPagar={porPagar.length > 0}
                pagina={pagCuotas.pagina}
                totalPaginas={pagCuotas.totalPaginas}
                tamano={TAMANO_PAGINA}
                hrefVista={(v) => href({ ver: v === "todas" ? "todas" : undefined, pc: undefined })}
                hrefPagina={(n) => href({ pc: n })}
              />
              <HistorialPagos
                pagos={pagPagos.visibles}
                cuotasPorId={new Map(estado.cuotas.map((c) => [c.id, c]))}
                total={pagos.length}
                anio={anio}
                anios={anios}
                pagina={pagPagos.pagina}
                totalPaginas={pagPagos.totalPaginas}
                tamano={TAMANO_PAGINA}
                hrefPagina={(n) => href({ pp: n })}
              />
              <p className="text-[11px] text-muted">
                Información al {fechaCorta(hoy)}, {generadoEl} h · Todos los importes están expresados en{" "}
                {MONEDA}.
              </p>
            </>
          );
        })()
      ) : null}
    </div>
  );
}
