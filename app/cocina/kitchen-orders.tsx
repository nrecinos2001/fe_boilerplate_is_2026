"use client";

import { useCallback, useEffect, useState } from "react";

type Comanda = {
  id: string;
  tableNumber: string | null;
  orderNumber: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

type RespuestaComandas = {
  items: Comanda[];
};

type OrderItem = {
  id: string;
  quantity: number;
  status: string;
  dish: {
    name: string;
  };
};

type KitchenOrder = {
  id: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  account?: {
    table?: {
      number: number;
    } | null;
  } | null;
};

async function leerRespuesta(response: Response): Promise<unknown> {
  const texto = await response.text();

  if (!texto) return null;

  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return { message: texto };
  }
}

function obtenerError(datos: unknown, status: number): string {
  if (
    typeof datos === "object" &&
    datos !== null &&
    "message" in datos
  ) {
    const mensaje = (datos as { message?: unknown }).message;

    if (Array.isArray(mensaje)) {
      return mensaje.map(String).join(", ");
    }

    if (typeof mensaje === "string") {
      return mensaje;
    }
  }

  return `No se pudo completar la operación (HTTP ${status}).`;
}

async function apiH8(path: string, body?: unknown) {
  const response = await fetch(`/api/cocina/${path}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body) }),
    credentials: "same-origin",
    cache: "no-store",
  });

  const datos = await leerRespuesta(response);

  if (!response.ok) {
    throw new Error(obtenerError(datos, response.status));
  }

  return datos;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function KitchenOrders() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorH7, setErrorH7] = useState("");
  const [errorH8, setErrorH8] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarComandas = useCallback(async (inicial = false) => {
    if (inicial) setCargando(true);

    try {
      const response = await fetch("/api/kitchen/orders", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const datos = await leerRespuesta(response);

      if (!response.ok) {
        throw new Error(obtenerError(datos, response.status));
      }

      if (
        typeof datos !== "object" ||
        datos === null ||
        !("items" in datos) ||
        !Array.isArray((datos as RespuestaComandas).items)
      ) {
        throw new Error("La respuesta de comandas no es válida.");
      }

      const items = (datos as RespuestaComandas).items;

      setComandas(
        [...items].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime(),
        ),
      );

      setErrorH7("");
    } catch (err) {
      setErrorH7(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las comandas recibidas.",
      );
    } finally {
      if (inicial) setCargando(false);
    }
  }, []);

  const cargarPreparacion = useCallback(async () => {
    try {
      const datos = await apiH8("orders/in-preparation");

      const items = Array.isArray(datos)
        ? datos
        : typeof datos === "object" &&
            datos !== null &&
            "items" in datos &&
            Array.isArray(datos.items)
          ? datos.items
          : [];

      setOrders(items as KitchenOrder[]);
      setErrorH8("");
    } catch (err) {
      setErrorH8(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las comandas en preparación.",
      );
    }
  }, []);

  const actualizarPanel = useCallback(async (inicial = false) => {
    await Promise.all([
      cargarComandas(inicial),
      cargarPreparacion(),
    ]);
  }, [cargarComandas, cargarPreparacion]);

  useEffect(() => {
    const iniciar = window.setTimeout(() => {
      void actualizarPanel(true);
    }, 0);

    const intervalo = window.setInterval(() => {
      void actualizarPanel();
    }, 5000);

    return () => {
      window.clearTimeout(iniciar);
      window.clearInterval(intervalo);
    };
  }, [actualizarPanel]);

  const tomarComanda = async (id: string) => {
    if (procesandoId) return;

    setProcesandoId(id);
    setErrorH7("");
    setMensaje("");

    try {
      const response = await fetch(
        `/api/kitchen/orders/${encodeURIComponent(id)}/take`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const datos = await leerRespuesta(response);

      if (response.status === 409) {
        throw new Error(
          obtenerError(datos, 409) ||
            "Otra persona ya tomó esta comanda.",
        );
      }

      if (!response.ok) {
        throw new Error(obtenerError(datos, response.status));
      }

      setMensaje("Comanda tomada correctamente. ¡A preparar!");
      await actualizarPanel();
    } catch (err) {
      setErrorH7(
        err instanceof Error
          ? err.message
          : "No se pudo tomar la comanda.",
      );

      await cargarComandas();
    } finally {
      setProcesandoId(null);
    }
  };

  const marcarPlatilloListo = async (
    orderId: string,
    itemId: string,
  ) => {
    const key = `${orderId}-${itemId}`;

    setProcesandoId(key);
    setErrorH8("");
    setMensaje("");

    try {
      await apiH8(
        `orders/${orderId}/items/${itemId}/status`,
        { status: "Listo" },
      );

      setMensaje("Platillo marcado como listo.");
      await actualizarPanel();
    } catch (err) {
      setErrorH8(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el platillo.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const marcarComandaLista = async (orderId: string) => {
    setProcesandoId(orderId);
    setErrorH8("");
    setMensaje("");

    try {
      await apiH8(`orders/${orderId}/status`, {
        status: "Listo",
      });

      setMensaje("¡Comanda marcada como lista!");
      await actualizarPanel();
    } catch (err) {
      setErrorH8(
        err instanceof Error
          ? err.message
          : "No se pudo marcar la comanda como lista.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const platillosPendientes = orders.reduce(
    (total, order) =>
      total +
      order.items.filter(
        (item) => item.status === "IN_PREPARATION",
      ).length,
    0,
  );

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-[#252944] lg:flex">
      <aside className="flex w-full flex-col bg-[#171b36] text-white lg:min-h-screen lg:w-64 lg:shrink-0">
        <div className="border-b border-white/10 px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7564e8] text-xl font-bold">
              N
            </div>
            <div>
              <p className="text-lg font-bold">Núcleo Digital</p>
              <p className="text-xs text-slate-400">
                Sistema de restaurante
              </p>
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-4 lg:flex-col">
          <a
            href="/"
            className="rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
          >
            Inicio
          </a>
          <a
            href="/cocina"
            className="rounded-xl bg-[#7564e8] px-4 py-3 text-sm font-semibold text-white"
          >
            Cocina
          </a>
        </nav>

        <div className="mt-auto hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7564e8] font-semibold">
              C
            </div>
            <div>
              <p className="text-sm font-semibold">Personal de cocina</p>
              <p className="text-xs text-slate-400">
                Preparación de pedidos
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-[#8c9cbd]">
                Operaciones / Cocina
              </p>
              <h1 className="text-3xl font-bold text-[#20233e]">
                Panel de cocina
              </h1>
              <p className="mt-2 text-sm text-[#7184a6]">
                Visualiza las comandas recibidas y gestiona su preparación.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Actualización automática cada 5 segundos.
              </p>
            </div>

            <button
              type="button"
              disabled={cargando}
              onClick={() => void actualizarPanel(true)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {cargando ? "Actualizando..." : "Actualizar comandas"}
            </button>
          </header>

          {mensaje && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {mensaje}
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Comandas recibidas
              </p>
              <p className="mt-2 text-3xl font-bold text-[#7564e8]">
                {comandas.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Comandas en preparación
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {orders.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Platillos pendientes
              </p>
              <p className="mt-2 text-3xl font-bold text-[#20233e]">
                {platillosPendientes}
              </p>
            </div>
          </div>

          <section className="mb-10">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-[#20233e]">
                Comandas recibidas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Toma una comanda para comenzar su preparación.
              </p>
            </div>

            {errorH7 && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {errorH7}
              </div>
            )}

            {cargando ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                Cargando comandas...
              </div>
            ) : comandas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h3 className="text-lg font-bold text-[#20233e]">
                  No hay comandas pendientes
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Las nuevas comandas aparecerán automáticamente aquí.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {comandas.map((comanda) => (
                  <article
                    key={comanda.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">
                          Mesa {comanda.tableNumber ?? "Sin mesa"}
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-[#20233e]">
                          Comanda #
                          {comanda.orderNumber ?? comanda.id.slice(0, 8)}
                        </h3>
                      </div>

                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                        Recibido
                      </span>
                    </div>

                    <div className="mb-5 rounded-xl bg-[#f5f6fb] p-4">
                      <p className="mb-1 text-sm font-medium text-slate-600">
                        Notas especiales
                      </p>
                      <p className="text-sm text-slate-500">
                        {comanda.notes || "Sin notas especiales."}
                      </p>
                    </div>

                    <p className="mb-4 text-xs text-slate-400">
                      Recibida:{" "}
                      {new Date(comanda.createdAt).toLocaleString("es-SV")}
                    </p>

                    <button
                      type="button"
                      onClick={() => void tomarComanda(comanda.id)}
                      disabled={procesandoId !== null}
                      className="w-full rounded-xl bg-[#7564e8] px-5 py-3 font-semibold text-white transition hover:bg-[#6250d5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {procesandoId === comanda.id
                        ? "Tomando comanda..."
                        : "Tomar comanda"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-[#20233e]">
                Comandas en preparación
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Marca cada platillo como listo y finaliza la comanda.
              </p>
            </div>

            {errorH8 && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {errorH8}
              </div>
            )}

            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h3 className="text-lg font-bold text-[#20233e]">
                  No hay comandas en preparación
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Las comandas aparecerán aquí cuando sean tomadas por cocina.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const allReady =
                    order.items.length > 0 &&
                    order.items.every(
                      (item) => item.status === "READY",
                    );

                  return (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-400">
                            Comanda
                          </p>
                          <h3 className="mt-1 text-lg font-bold text-[#20233e]">
                            #{shortId(order.id)}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {order.account?.table?.number
                              ? `Mesa ${order.account.table.number}`
                              : "Pedido sin mesa"}
                          </p>
                        </div>

                        <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700">
                          En preparación
                        </span>
                      </div>

                      <div className="space-y-3">
                        {order.items.map((item) => {
                          const ready = item.status === "READY";
                          const key = `${order.id}-${item.id}`;

                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#fafbfe] p-4"
                            >
                              <div>
                                <p className="font-semibold text-[#252944]">
                                  {item.dish.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Cantidad: {item.quantity}
                                </p>
                                <span
                                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                    ready
                                      ? "bg-green-50 text-green-700"
                                      : "bg-orange-50 text-orange-700"
                                  }`}
                                >
                                  {ready ? "Listo" : "En preparación"}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  ready ||
                                  procesandoId !== null
                                }
                                onClick={() =>
                                  void marcarPlatilloListo(
                                    order.id,
                                    item.id,
                                  )
                                }
                                className="rounded-xl bg-[#7564e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6250d5] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {procesandoId === key
                                  ? "Procesando..."
                                  : ready
                                    ? "Platillo terminado"
                                    : "Terminar platillo"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                        <p className="text-sm text-slate-500">
                          {allReady
                            ? "Todos los platillos están listos."
                            : "Aún hay platillos pendientes de preparación."}
                        </p>

                        <button
                          type="button"
                          disabled={
                            !allReady ||
                            procesandoId !== null
                          }
                          onClick={() =>
                            void marcarComandaLista(order.id)
                          }
                          className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {procesandoId === order.id
                            ? "Procesando..."
                            : "Marcar comanda lista"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-400">
            Núcleo Digital · Panel de cocina · H7 + H8
          </footer>
        </div>
      </main>
    </div>
  );
}
