"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  RotateCw,
  Vote,
  X,
} from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import { CONDOMINIO } from "@/lib/condominio";
import { formatDate, formatTime } from "@/lib/paquetes";
import {
  MODALITY_LABEL,
  OPTION_HINT,
  TYPE_LABEL,
  apiErrorMessages,
  type Assembly,
  type VotingTopic,
} from "@/lib/asambleas";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; assembly: Assembly };

type Voter = { canVote: boolean; unitCode: string | null; name: string };

function longDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function ConfirmDialog({
  assembly,
  topic,
  optionText,
  voter,
  sending,
  error,
  onCancel,
  onConfirm,
}: {
  assembly: Assembly;
  topic: VotingTopic;
  optionText: string;
  voter: Voter;
  sending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, sending]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-voto"
        className="w-full max-w-xl bg-[#fbf8f1] rounded-2xl shadow-xl p-7"
      >
        <div className="flex justify-between items-start mb-4">
          <span className="w-11 h-11 rounded-lg bg-[#f5f0e6] flex items-center justify-center">
            <Vote className="text-[#0a2f1f]" size={20} />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            aria-label="Cerrar"
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="confirmar-voto" className="text-3xl font-serif text-gray-900 mb-2">
          ¿Confirmar y enviar tu voto?
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          Revisa tu elección antes de enviarla. Tu voto todavía no ha sido registrado.
        </p>
        <div className="bg-[#f5f0e6] rounded-xl p-5 mb-4">
          <p className="text-xs text-gray-600">
            {assembly.folio} · Asamblea {TYPE_LABEL[assembly.type].toLowerCase()}
          </p>
          <p className="font-semibold text-gray-900 mt-1">{assembly.title}</p>
          <p className="text-xs text-gray-600 mt-1">
            {formatDate(assembly.startsAt)} · {formatTime(assembly.startsAt).replace(" h", "")}–
            {formatTime(assembly.endsAt)} · {CONDOMINIO.nombre}
          </p>
          <p className="text-sm text-gray-900 border-t border-[#e8dfcf] mt-4 pt-4">{topic.title}</p>
          <p className="text-xs text-gray-600 mt-1">
            Votación abierta · Cierra el {longDateTime(topic.closesAt)}
          </p>
        </div>
        <div className="border border-[#0a2f1f] bg-[#e6f0eb] rounded-xl p-4 flex flex-wrap justify-between items-end gap-2 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-600">Tu opción seleccionada</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{optionText}</p>
          </div>
          <p className="text-xs text-gray-600">
            {voter.name} · {voter.unitCode}
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-200 pb-5 mb-5">
          <Lock size={16} /> Al confirmar y enviar, tu voto será definitivo y no podrás cambiarlo.
        </p>
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Volver a revisar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className="px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Enviando voto…" : "Confirmar y enviar voto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VoteCard({
  assembly,
  topic,
  voter,
  onVoted,
}: {
  assembly: Assembly;
  topic: VotingTopic;
  voter: Voter;
  onVoted: (notice: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!voter.canVote) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Votación</h2>
        <p className="text-sm text-gray-600">
          Solo los residentes con una unidad asociada pueden votar. Puedes consultar la convocatoria
          y el plazo.
        </p>
      </div>
    );
  }

  if (topic.unitVote) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="text-[#0a2f1f]" size={22} />
          <h2 className="text-lg font-semibold text-gray-900">Tu unidad ya votó</h2>
        </div>
        <p className="text-sm text-gray-600">
          {voter.unitCode} registró su voto el {longDateTime(topic.unitVote.votedAt)}. El voto es
          secreto y no se puede modificar.
        </p>
      </div>
    );
  }

  if (topic.status !== "ABIERTA") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tu voto</h2>
        <p className="text-sm text-gray-600">
          {topic.status === "PROGRAMADA"
            ? `La votación aún no está abierta. Podrás votar a partir del ${longDateTime(topic.opensAt)}.`
            : `La votación cerró el ${longDateTime(topic.closesAt)}. Tu unidad no registró voto.`}
        </p>
      </div>
    );
  }

  const option = topic.options.find((o) => o.id === selected);

  const submit = async () => {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/temas/${topic.id}/votos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opcionId: selected }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        onVoted("Tu voto quedó registrado. Tu unidad ya votó en este tema.");
        return;
      }
      const message = apiErrorMessages(body, res.status).join(" ");
      if (res.status === 409 || res.status === 422) {
        onVoted(message);
        return;
      }
      setError(message);
    } catch {
      setError("No se pudo enviar el voto. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900">Tu voto</h2>
      <p className="text-xs text-gray-600 mt-1 mb-4">Selecciona una opción para esta propuesta.</p>
      <fieldset className="space-y-3">
        <legend className="sr-only">{topic.title}</legend>
        {topic.options.map((o) => {
          const checked = selected === o.id;
          return (
            <label
              key={o.id}
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition ${
                checked ? "border-[#0a2f1f] bg-[#e6f0eb]" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={`voto-${topic.id}`}
                value={o.id}
                checked={checked}
                onChange={() => setSelected(o.id)}
                className="mt-1 w-4 h-4 accent-[#0a2f1f]"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">{o.text}</span>
                {OPTION_HINT[o.text.toLocaleLowerCase("es")] && (
                  <span className="block text-xs text-gray-600 mt-1">
                    {OPTION_HINT[o.text.toLocaleLowerCase("es")]}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="flex items-start gap-2 bg-[#f5f0e6] rounded-lg p-3 text-xs text-gray-700 mt-4">
        <Lock size={16} className="shrink-0" /> Una vez que confirmes y envíes tu voto, no podrás modificarlo.
      </p>
      <button
        type="button"
        onClick={() => setReviewing(true)}
        disabled={!selected}
        className="w-full flex items-center justify-center gap-2 mt-4 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowRight size={18} /> Revisar mi voto
      </button>
      <p className="text-xs text-gray-500 text-center mt-2">Aún no se enviará. Primero verás una confirmación.</p>

      {reviewing && option && (
        <ConfirmDialog
          assembly={assembly}
          topic={topic}
          optionText={option.text}
          voter={voter}
          sending={sending}
          error={error}
          onCancel={() => {
            setReviewing(false);
            setError(null);
          }}
          onConfirm={() => void submit()}
        />
      )}
    </div>
  );
}

export default function ResidentAssemblyDetail({
  assemblyId,
  voter,
}: {
  assemblyId: string;
  voter: Voter;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; state: LoadState } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const state: LoadState = loaded?.attempt === attempt ? loaded.state : { kind: "loading" };

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<LoadState> => {
      try {
        const res = await fetch(`/api/asambleas/${assemblyId}`);
        if (res.ok) return { kind: "ready", assembly: await res.json() };
        if (res.status === 404 || res.status === 400) return { kind: "notFound" };
        return { kind: "error", message: apiErrorMessages(await res.json().catch(() => null), res.status).join(" ") };
      } catch {
        return { kind: "error", message: "No se pudo cargar la asamblea." };
      }
    };
    void load().then((next) => {
      if (!cancelled) setLoaded({ attempt, state: next });
    });
    return () => {
      cancelled = true;
    };
  }, [assemblyId, attempt]);

  const back = (
    <Link
      href="/asambleas"
      className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
    >
      <ArrowLeft size={18} /> Asambleas
    </Link>
  );

  if (state.kind !== "ready") {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Asambleas</p>
            <h1 className="text-4xl font-serif text-gray-900">Detalle de la asamblea</h1>
          </div>
          {back}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          {state.kind === "loading" && <p className="text-gray-600">Cargando asamblea…</p>}
          {state.kind === "notFound" && <p className="text-gray-700">Esta asamblea no existe o aún no se publica.</p>}
          {state.kind === "error" && (
            <>
              <p className="text-red-700 mb-4">{state.message}</p>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <RotateCw size={16} /> Reintentar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { assembly } = state;
  const openTopic = assembly.topics.find((t) => t.status === "ABIERTA");
  const pendingTopic = voter.canVote
    ? assembly.topics.find((t) => t.status === "ABIERTA" && !t.unitVote)
    : undefined;
  const firstTopic = assembly.topics[0];

  let banner: { title: string; text: string; tag: string };
  if (pendingTopic) {
    banner = {
      title: "La votación está abierta · Tu voto sigue pendiente",
      text: `Consulta la propuesta y revisa tu elección antes de enviarla. Cierre: ${longDateTime(pendingTopic.closesAt)}.`,
      tag: "Votación abierta",
    };
  } else if (openTopic) {
    banner = {
      title: voter.canVote ? "La votación está abierta · Tu unidad ya votó" : "La votación está abierta",
      text: `Cierre: ${longDateTime(openTopic.closesAt)}.`,
      tag: "Votación abierta",
    };
  } else if (assembly.status === "PROGRAMADA" && firstTopic) {
    banner = {
      title: "La votación aún no está abierta",
      text: `Podrás votar a partir del ${longDateTime(firstTopic.opensAt)}.`,
      tag: "Próxima",
    };
  } else {
    banner = {
      title: "La votación finalizó",
      text: firstTopic ? `Cerró el ${longDateTime(firstTopic.closesAt)}.` : "",
      tag: "Cerrada",
    };
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Asambleas</p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">{assembly.title}</h1>
          <p className="text-gray-600">
            {assembly.folio} · Asamblea {TYPE_LABEL[assembly.type].toLowerCase()} · {CONDOMINIO.nombre}
          </p>
        </div>
        {back}
      </div>

      {notice && (
        <div role="status" className="bg-[#e6f0eb] rounded-xl p-4 flex items-start justify-between gap-4 mb-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckCircle2 className="text-[#0a2f1f]" size={20} /> {notice}
          </p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-gray-500">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="bg-[#f5f0e6] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Vote className="text-[#0a2f1f] mt-0.5 shrink-0" size={22} />
          <div>
            <p className="font-semibold text-gray-900">{banner.title}</p>
            <p className="text-xs text-gray-600 mt-1">{banner.text}</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#e6f0eb] text-xs font-semibold text-gray-900">{banner.tag}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Convocatoria</h2>
              <CalendarDays className="text-[#0a2f1f]" size={20} />
            </div>
            <p className="text-sm text-gray-700 mb-5 whitespace-pre-line">{assembly.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Detail label="Fecha de la asamblea" value={formatDate(assembly.startsAt)} />
              <Detail
                label="Horario de la asamblea"
                value={`${formatTime(assembly.startsAt).replace(" h", "")}–${formatTime(assembly.endsAt)}`}
              />
              <Detail label={`Lugar · ${MODALITY_LABEL[assembly.modality]}`} value={assembly.location} />
              <Detail
                label="Convocatoria publicada"
                value={assembly.publishedAt ? `${formatDate(assembly.publishedAt)} · Administración` : "—"}
              />
            </div>
          </section>

          {assembly.agenda.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agenda</h2>
              <ol className="space-y-4">
                {assembly.agenda.map((item, index) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#f5f0e6] text-xs font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {assembly.topics.map((topic, index) => (
            <section key={topic.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Propuesta a votar</h2>
                <span className="text-[11px] uppercase tracking-wider text-gray-500">
                  {assembly.topics.length === 1 ? "Propuesta única" : `Propuesta ${index + 1} de ${assembly.topics.length}`}
                </span>
              </div>
              <p className="text-xl font-semibold text-gray-900 mt-4">{topic.title}</p>
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{topic.description}</p>
              <p className="flex items-start gap-2 bg-[#f5f0e6] rounded-lg p-3 text-xs text-gray-700 mt-4">
                <Info size={16} className="shrink-0" /> Tu elección corresponde únicamente a esta propuesta, no a
                los demás puntos de la agenda.
              </p>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          {assembly.topics.map((topic, index) => (
            <div key={topic.id} className="space-y-4">
              <div className="bg-[#0a2f1f] text-white rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold">
                    Plazo para votar{assembly.topics.length > 1 ? ` · Propuesta ${index + 1}` : ""}
                  </h2>
                  <Clock size={20} className="text-[#c9b98f]" />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-[#c9b98f]">Apertura de votación</p>
                <p className="text-sm mt-1">{longDateTime(topic.opensAt)}</p>
                <p className="text-[11px] uppercase tracking-wider text-[#c9b98f] mt-4">Cierre de votación</p>
                <p className="text-2xl font-semibold mt-1">{longDateTime(topic.closesAt)}</p>
                <p className="text-xs text-gray-200 mt-4">
                  El plazo de votación es distinto del horario de la asamblea.
                  {topic.status === "ABIERTA" ? " Puedes participar hasta el cierre indicado." : ""}
                </p>
              </div>
              <VoteCard
                assembly={assembly}
                topic={topic}
                voter={voter}
                onVoted={(message) => {
                  setNotice(message);
                  setAttempt((a) => a + 1);
                }}
              />
            </div>
          ))}
          <p className="text-xs text-gray-500 px-2">
            Se registra un solo voto por unidad en cada propuesta. Las fechas usan la hora local de{" "}
            {CONDOMINIO.nombre}.
          </p>
        </aside>
      </div>

      <InfoTimestamp />
    </div>
  );
}
