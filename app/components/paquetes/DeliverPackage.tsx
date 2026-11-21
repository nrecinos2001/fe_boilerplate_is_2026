"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  PackageCheck,
  Shield,
  AlertCircle,
  CheckCircle2,
  RotateCw,
} from "lucide-react";
import PackageStatusBadge from "@/app/components/paquetes/PackageStatusBadge";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import {
  CONDOMINIUM,
  PICKUP_LOCATION,
  formatDate,
  formatTime,
  readError,
  type Package,
} from "@/lib/paquetes";

type Props = { packageId: string; guardName: string };

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "ready"; pkg: Package };

const CODE_LENGTH = 6;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function DeliverPackage({ packageId, guardName }: Props) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; state: LoadState } | null>(
    null,
  );
  const state: LoadState =
    loaded?.attempt === attempt ? loaded.state : { kind: "loading" };
  const [code, setCode] = useState("");
  const [deliveredTo, setDeliveredTo] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPackage = async (): Promise<LoadState> => {
      try {
        const res = await fetch(`/api/paquetes/${packageId}`);
        if (res.ok) return { kind: "ready", pkg: await res.json() };
        const notFound = res.status === 404 || res.status === 400;
        return {
          kind: "error",
          message: notFound ? "El paquete no existe." : await readError(res),
          notFound,
        };
      } catch {
        return {
          kind: "error",
          message: "No se pudo cargar el paquete.",
          notFound: false,
        };
      }
    };

    void fetchPackage().then((next) => {
      if (!cancelled) setLoaded({ attempt, state: next });
    });

    return () => {
      cancelled = true;
    };
  }, [packageId, attempt]);

  const reload = () => setAttempt((a) => a + 1);

  const canSubmit =
    code.length === CODE_LENGTH && deliveredTo.trim().length > 0 && !isSubmitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || state.kind !== "ready") return;

    setIsSubmitting(true);
    setCodeError(null);
    setSubmitError(null);
    setConflict(null);

    try {
      const res = await fetch(`/api/paquetes/${packageId}/entrega`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupCode: code, deliveredTo: deliveredTo.trim() }),
      });

      if (res.ok) {
        router.push(`/paquetes?entregado=${encodeURIComponent(state.pkg.folio)}`);
        return;
      }

      const message = await readError(res);
      if (res.status === 422) {
        setCodeError(message);
      } else if (res.status === 409) {
        setConflict(message);
        reload();
      } else {
        setSubmitError(message);
      }
    } catch {
      setSubmitError("No se pudo registrar la entrega. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const header = (subtitle: string) => (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Paquetes · Entrega
        </p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">
          Entrega de paquete
        </h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      <Link
        href="/paquetes"
        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
      >
        <ArrowLeft size={18} /> Paquetes pendientes
      </Link>
    </div>
  );

  if (state.kind === "loading") {
    return (
      <div className="max-w-7xl mx-auto">
        {header("Cargando información del paquete…")}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="max-w-7xl mx-auto">
        {header("No se pudo mostrar el paquete.")}
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-red-700 mb-4">{state.message}</p>
          {!state.notFound && (
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              <RotateCw size={16} /> Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  const { pkg } = state;
  const delivered = pkg.status === "ENTREGADO";

  return (
    <div className="max-w-7xl mx-auto">
      {header(
        delivered
          ? `${pkg.folio} · Este paquete ya fue entregado.`
          : `${pkg.folio} · Ingresa el código presentado y confirma el retiro en caseta.`,
      )}

      {delivered && (
        <div
          role="status"
          className="bg-[#e6f0eb] rounded-xl p-5 flex items-start gap-3 mb-6"
        >
          <CheckCircle2 className="text-[#0a2f1f] mt-0.5 shrink-0" size={22} />
          <div>
            <p className="font-semibold text-gray-900">
              {conflict ? "No se registró una nueva entrega" : "Paquete entregado"}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {conflict ??
                `Entregado el ${formatDate(pkg.deliveredAt!)} · ${formatTime(
                  pkg.deliveredAt!,
                )} a ${pkg.deliveredTo}.`}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        noValidate
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start"
      >
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-start gap-4 mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Información del paquete
              </h2>
              <PackageStatusBadge status={pkg.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 [&>*]:pb-5 [&>*]:border-b [&>*]:border-gray-200 [&>*:nth-last-child(-n+2)]:border-0 [&>*:nth-last-child(-n+2)]:pb-0">
              <Detail label="Identificador" value={pkg.folio} />
              <Detail label="Transportista" value={pkg.carrier} />
              <Detail label="Destinatario" value={pkg.recipientName} />
              <Detail
                label="Unidad de destino"
                value={`${pkg.unit.code} · ${pkg.unit.description}`}
              />
              <Detail label="Referencia o guía" value={pkg.trackingReference} />
              <Detail label="Contenido" value={pkg.description} />
              <Detail
                label="Recibido en caseta"
                value={`${formatDate(pkg.receivedAt)} · ${formatTime(pkg.receivedAt)}`}
              />
              <Detail
                label="Lugar de retiro"
                value={`${PICKUP_LOCATION} · ${CONDOMINIUM}`}
              />
            </div>
            {pkg.notes && (
              <p className="text-sm text-gray-600 mt-5">
                <span className="font-medium text-gray-900">Observaciones:</span>{" "}
                {pkg.notes}
              </p>
            )}
          </section>

          {!delivered && (
            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Código de retiro presentado
              </h2>
              <p className="text-sm text-gray-600 mb-5">
                Ingresa el código que muestra el residente y el nombre de quien
                recoge el paquete. El código se valida al confirmar la entrega.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="pickupCode"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Código de retiro *
                  </label>
                  <div className="relative">
                    <input
                      id="pickupCode"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                        setCodeError(null);
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000000"
                      aria-invalid={Boolean(codeError)}
                      aria-describedby="pickupCode-help"
                      className={`w-full pl-4 pr-10 py-3 bg-white border rounded-lg text-lg tracking-[0.4em] font-mono text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition ${
                        codeError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <KeyRound
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={18}
                    />
                  </div>
                  <p id="pickupCode-help" className="mt-1 text-xs text-gray-500">
                    {code.length}/{CODE_LENGTH} dígitos
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="deliveredTo"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nombre de quien recoge *
                  </label>
                  <input
                    id="deliveredTo"
                    value={deliveredTo}
                    onChange={(e) => setDeliveredTo(e.target.value)}
                    maxLength={100}
                    placeholder="Nombre completo"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              {codeError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  {codeError}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Un código incompleto o sin el nombre de quien recoge no permite
                confirmar.
              </p>
            </section>
          )}
        </div>

        {!delivered && (
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="bg-[#f5f0e6] border border-[#e8dfcf] rounded-xl p-6">
              <p className="text-xs font-semibold text-gray-900 mb-3">
                Confirmación pendiente
              </p>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                ¿Registrar esta entrega?
              </h2>
              <p className="text-sm text-gray-700 mb-5">
                Verifica que estás entregando físicamente el paquete correcto
                antes de confirmar.
              </p>
              <div className="space-y-4 border-b border-[#e8dfcf] pb-5 mb-5">
                <Detail
                  label="Paquete a entregar"
                  value={`${pkg.folio} · 1 paquete de ${pkg.carrier}`}
                />
                <Detail
                  label="Destinatario"
                  value={`${pkg.recipientName} · ${pkg.unit.code}`}
                />
              </div>
              <p className="text-sm text-gray-700 mb-5">
                Al confirmar se guardará la hora de entrega y el paquete dejará
                de contar como pendiente.
              </p>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}

              <div className="flex flex-col items-start gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PackageCheck size={18} />
                  {isSubmitting ? "Registrando entrega…" : "Confirmar y registrar entrega"}
                </button>
                <Link
                  href="/paquetes"
                  className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
                >
                  Volver sin entregar
                </Link>
              </div>
            </div>

            <div className="bg-[#e6f0eb] rounded-xl p-5 flex items-start gap-3">
              <Shield className="text-[#0a2f1f] mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-semibold text-gray-900">
                  Registro a cargo de seguridad
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {guardName} · {PICKUP_LOCATION}. Durante el envío, la
                  confirmación se deshabilita para evitar duplicados.
                </p>
              </div>
            </div>
          </aside>
        )}
      </form>

      <InfoTimestamp />
    </div>
  );
}
