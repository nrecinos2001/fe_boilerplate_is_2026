"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Download, Info, RotateCw } from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import { formatDate, formatTime } from "@/lib/paquetes";
import {
  STATUS_LABEL,
  STATUS_STYLE,
  apiErrorMessages,
  formatPercent,
  shortDateTime,
  type Assembly,
  type TopicAudit,
  type TopicResults,
  type VotingTopic,
} from "@/lib/asambleas";

type TopicData = { results: TopicResults; audit: TopicAudit | null };

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "ready"; assembly: Assembly; topics: Record<string, TopicData> };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(apiErrorMessages(body, res.status).join(" "));
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return body as T;
}

function PdfButton({ topic, folio }: { topic: VotingTopic; folio: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/temas/${topic.id}/auditoria/pdf`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(apiErrorMessages(body, res.status).join(" "));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `auditoria-${folio}-propuesta-${topic.position + 1}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void download()}
        disabled={downloading}
        className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-semibold hover:bg-[#164a33] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={18} /> {downloading ? "DESCARGANDO…" : "EXPORTAR PDF"}
      </button>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-xs text-red-700">
          <AlertCircle size={14} /> {error}
          <button type="button" onClick={() => void download()} className="underline font-semibold">
            Reintentar
          </button>
        </p>
      )}
    </div>
  );
}

function TopicSection({
  assembly,
  topic,
  data,
  index,
}: {
  assembly: Assembly;
  topic: VotingTopic;
  data: TopicData;
  index: number;
}) {
  const { results, audit } = data;
  const tally = results.results;
  const multiple = assembly.topics.length > 1;

  return (
    <section className="space-y-6">
      {multiple && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <h2 className="text-2xl font-serif text-gray-900">Propuesta {index + 1}</h2>
          {results.status === "CERRADA" && <PdfButton topic={topic} folio={assembly.folio} />}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-stretch">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900">Propuesta sometida a votación</h3>
          <p className="text-xs text-gray-500 mt-1">Una propuesta · Una respuesta por unidad habilitada</p>
          <p className="text-sm font-semibold text-gray-900 mt-4">{topic.title}</p>
          <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{topic.description}</p>
          {assembly.agenda.length > 0 && (
            <p className="text-xs text-gray-500 mt-4">
              Agenda: {assembly.agenda.map((a) => a.title.toLocaleLowerCase("es")).join(" · ")}.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Votación: {shortDateTime(topic.opensAt)} – {shortDateTime(topic.closesAt)}.
          </p>
        </div>
        <div className="bg-[#0a2f1f] text-white rounded-xl p-6">
          <p className="text-[11px] uppercase tracking-widest text-[#c9b98f]">
            {tally ? "Participación final" : "Participación"}
          </p>
          {tally ? (
            <>
              <p className="text-5xl font-serif my-4">{formatPercent(tally.participation)}</p>
              <p>
                {tally.unitsVoted} participantes / {tally.eligibleUnits} habilitadas
              </p>
              <p className="text-xs text-[#c9b98f] mt-4">
                {tally.eligibleUnits} unidades registradas al abrir esta votación.{" "}
                {tally.eligibleUnits - tally.unitsVoted} no participaron.
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl font-serif my-4">{results.unitsVoted}</p>
              <p>{results.unitsVoted === 1 ? "unidad ha votado" : "unidades han votado"}</p>
              <p className="text-xs text-[#c9b98f] mt-4">
                {results.status === "ABIERTA"
                  ? `La votación sigue abierta hasta el ${shortDateTime(results.closesAt)}. El conteo por opción se muestra al cierre.`
                  : `La votación abre el ${shortDateTime(results.opensAt)}.`}
              </p>
            </>
          )}
        </div>
      </div>

      {tally && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recuento agregado por opción</h3>
            <p className="text-xs text-gray-500 mt-1 mb-5">
              Base: {tally.totalVotes} votos emitidos · Porcentajes con dos decimales
            </p>
            <ul className="space-y-5">
              {tally.options.map((option) => (
                <li key={option.optionId}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-900">{option.text}</span>
                    <span className="font-semibold text-gray-900">
                      {option.votes} {option.votes === 1 ? "voto" : "votos"} · {formatPercent(option.percentage)}
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full bg-[#f5f0e6] overflow-hidden"
                    role="progressbar"
                    aria-label={option.text}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={option.percentage}
                  >
                    <div className="h-full rounded-full bg-[#2f6b4f]" style={{ width: `${option.percentage}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:border-l lg:border-gray-200 lg:pl-8">
            <p className="font-semibold text-gray-900">Total emitido: {tally.totalVotes} votos</p>
            <p className="text-sm text-gray-700 mt-3">
              {tally.options.map((o) => `${o.votes} ${o.text.toLocaleLowerCase("es")}`).join(" + ")} ={" "}
              {tally.totalVotes}.
            </p>
            <p className={`text-xs mt-3 ${tally.consistent ? "text-gray-600" : "text-red-700 font-semibold"}`}>
              {tally.consistent
                ? `Coincide con las ${tally.unitsVoted} unidades que votaron.`
                : "La suma de votos no coincide con las unidades que votaron."}
            </p>
            <p className="text-sm text-gray-700 border-t border-gray-200 mt-5 pt-4">
              {tally.outcome === "GANADOR"
                ? `${tally.winner?.text} fue la opción más elegida.`
                : tally.outcome === "EMPATE"
                  ? `Empate entre ${tally.tiedOptions.join(" y ")}.`
                  : "No se registraron votos."}{" "}
              Este recuento no establece por sí solo una regla de aprobación ni un umbral legal.
            </p>
          </div>
        </div>
      )}

      {audit && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Auditoría de eventos del proceso</h3>
              <p className="text-xs text-gray-500 mt-1">
                No es un registro de votos individuales · Orden cronológico · Hora local del condominio
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-[#f5f0e6] text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Fecha y hora</th>
                    <th scope="col" className="px-4 py-3">Evento</th>
                    <th scope="col" className="px-4 py-3">Responsable</th>
                    <th scope="col" className="px-4 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.events.map((event) => (
                    <tr key={event.event} className="border-t border-gray-200 text-sm">
                      <td className="px-6 py-4 font-semibold text-gray-900">{shortDateTime(event.at)}</td>
                      <td className="px-4 py-4 text-gray-900">{event.event}</td>
                      <td className="px-4 py-4 text-gray-700">{event.responsible}</td>
                      <td className="px-4 py-4 text-gray-700">{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Participación por unidad</h3>
              <p className="text-xs text-gray-500 mt-1">
                Unidades que votaron y hora de su voto. No incluye la opción elegida.
              </p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-[#f5f0e6] text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">Unidad</th>
                  <th scope="col" className="px-4 py-3">Fecha y hora del voto</th>
                </tr>
              </thead>
              <tbody>
                {audit.participations.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-6 text-sm text-gray-600 text-center">
                      Ninguna unidad votó.
                    </td>
                  </tr>
                )}
                {audit.participations.map((row) => (
                  <tr key={row.unitCode} className="border-t border-gray-200 text-sm">
                    <td className="px-6 py-3 text-gray-900">
                      <span className="font-semibold">{row.unitCode}</span> · {row.unitDescription}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{shortDateTime(row.votedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default function AssemblyResults({ assemblyId }: { assemblyId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; state: LoadState } | null>(null);
  const state: LoadState = loaded?.attempt === attempt ? loaded.state : { kind: "loading" };

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<LoadState> => {
      try {
        const assembly = await getJson<Assembly>(`/api/asambleas/${assemblyId}`);
        const entries = await Promise.all(
          assembly.topics.map(async (topic) => {
            const results = await getJson<TopicResults>(`/api/temas/${topic.id}/resultados`);
            const audit =
              results.status === "CERRADA"
                ? await getJson<TopicAudit>(`/api/temas/${topic.id}/auditoria`)
                : null;
            return [topic.id, { results, audit }] as const;
          }),
        );
        return { kind: "ready", assembly, topics: Object.fromEntries(entries) };
      } catch (e) {
        const status = (e as { status?: number }).status;
        return {
          kind: "error",
          message: e instanceof Error ? e.message : "No se pudieron cargar los resultados.",
          notFound: status === 404 || status === 400,
        };
      }
    };
    void load().then((next) => {
      if (!cancelled) setLoaded({ attempt, state: next });
    });
    return () => {
      cancelled = true;
    };
  }, [assemblyId, attempt]);

  if (state.kind !== "ready") {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif text-gray-900 mb-6">Resultados y auditoría</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          {state.kind === "loading" && <p className="text-gray-600">Cargando resultados…</p>}
          {state.kind === "error" && (
            <>
              <p className="text-red-700 mb-4">{state.notFound ? "La asamblea no existe." : state.message}</p>
              {!state.notFound && (
                <button
                  type="button"
                  onClick={() => setAttempt((a) => a + 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  <RotateCw size={16} /> Reintentar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const { assembly } = state;
  const single = assembly.topics.length === 1 ? assembly.topics[0] : null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Asambleas · {assembly.folio}
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">Resultados y auditoría</h1>
          <p className="text-gray-600">
            {assembly.title} · Recuento final de la propuesta y trazabilidad del proceso.
          </p>
        </div>
        {single && state.topics[single.id].results.status === "CERRADA" && (
          <PdfButton topic={single} folio={assembly.folio} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className={`px-3 py-1 rounded-full font-semibold ${STATUS_STYLE[assembly.status]}`}>
            {STATUS_LABEL[assembly.status]}
          </span>
          Reunión: {formatDate(assembly.startsAt)}, {formatTime(assembly.startsAt).replace(" h", "")}–
          {formatTime(assembly.endsAt)} · {assembly.location} · Todo el condominio
        </p>
        <Link
          href="/admin/asambleas"
          className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Volver a asambleas
        </Link>
      </div>

      <div className="space-y-10">
        {assembly.topics.map((topic, index) => (
          <TopicSection
            key={topic.id}
            assembly={assembly}
            topic={topic}
            data={state.topics[topic.id]}
            index={index}
          />
        ))}
      </div>

      <div className="mt-8 bg-[#e6f0eb] rounded-xl p-5 flex items-start gap-4">
        <Info className="text-[#0a2f1f] mt-0.5 shrink-0" size={22} />
        <div>
          <p className="font-semibold text-gray-900">Resultados sin exposición de votos individuales</p>
          <p className="text-sm text-gray-600 mt-1">
            El PDF incluye la propuesta, los totales, la participación por unidad y los eventos del
            proceso. Ninguna vista muestra la opción elegida por una unidad: los votos se guardan sin
            la unidad que los emitió.
          </p>
        </div>
      </div>

      <InfoTimestamp />
    </div>
  );
}
