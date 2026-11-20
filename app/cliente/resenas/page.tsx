"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import BarraLateral from "@/app/components/BarraLateral";
import CampanaNotificaciones from "@/app/components/CampanaNotificaciones";
import {
  LoyaltyApiError,
  obtenerPedidosTakeawayCliente,
  type PedidoTakeawayCliente,
} from "@/lib/services/loyalty";
import { registrarResena, ReviewsApiError } from "@/lib/services/reviews";

function fecha(valor: string) {
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date);
}

function mensajeError(error: unknown) {
  if (error instanceof LoyaltyApiError && error.status === 403) {
    return "No tienes permiso para consultar estos pedidos.";
  }
  if (error instanceof LoyaltyApiError && error.status === 404) {
    return "No se encontró la lista de pedidos para reseñar.";
  }
  return error instanceof Error && error.message
    ? error.message
    : "No se pudieron cargar los pedidos. Intenta de nuevo.";
}

function mensajeErrorResena(error: unknown) {
  if (!(error instanceof ReviewsApiError)) {
    return "No se pudo enviar la reseña. Intenta de nuevo.";
  }
  switch (error.status) {
    case 400:
      return error.message || "Revisa la calificación y el comentario.";
    case 403:
      return "No tienes permiso para reseñar este pedido.";
    case 404:
      return "No se encontró el pedido seleccionado.";
    case 409:
      return error.message || "Este pedido ya tiene una reseña o todavía no es elegible.";
    default:
      return error.message || "Ocurrió un error al registrar la reseña.";
  }
}

export default function ResenasPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoTakeawayCliente[]>([]);
  const [pedidoId, setPedidoId] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let mounted = true;

    async function cargarPedidos() {
      setCargando(true);
      setError("");
      try {
        const resultado = await obtenerPedidosTakeawayCliente();
        if (!Array.isArray(resultado)) {
          throw new Error("El servidor devolvió una lista de pedidos inválida.");
        }
        if (mounted) {
          setPedidos(resultado.filter((pedido) => pedido.status === "DELIVERED" && pedido.hasReview === false));
        }
      } catch (err) {
        if (!mounted) return;
        if (err instanceof LoyaltyApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(mensajeError(err));
      } finally {
        if (mounted) setCargando(false);
      }
    }

    queueMicrotask(() => void cargarPedidos());
    return () => {
      mounted = false;
    };
  }, [router]);

  const pedidoSeleccionado = pedidos.find((pedido) => pedido.id === pedidoId);
  const comentarioValido = comment.length <= 500;
  const puedeEnviar = Boolean(pedidoSeleccionado) && rating >= 1 && rating <= 5 && comentarioValido && !enviando;

  async function enviarResena(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeEnviar || !pedidoSeleccionado) return;

    setEnviando(true);
    setError("");
    setExito("");
    try {
      await registrarResena({
        orderId: pedidoSeleccionado.id,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setPedidos((actuales) => actuales.filter((pedido) => pedido.id !== pedidoSeleccionado.id));
      setPedidoId("");
      setRating(0);
      setComment("");
      setExito(`Tu reseña para el pedido ${pedidoSeleccionado.orderNumber} se registró correctamente.`);
    } catch (err) {
      if (err instanceof ReviewsApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError(mensajeErrorResena(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-800 lg:flex">
      <BarraLateral />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-slate-400">Núcleo Digital / Cliente / Mis reseñas</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#20233e]">Mis reseñas</h1>
              <p className="mt-2 text-sm text-slate-500">Califica tus pedidos entregados y comparte tu experiencia.</p>
            </div>
            <CampanaNotificaciones />
          </header>

          {exito && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{exito}</p>}
          {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-semibold text-[#20233e]">Pedido para reseñar</h2>
            <p className="mt-1 text-sm text-slate-500">Solo aparecen pedidos entregados que aún no tienen reseña.</p>

            {cargando ? (
              <p role="status" className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Cargando pedidos elegibles…</p>
            ) : pedidos.length === 0 ? (
              <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No tienes pedidos entregados pendientes de reseña.</p>
            ) : (
              <form className="mt-6 space-y-6" onSubmit={enviarResena}>
                <fieldset disabled={enviando}>
                  <legend className="mb-3 text-sm font-semibold text-slate-700">Selecciona una compra</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pedidos.map((pedido) => (
                      <label key={pedido.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${pedidoId === pedido.id ? "border-[#7564e8] bg-violet-50 ring-1 ring-[#7564e8]" : "border-slate-200 hover:border-violet-300"}`}>
                        <input
                          type="radio"
                          name="pedido"
                          value={pedido.id}
                          checked={pedidoId === pedido.id}
                          onChange={() => setPedidoId(pedido.id)}
                          className="mt-1 accent-[#7564e8]"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#20233e]">Pedido {pedido.orderNumber}</span>
                          <span className="mt-1 block text-sm text-slate-500">Entregado · {fecha(pedido.createdAt)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset disabled={enviando}>
                  <legend className="mb-2 text-sm font-semibold text-slate-700">Tu calificación</legend>
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={rating === value}
                        aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                        onClick={() => setRating(value)}
                        className={`rounded-md p-1 text-3xl leading-none transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7564e8] ${rating >= value ? "text-amber-400" : "text-slate-300"}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-slate-500">{rating ? `${rating} de 5` : "Selecciona de 1 a 5"}</span>
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="comentario-resena" className="mb-2 block text-sm font-semibold text-slate-700">Comentario <span className="font-normal text-slate-400">(opcional)</span></label>
                  <textarea
                    id="comentario-resena"
                    value={comment}
                    onChange={(event) => setComment(event.target.value.slice(0, 500))}
                    maxLength={500}
                    rows={4}
                    disabled={enviando}
                    placeholder="Cuéntanos cómo fue tu experiencia…"
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#7564e8] focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{comment.length}/500</p>
                </div>

                <button
                  type="submit"
                  disabled={!puedeEnviar}
                  className="rounded-xl bg-[#7564e8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6453d5] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {enviando ? "Enviando reseña…" : "Enviar reseña"}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
