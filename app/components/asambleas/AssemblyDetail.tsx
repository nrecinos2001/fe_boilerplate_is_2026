"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Lock,
  Pencil,
  Plus,
  RotateCw,
  X,
} from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import { formatDate, formatTime } from "@/lib/paquetes";
import {
  MODALITY_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  TYPE_LABEL,
  apiErrorMessages,
  isoToLocal,
  localToIso,
  shortDateTime,
  type Assembly,
  type AssemblyStatus,
  type VotingTopic,
} from "@/lib/asambleas";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; assembly: Assembly };

const LOCK_REASON: Partial<Record<AssemblyStatus, string>> = {
  ABIERTA: "La votación ya abrió; la propuesta no se puede modificar.",
  CERRADA: "La votación cerró; la propuesta no se puede modificar.",
};

const inputClass =
  "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none";

function Badge({ status }: { status: AssemblyStatus }) {
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function TopicEditor({
  topic,
  onCancel,
  onSaved,
}: {
  topic: VotingTopic;
  onCancel: () => void;
  onSaved: (assembly: Assembly) => void;
}) {
  const [title, setTitle] = useState(topic.title);
  const [description, setDescription] = useState(topic.description);
  const [opensAt, setOpensAt] = useState(isoToLocal(topic.opensAt));
  const [closesAt, setClosesAt] = useState(isoToLocal(topic.closesAt));
  const [options, setOptions] = useState(topic.options.map((o) => o.text));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    const local: string[] = [];
    if (!title.trim() || !description.trim()) local.push("El título y la descripción son obligatorios.");
    if (cleaned.length < 2) local.push("Cada propuesta necesita al menos 2 opciones.");
    if (!opensAt || !closesAt || closesAt <= opensAt) local.push("El cierre debe ser posterior a la apertura.");
    if (local.length) {
      setErrors(local);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/temas/${topic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          opensAt: localToIso(opensAt),
          closesAt: localToIso(closesAt),
          options: cleaned,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(apiErrorMessages(body, res.status));
        return;
      }
      onSaved(body as Assembly);
    } catch {
      setErrors(["No se pudo guardar la propuesta."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-4 mt-4 border-t border-gray-200 pt-4">
      <div>
        <label htmlFor={`t-${topic.id}`} className="block text-sm font-medium text-gray-700 mb-1">
          Título de la propuesta *
        </label>
        <input id={`t-${topic.id}`} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`d-${topic.id}`} className="block text-sm font-medium text-gray-700 mb-1">
          Descripción y alcance *
        </label>
        <textarea
          id={`d-${topic.id}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">Opciones de voto *</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-1 bg-[#e6f0eb] rounded-full pl-3 pr-1 py-1">
              <label htmlFor={`o-${topic.id}-${index}`} className="sr-only">
                Opción {index + 1}
              </label>
              <input
                id={`o-${topic.id}-${index}`}
                value={option}
                onChange={(e) =>
                  setOptions((all) => all.map((o, i) => (i === index ? e.target.value : o)))
                }
                className="bg-transparent text-xs font-semibold text-gray-900 w-28 outline-none"
              />
              <button
                type="button"
                onClick={() => setOptions((all) => all.filter((_, i) => i !== index))}
                aria-label={`Quitar opción ${index + 1}`}
                className="p-1 text-gray-600 hover:text-red-700"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {options.length < 10 && (
            <button
              type="button"
              onClick={() => setOptions((all) => [...all, ""])}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-gray-400 text-xs font-semibold text-gray-700"
            >
              <Plus size={14} /> Opción
            </button>
          )}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`a-${topic.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            Apertura de votación *
          </label>
          <input
            id={`a-${topic.id}`}
            type="datetime-local"
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`c-${topic.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            Cierre de votación *
          </label>
          <input
            id={`c-${topic.id}`}
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      {errors.length > 0 && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <ul className="space-y-1">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function AssemblyDetail({ assemblyId }: { assemblyId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; state: LoadState } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [savedTopic, setSavedTopic] = useState<string | null>(null);

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
        return { kind: "error", message: "No se pudo cargar la convocatoria." };
      }
    };
    void load().then((next) => {
      if (!cancelled) setLoaded({ attempt, state: next });
    });
    return () => {
      cancelled = true;
    };
  }, [assemblyId, attempt]);

  const header = (subtitle: string) => (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Participación de la comunidad
        </p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">Convocatoria</h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      <Link
        href="/admin/asambleas"
        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        <ArrowLeft size={18} /> Asambleas
      </Link>
    </div>
  );

  if (state.kind === "loading") {
    return (
      <div className="max-w-7xl mx-auto">
        {header("Cargando convocatoria…")}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.kind !== "ready") {
    return (
      <div className="max-w-7xl mx-auto">
        {header("No se pudo mostrar la convocatoria.")}
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-red-700 mb-4">
            {state.kind === "notFound" ? "La asamblea no existe." : state.message}
          </p>
          {state.kind === "error" && (
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
            >
              <RotateCw size={16} /> Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  const { assembly } = state;

  return (
    <div className="max-w-7xl mx-auto">
      {header(
        `${assembly.folio} · ${assembly.publishedAt ? `Publicada el ${formatDate(assembly.publishedAt)}` : "Borrador"}`,
      )}

      {assembly.status === "BORRADOR" && (
        <div className="bg-[#f5f0e6] rounded-xl p-4 mb-6 text-sm text-gray-700">
          Esta convocatoria aún es un borrador.{" "}
          <Link href={`/admin/asambleas/${assembly.id}/editar`} className="font-semibold text-[#0a2f1f] underline">
            Editar y publicar
          </Link>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-serif text-gray-900">{assembly.title}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {TYPE_LABEL[assembly.type]} · {MODALITY_LABEL[assembly.modality]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge status={assembly.status} />
            {assembly.status !== "BORRADOR" && (
              <Link
                href={`/admin/asambleas/${assembly.id}/resultados`}
                className="text-sm font-semibold text-[#0a2f1f] underline underline-offset-4"
              >
                Resultados y auditoría
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <Detail
            label="Reunión"
            value={`${formatDate(assembly.startsAt)} · ${formatTime(assembly.startsAt).replace(" h", "")}–${formatTime(assembly.endsAt)}`}
          />
          <Detail label="Lugar" value={assembly.location} />
          <Detail label="Convocó" value={assembly.createdBy.email} />
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{assembly.description}</p>
      </section>

      {assembly.agenda.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
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

      <div className="space-y-4">
        {assembly.topics.map((topic, index) => {
          const lockReason = LOCK_REASON[topic.status];
          const editable = topic.status === "PROGRAMADA";
          return (
            <section key={topic.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500">
                    {assembly.topics.length > 1 ? `Propuesta ${index + 1}` : "Propuesta a votar"}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 mt-1">{topic.title}</h3>
                </div>
                <Badge status={topic.status} />
              </div>
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{topic.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {topic.options.map((option) => (
                  <span key={option.id} className="px-3 py-1 rounded-full bg-[#e6f0eb] text-xs font-semibold text-gray-900">
                    {option.text}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Votación: {shortDateTime(topic.opensAt)} → {shortDateTime(topic.closesAt)}
              </p>
              {savedTopic === topic.id && editing !== topic.id && (
                <p role="status" className="text-sm text-[#0a2f1f] font-semibold mt-3">
                  Propuesta actualizada.
                </p>
              )}

              {editing === topic.id ? (
                <TopicEditor
                  topic={topic}
                  onCancel={() => setEditing(null)}
                  onSaved={(updated) => {
                    setLoaded({ attempt, state: { kind: "ready", assembly: updated } });
                    setEditing(null);
                    setSavedTopic(topic.id);
                  }}
                />
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSavedTopic(null);
                      setEditing(topic.id);
                    }}
                    disabled={!editable}
                    aria-describedby={lockReason ? `lock-${topic.id}` : undefined}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {editable ? <Pencil size={16} /> : <Lock size={16} />} Editar propuesta
                  </button>
                  {lockReason && (
                    <p id={`lock-${topic.id}`} className="text-xs text-gray-500 mt-2">
                      {lockReason}
                    </p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <InfoTimestamp />
    </div>
  );
}
