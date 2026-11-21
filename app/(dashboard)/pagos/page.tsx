import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, SesionVencida } from "@/app/components/pagos/Aviso";
import ErrorCarga from "@/app/components/pagos/ErrorCarga";
import FlujoPago from "@/app/components/pagos/FlujoPago";
import { CONDOMINIO, hoyEnCondominio } from "@/lib/condominio";
import { getCurrentUser, nombreVisible } from "@/lib/current-user";
import { RUTA_ESTADO_CUENTA, cuotasPorPagar, esVencida } from "@/lib/estado-cuenta";
import { MENSAJES_ERROR_CARGA, cargarEstadoCuenta } from "@/lib/pagos-api";

export const metadata: Metadata = {
  title: "Realizar pago",
};

function Encabezado() {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">Cuotas y pagos</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-[40px]">Realizar un pago</h1>
    </div>
  );
}

export default async function PagosPage(props: PageProps<"/pagos">) {
  const searchParams = await props.searchParams;
  const usuario = await getCurrentUser();

  if (!usuario) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-foreground">
        <Encabezado />
        <SesionVencida />
      </div>
    );
  }

  // POST /pagos solo admite residentes: la unidad sale de su sesión.
  if (usuario.role !== "RESIDENTE" || !usuario.unit) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-foreground">
        <Encabezado />
        <Aviso>
          <p>
            {usuario.role === "RESIDENTE"
              ? "Tu cuenta no tiene una unidad asignada. Contacta a la administración."
              : "Solo los residentes pueden pagar cuotas."}
          </p>
          <Link href={RUTA_ESTADO_CUENTA} className="font-semibold text-secondary underline underline-offset-4">
            Ir al estado de cuenta
          </Link>
        </Aviso>
      </div>
    );
  }

  const unidad = usuario.unit;
  const carga = await cargarEstadoCuenta(unidad.id);
  const hoy = hoyEnCondominio();

  if (!carga.estado) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-foreground">
        <Encabezado />
        {carga.error === "sesion" ? (
          <SesionVencida />
        ) : carga.error === "general" ? (
          <ErrorCarga mensaje={MENSAJES_ERROR_CARGA.general} />
        ) : (
          <Aviso>{MENSAJES_ERROR_CARGA[carga.error]}</Aviso>
        )}
      </div>
    );
  }

  const cuotas = cuotasPorPagar(carga.estado.cuotas);
  // Preselección: las cuotas indicadas en ?cuotas=1,2 o, si no hay, las vencidas.
  const pedidas = String(searchParams.cuotas ?? "")
    .split(",")
    .map(Number)
    .filter((id) => cuotas.some((c) => c.id === id));
  const preseleccion = pedidas.length > 0 ? pedidas : cuotas.filter((c) => esVencida(c, hoy)).map((c) => c.id);

  return (
    <div className="mx-auto max-w-6xl text-foreground">
      <FlujoPago
        cuotas={cuotas}
        saldoTotal={carga.estado.saldoTotal}
        hoy={hoy}
        preseleccion={preseleccion}
        residente={{
          nombre: nombreVisible(usuario.email),
          condominio: CONDOMINIO.nombre,
          unidad: unidad.code,
          descripcion: unidad.description,
        }}
      />
    </div>
  );
}
