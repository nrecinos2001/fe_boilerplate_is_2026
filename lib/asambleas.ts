import { CONDOMINIO, aIsoCondominio } from "@/lib/condominio";

export type AssemblyStatus = "BORRADOR" | "PROGRAMADA" | "ABIERTA" | "CERRADA";
export type AssemblyType = "ORDINARIA" | "EXTRAORDINARIA";
export type AssemblyModality = "PRESENCIAL" | "VIRTUAL" | "HIBRIDA";

export type VotingTopic = {
  id: string;
  title: string;
  description: string;
  opensAt: string;
  closesAt: string;
  position: number;
  status: AssemblyStatus;
  options: { id: string; text: string; position: number }[];
  unitVote: { votedAt: string } | null;
};

export const OPTION_HINT: Record<string, string> = {
  "a favor": "Apoyo la propuesta.",
  "en contra": "No apoyo la propuesta.",
  "abstención": "Prefiero abstenerme.",
};

export const RESIDENT_STATUS_LABEL: Record<AssemblyStatus, string> = {
  BORRADOR: "No publicada",
  PROGRAMADA: "Próxima",
  ABIERTA: "Votación abierta",
  CERRADA: "Cerrada",
};

export type AssemblySummary = {
  id: string;
  folio: string;
  title: string;
  type: AssemblyType;
  modality: AssemblyModality;
  startsAt: string;
  endsAt: string;
  location: string;
  publishedAt: string | null;
  status: AssemblyStatus;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  topicCount: number;
  agendaCount: number;
  pendingVotesForUnit: number | null;
};

export type Assembly = AssemblySummary & {
  description: string;
  createdBy: { id: string; email: string };
  createdAt: string;
  agenda: { id: string; title: string; description: string | null; position: number }[];
  topics: VotingTopic[];
};

export type AssemblyPage = {
  items: AssemblySummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  counts: Record<"TODAS" | AssemblyStatus, number>;
};

export type TopicInput = {
  title: string;
  description: string;
  opensAt: string;
  closesAt: string;
  options: string[];
};

export type AssemblyInput = {
  title: string;
  type: AssemblyType;
  modality: AssemblyModality;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  agenda: { title: string; description?: string }[];
  topics: TopicInput[];
};

export const DEFAULT_OPTIONS = ["A favor", "En contra", "Abstención"];

export const TYPE_LABEL: Record<AssemblyType, string> = {
  ORDINARIA: "Ordinaria",
  EXTRAORDINARIA: "Extraordinaria",
};

export const MODALITY_LABEL: Record<AssemblyModality, string> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  HIBRIDA: "Híbrida",
};

export const STATUS_LABEL: Record<AssemblyStatus, string> = {
  BORRADOR: "No publicada",
  PROGRAMADA: "Programada",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
};

export const STATUS_STYLE: Record<AssemblyStatus, string> = {
  BORRADOR: "bg-[#f5f0e6] text-[#0a2f1f]",
  PROGRAMADA: "bg-[#e6f0eb] text-[#0a2f1f]",
  ABIERTA: "bg-[#0a2f1f] text-white",
  CERRADA: "bg-gray-100 text-gray-700",
};

export function partsInCondo(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CONDOMINIO.zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function localToIso(dateTimeLocal: string): string {
  const [date, time] = dateTimeLocal.split("T");
  return aIsoCondominio(date, time.slice(0, 5));
}

export function isoToLocal(iso: string): string {
  const { date, time } = partsInCondo(iso);
  return `${date}T${time}`;
}

export function shortDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: CONDOMINIO.zonaHoraria,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month").replace(".", "")} · ${get("hour")}:${get("minute")} h`;
}

function humanize(message: string): string {
  return message
    .replace(/^topics\.(\d+)\.(?:options\.\d+\.)?/, (_, n: string) => `Propuesta ${Number(n) + 1}: `)
    .replace(/^agenda\.(\d+)\./, (_, n: string) => `Punto de agenda ${Number(n) + 1}: `);
}

export function apiErrorMessages(body: unknown, status: number): string[] {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.map((m) => humanize(String(m)));
  if (typeof message === "string" && message) return message.split(", ").map(humanize);
  return [`Error ${status}`];
}

export type OptionTally = {
  optionId: string;
  text: string;
  votes: number;
  percentage: number;
};

export type TopicTally = {
  options: OptionTally[];
  totalVotes: number;
  unitsVoted: number;
  eligibleUnits: number;
  participation: number;
  outcome: "GANADOR" | "EMPATE" | "SIN_VOTOS";
  winner: { optionId: string; text: string } | null;
  tiedOptions: string[];
  consistent: boolean;
};

export type TopicResults = {
  topicId: string;
  title: string;
  status: AssemblyStatus;
  opensAt: string;
  closesAt: string;
  unitsVoted: number;
  eligibleUnits: number | null;
  results: TopicTally | null;
};

export type TopicAudit = {
  participations: { unitCode: string; unitDescription: string; votedAt: string }[];
  events: { at: string; event: string; responsible: string; detail: string }[];
};

export function formatPercent(value: number): string {
  return `${value.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;
}
