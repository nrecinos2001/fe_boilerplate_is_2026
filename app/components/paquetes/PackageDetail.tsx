"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package as PackageIcon,
  Clock,
  Check,
  CheckCircle2,
  Info,
  KeyRound,
  Copy,
  ShieldCheck,
  Lock,
  RotateCw,
} from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import {
  CONDOMINIUM,
  PICKUP_LOCATION,
  formatDate,
  formatTime,
  readError,
  type Package,
} from "@/lib/paquetes";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; pkg: Package };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Paquetes
        </p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">Detalle del paquete</h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      <Link
        href="/paquetes"
        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
      >
        <ArrowLeft size={18} /> Mis paquetes
      </Link>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Paquetes
        </p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">Detalle del paquete</h1>
        <p className="text-gray-600">
          Consulta y recoge los paquetes asociados a tu cuenta de residente.
        </p>
      </div>
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl px-8 py-10 text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-xl bg-[#f5f0e6] flex items-center justify-center">
          <Lock className="text-[#0a2f1f]" size={24} />
        </div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          404 · Paquete no disponible
        </p>
        <h2 className="text-3xl font-serif text-gray-900 mb-3">
          No tienes acceso a este paquete
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto mb-6">
          No podemos mostrar la información de este paquete. Vuelve a tu listado
          para consultar los paquetes disponibles para tu cuenta.
        </p>
        <Link
          href="/paquetes"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
        >
          <ArrowLeft size={18} /> Volver a mis paquetes
        </Link>
        <div className="border-t border-gray-200 mt-8 pt-6">
          <p className="text-xs text-gray-600 mb-2">
            Si esperabas ver un paquete aquí, contacta a la administración.
          </p>
          <Link href="#" className="text-sm text-[#0a2f1f] underline">
            Contactar administración
          </Link>
        </div>
      </div>
    </div>
  );
}

function PickupCodeCard({ code, folio }: { code: string; folio: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-[#0a2f1f] text-white rounded-xl p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold">Tu código de retiro</h2>
        <KeyRound size={20} className="text-[#c9b98f]" />
      </div>
      <div className="border border-white/20 rounded-lg py-6 text-center mb-5">
        <p className="text-4xl font-mono tracking-[0.3em] pl-[0.3em]">{code}</p>
        <p className="text-xs text-[#c9b98f] mt-3">{folio}</p>
      </div>
      <p className="text-sm text-gray-200 mb-5">
        Muestra este código al personal de seguridad en la{" "}
        {PICKUP_LOCATION.toLowerCase()} para recoger tu paquete.
      </p>
      <button
        type="button"
        onClick={copy}
        className="w-full flex items-center justify-center gap-2 py-3 border border-[#c9b98f] rounded-lg text-sm font-medium hover:bg-white/5 transition"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Código copiado" : "Copiar código"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Código copiado al portapapeles" : ""}
      </span>
    </div>
  );
}

function Steps({ code, unitCode }: { code: string; unitCode: string }) {
  const steps = [
    {
      title: `Acude a la ${PICKUP_LOCATION.toLowerCase()}`,
      text: `Indica que vas a recoger un paquete de la unidad ${unitCode}.`,
    },
    {
      title: "Presenta tu código de retiro",
      text: `Muestra ${code} al personal de seguridad para identificar este paquete.`,
    },
    {
      title: "Recibe tu paquete",
      text: "El personal de seguridad registrará la entrega y actualizará su estado.",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Recógelo en 3 pasos</h2>
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="shrink-0 w-7 h-7 rounded-full bg-[#f5f0e6] text-xs font-semibold text-gray-900 flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{step.title}</p>
              <p className="text-sm text-gray-600 mt-1">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function PackageDetail({ packageId }: { packageId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; state: LoadState } | null>(
    null,
  );
  const state: LoadState =
    loaded?.attempt === attempt ? loaded.state : { kind: "loading" };

  useEffect(() => {
    let cancelled = false;

    const fetchPackage = async (): Promise<LoadState> => {
      try {
        const res = await fetch(`/api/paquetes/${packageId}`);
        if (res.ok) return { kind: "ready", pkg: await res.json() };
        if (res.status === 404 || res.status === 400) return { kind: "notFound" };
        return { kind: "error", message: await readError(res) };
      } catch {
        return { kind: "error", message: "No se pudo cargar el paquete." };
      }
    };

    void fetchPackage().then((next) => {
      if (!cancelled) setLoaded({ attempt, state: next });
    });

    return () => {
      cancelled = true;
    };
  }, [packageId, attempt]);

  if (state.kind === "notFound") return <NoAccess />;

  if (state.kind === "loading") {
    return (
      <div className="max-w-7xl mx-auto">
        <Header subtitle="Cargando información del paquete…" />
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="max-w-7xl mx-auto">
        <Header subtitle="No se pudo mostrar el paquete." />
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-red-700 mb-4">{state.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            <RotateCw size={16} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { pkg } = state;
  const pending = pkg.status === "PENDIENTE_RETIRO";
  const received = `${formatDate(pkg.receivedAt)} · ${formatTime(pkg.receivedAt)}`;
  const delivered = pkg.deliveredAt
    ? `${formatDate(pkg.deliveredAt)} · ${formatTime(pkg.deliveredAt)}`
    : "";

  return (
    <div className="max-w-7xl mx-auto">
      <Header
        subtitle={`${pkg.folio} · Recibido el ${formatDate(pkg.receivedAt)}, ${formatTime(
          pkg.receivedAt,
        )} · ${CONDOMINIUM}`}
      />

      {pending ? (
        <div className="bg-[#f5f0e6] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <PackageIcon className="text-[#0a2f1f] mt-0.5 shrink-0" size={24} />
            <div>
              <p className="font-semibold text-gray-900">Tu paquete está listo para recoger</p>
              <p className="text-sm text-gray-600 mt-1">
                Se encuentra en la {PICKUP_LOCATION.toLowerCase()}. Presenta tu código
                al personal de seguridad.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock size={16} /> Pendiente de retiro
          </span>
        </div>
      ) : (
        <div className="bg-[#e6f0eb] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="text-[#0a2f1f] mt-0.5 shrink-0" size={24} />
            <div>
              <p className="font-semibold text-gray-900">Paquete entregado</p>
              <p className="text-sm text-gray-600 mt-1">
                Lo recibió {pkg.deliveredTo} el {delivered}.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Check size={16} /> Entregado
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Información del paquete</h2>
              <span className="w-10 h-10 rounded-lg bg-[#f5f0e6] flex items-center justify-center">
                <PackageIcon className="text-[#0a2f1f]" size={20} />
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 [&>*]:pb-5 [&>*]:border-b [&>*]:border-gray-200 [&>*:nth-last-child(-n+2)]:border-0 [&>*:nth-last-child(-n+2)]:pb-0">
              <Detail label="Identificador" value={pkg.folio} />
              <Detail label="Transportista" value={pkg.carrier} />
              <Detail label="Destinatario" value={pkg.recipientName} />
              <Detail
                label="Unidad de destino"
                value={`${pkg.unit.code} · ${pkg.unit.description}`}
              />
              <Detail label="Fecha de recepción" value={received} />
              <Detail label="Lugar de retiro" value={`${PICKUP_LOCATION} · ${CONDOMINIUM}`} />
            </div>
            <div className="mt-6 bg-[#f5f0e6] rounded-lg p-4 flex items-start gap-3 text-sm text-gray-700">
              <Info size={18} className="shrink-0 mt-0.5" />
              1 paquete registrado por seguridad. El código de retiro corresponde
              únicamente a este paquete.
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Seguimiento</h2>
            <ol>
              <li className="flex gap-4 pb-5 border-b border-gray-200">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#e6f0eb] flex items-center justify-center">
                  <Check size={16} className="text-[#0a2f1f]" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">Recibido en caseta</p>
                    <p className="text-xs text-gray-500">{received}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Seguridad recibió tu paquete de {pkg.carrier} y lo registró para{" "}
                    {pkg.recipientName}, unidad {pkg.unit.code}.
                  </p>
                </div>
              </li>
              {pending ? (
                <li className="flex gap-4 pt-5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#f5f0e6] flex items-center justify-center">
                    <Clock size={16} className="text-[#0a2f1f]" />
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">Pendiente de retiro</p>
                      <p className="text-xs text-gray-500">Estado actual</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Tu paquete permanece en resguardo. Acude a la{" "}
                      {PICKUP_LOCATION.toLowerCase()} con el código de retiro.
                    </p>
                    <p className="text-xs text-gray-500 mt-4">
                      Aún no se ha registrado la entrega. La fecha de entrega se
                      mostrará cuando seguridad confirme el retiro.
                    </p>
                  </div>
                </li>
              ) : (
                <li className="flex gap-4 pt-5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#e6f0eb] flex items-center justify-center">
                    <Check size={16} className="text-[#0a2f1f]" />
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">Entregado</p>
                      <p className="text-xs text-gray-500">{delivered}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Seguridad registró la entrega a {pkg.deliveredTo}.
                    </p>
                  </div>
                </li>
              )}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          {pending && pkg.pickupCode ? (
            <>
              <PickupCodeCard code={pkg.pickupCode} folio={pkg.folio} />
              <Steps code={pkg.pickupCode} unitCode={pkg.unit.code} />
              <p className="flex items-start gap-2 text-sm text-gray-600 px-2">
                <ShieldCheck size={18} className="shrink-0 text-[#0a2f1f]" />
                Mantén tu código a la mano y compártelo solo con el personal de
                seguridad al recoger.
              </p>
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Entrega registrada</h2>
              <Detail label="Recibió" value={pkg.deliveredTo ?? "—"} />
              <Detail label="Fecha de entrega" value={delivered || "—"} />
              <p className="text-sm text-gray-600 border-t border-gray-200 pt-4">
                El código de retiro ya no es válido porque el paquete fue entregado.
              </p>
            </div>
          )}
        </aside>
      </div>

      <InfoTimestamp />
    </div>
  );
}
