"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Check,
  ChevronDown,
  Circle,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import { CONDOMINIO, aIsoCondominio } from "@/lib/condominio";
import {
  DEFAULT_OPTIONS,
  MODALITY_LABEL,
  TYPE_LABEL,
  apiErrorMessages,
  isoToLocal,
  localToIso,
  partsInCondo,
  shortDateTime,
  type Assembly,
  type AssemblyInput,
} from "@/lib/asambleas";

const optionSchema = z.object({ text: z.string().trim() });

const topicSchema = z.object({
  title: z.string().trim().min(1, "El título de la propuesta es obligatorio.").max(150, "Máximo 150 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "La descripción de la propuesta es obligatoria.")
    .max(1000, "Máximo 1000 caracteres."),
  opensAt: z.string().min(1, "Indica la apertura de la votación."),
  closesAt: z.string().min(1, "Indica el cierre de la votación."),
  options: z.array(optionSchema),
});

const schema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio.").max(150, "Máximo 150 caracteres."),
    type: z.enum(["ORDINARIA", "EXTRAORDINARIA"], { message: "Selecciona el tipo de asamblea." }),
    modality: z.enum(["PRESENCIAL", "VIRTUAL", "HIBRIDA"], { message: "Selecciona la modalidad." }),
    date: z.string().min(1, "Indica la fecha de la reunión."),
    startTime: z.string().min(1, "Indica la hora de inicio."),
    endTime: z.string().min(1, "Indica la hora de fin."),
    location: z.string().trim().min(1, "El lugar es obligatorio.").max(150, "Máximo 150 caracteres."),
    description: z
      .string()
      .trim()
      .min(1, "La descripción de la convocatoria es obligatoria.")
      .max(2000, "Máximo 2000 caracteres."),
    agenda: z
      .array(
        z.object({
          title: z.string().trim().min(1, "El título del punto es obligatorio.").max(150, "Máximo 150 caracteres."),
          description: z.string().trim().max(500, "Máximo 500 caracteres."),
        }),
      )
      .max(20, "La agenda admite como máximo 20 puntos."),
    topics: z
      .array(topicSchema)
      .min(1, "Agrega al menos una propuesta a votar.")
      .max(10, "Máximo 10 propuestas."),
  })
  .superRefine((values, ctx) => {
    const minute = Math.floor(Date.now() / 60_000) * 60_000;

    if (values.date && values.startTime) {
      const starts = new Date(aIsoCondominio(values.date, values.startTime)).getTime();
      if (starts < minute) {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: "La fecha y hora de la reunión deben ser posteriores a la actual.",
        });
      }
      if (values.endTime && values.endTime <= values.startTime) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "La hora de fin debe ser posterior a la de inicio.",
        });
      }
    }

    values.topics.forEach((topic, index) => {
      const texts = topic.options.map((o) => o.text).filter(Boolean);
      if (texts.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["topics", index, "options"],
          message: "Cada propuesta necesita al menos 2 opciones.",
        });
      }
      const normalized = texts.map((t) => t.toLocaleLowerCase("es"));
      if (new Set(normalized).size !== normalized.length) {
        ctx.addIssue({
          code: "custom",
          path: ["topics", index, "options"],
          message: "Las opciones no pueden repetirse.",
        });
      }
      if (topic.opensAt) {
        const opens = new Date(localToIso(topic.opensAt)).getTime();
        if (opens < minute) {
          ctx.addIssue({
            code: "custom",
            path: ["topics", index, "opensAt"],
            message: "La apertura no puede ser anterior a la fecha y hora actuales.",
          });
        }
        if (topic.closesAt && topic.closesAt <= topic.opensAt) {
          ctx.addIssue({
            code: "custom",
            path: ["topics", index, "closesAt"],
            message: "El cierre debe ser posterior a la apertura.",
          });
        }
      }
    });
  });

type FormValues = z.input<typeof schema>;

const emptyTopic = (): FormValues["topics"][number] => ({
  title: "",
  description: "",
  opensAt: "",
  closesAt: "",
  options: DEFAULT_OPTIONS.map((text) => ({ text })),
});

function toFormValues(assembly?: Assembly): FormValues {
  if (!assembly) {
    return {
      title: "",
      type: "" as FormValues["type"],
      modality: "" as FormValues["modality"],
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      agenda: [],
      topics: [emptyTopic()],
    };
  }
  const starts = partsInCondo(assembly.startsAt);
  return {
    title: assembly.title,
    type: assembly.type,
    modality: assembly.modality,
    date: starts.date,
    startTime: starts.time,
    endTime: partsInCondo(assembly.endsAt).time,
    location: assembly.location,
    description: assembly.description,
    agenda: assembly.agenda.map((item) => ({
      title: item.title,
      description: item.description ?? "",
    })),
    topics: assembly.topics.map((topic) => ({
      title: topic.title,
      description: topic.description,
      opensAt: isoToLocal(topic.opensAt),
      closesAt: isoToLocal(topic.closesAt),
      options: topic.options.map((option) => ({ text: option.text })),
    })),
  };
}

function toInput(values: FormValues): AssemblyInput {
  return {
    title: values.title.trim(),
    type: values.type,
    modality: values.modality,
    startsAt: aIsoCondominio(values.date, values.startTime),
    endsAt: aIsoCondominio(values.date, values.endTime),
    location: values.location.trim(),
    description: values.description.trim(),
    agenda: values.agenda.map((item) => ({
      title: item.title.trim(),
      ...(item.description.trim() ? { description: item.description.trim() } : {}),
    })),
    topics: values.topics.map((topic) => ({
      title: topic.title.trim(),
      description: topic.description.trim(),
      opensAt: localToIso(topic.opensAt),
      closesAt: localToIso(topic.closesAt),
      options: topic.options.map((o) => o.text.trim()).filter(Boolean),
    })),
  };
}

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition ${
    hasError ? "border-red-500" : "border-gray-300"
  }`;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

function TopicCard({
  index,
  total,
  control,
  register,
  errors,
  onRemove,
}: {
  index: number;
  total: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  onRemove: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `topics.${index}.options`,
  });
  const topicErrors = errors.topics?.[index];
  const prefix = `topics.${index}` as const;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {total > 1 ? `Propuesta a votar ${index + 1}` : "Propuesta a votar"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Los votos corresponderán solo a esta decisión, no a toda la agenda.
          </p>
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-sm text-red-700 hover:underline"
          >
            <Trash2 size={16} /> Quitar propuesta
          </button>
        )}
      </div>

      <div>
        <Label htmlFor={`${prefix}.title`}>Título de la propuesta *</Label>
        <input
          id={`${prefix}.title`}
          {...register(`${prefix}.title`)}
          className={inputClass(Boolean(topicErrors?.title))}
        />
        <FieldError message={topicErrors?.title?.message} />
      </div>

      <div>
        <Label htmlFor={`${prefix}.description`}>Descripción y alcance *</Label>
        <textarea
          id={`${prefix}.description`}
          rows={3}
          {...register(`${prefix}.description`)}
          className={inputClass(Boolean(topicErrors?.description))}
        />
        <FieldError message={topicErrors?.description?.message} />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          Opciones de voto *
        </legend>
        <div className="flex flex-wrap gap-2">
          {fields.map((field, optionIndex) => (
            <div
              key={field.id}
              className="flex items-center gap-1 bg-[#e6f0eb] rounded-full pl-3 pr-1 py-1"
            >
              <label htmlFor={`${prefix}.options.${optionIndex}.text`} className="sr-only">
                Opción {optionIndex + 1}
              </label>
              <input
                id={`${prefix}.options.${optionIndex}.text`}
                {...register(`${prefix}.options.${optionIndex}.text`)}
                placeholder="Opción"
                className="bg-transparent text-xs font-semibold text-gray-900 w-28 outline-none"
              />
              <button
                type="button"
                onClick={() => remove(optionIndex)}
                aria-label={`Quitar opción ${optionIndex + 1}`}
                className="p-1 text-gray-600 hover:text-red-700"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {fields.length < 10 && (
            <button
              type="button"
              onClick={() => append({ text: "" })}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-gray-400 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} /> Opción
            </button>
          )}
        </div>
        <FieldError message={topicErrors?.options?.message ?? topicErrors?.options?.root?.message} />
      </fieldset>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-semibold text-gray-900">Plazo de votación</p>
        <p className="text-xs text-gray-500 mb-3">
          Es distinto del horario de la reunión. Fechas y horas locales de {CONDOMINIO.nombre}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${prefix}.opensAt`}>Apertura de votación *</Label>
            <input
              id={`${prefix}.opensAt`}
              type="datetime-local"
              {...register(`${prefix}.opensAt`)}
              className={inputClass(Boolean(topicErrors?.opensAt))}
            />
            <FieldError message={topicErrors?.opensAt?.message} />
          </div>
          <div>
            <Label htmlFor={`${prefix}.closesAt`}>Cierre de votación *</Label>
            <input
              id={`${prefix}.closesAt`}
              type="datetime-local"
              {...register(`${prefix}.closesAt`)}
              className={inputClass(Boolean(topicErrors?.closesAt))}
            />
            <FieldError message={topicErrors?.closesAt?.message} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckItem({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {ok ? (
        <Check size={16} className="text-[#0a2f1f] shrink-0" />
      ) : (
        <Circle size={14} className="text-gray-400 shrink-0" />
      )}
      <span className={ok ? "text-gray-900" : "text-gray-500"}>{children}</span>
    </li>
  );
}

export default function AssemblyForm({ assembly }: { assembly?: Assembly }) {
  const router = useRouter();
  const [assemblyId, setAssemblyId] = useState<string | null>(assembly?.id ?? null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [audience, setAudience] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(assembly),
  });

  const agenda = useFieldArray({ control, name: "agenda" });
  const topics = useFieldArray({ control, name: "topics" });
  const values = useWatch({ control }) as FormValues;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/asambleas/audiencia")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { residents: number } | null) => {
        if (!cancelled && body) setAudience(body.residents);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (input: AssemblyInput): Promise<Assembly> => {
    const res = await fetch(assemblyId ? `/api/asambleas/${assemblyId}` : "/api/asambleas", {
      method: assemblyId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw apiErrorMessages(body, res.status);
    setAssemblyId((body as Assembly).id);
    return body as Assembly;
  };

  const submit = (mode: "draft" | "publish") =>
    handleSubmit(async (formValues) => {
      setServerErrors([]);
      setSubmitting(mode);
      try {
        const saved = await save(toInput(formValues));
        if (mode === "draft") {
          router.push(`/admin/asambleas?guardada=${encodeURIComponent(saved.folio)}`);
          return;
        }
        const res = await fetch(`/api/asambleas/${saved.id}/publicacion`, { method: "POST" });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw apiErrorMessages(body, res.status);
        router.push(`/admin/asambleas?publicada=${encodeURIComponent(saved.folio)}`);
      } catch (error) {
        setServerErrors(
          Array.isArray(error) ? error.map(String) : ["No se pudo guardar la convocatoria."],
        );
        setSubmitting(null);
      }
    })();

  const topicValues = values.topics ?? [];
  const opens = topicValues.map((t) => t.opensAt).filter(Boolean).sort();
  const closes = topicValues.map((t) => t.closesAt).filter(Boolean).sort();
  const scheduleOk = Boolean(
    values.title?.trim() &&
      values.location?.trim() &&
      values.date &&
      values.startTime &&
      values.endTime &&
      values.endTime > values.startTime,
  );
  const contentOk =
    topicValues.length > 0 &&
    (values.agenda ?? []).every((item) => item.title?.trim()) &&
    topicValues.every(
      (t) =>
        t.title?.trim() &&
        t.description?.trim() &&
        (t.options ?? []).filter((o) => o.text?.trim()).length >= 2,
    );
  const periodOk =
    topicValues.length > 0 &&
    topicValues.every((t) => t.opensAt && t.closesAt && t.closesAt > t.opensAt);
  const meetingLabel =
    values.date && values.startTime
      ? `${shortDateTime(aIsoCondominio(values.date, values.startTime)).replace(" h", "")}${
          values.endTime ? `–${values.endTime}` : ""
        } h`
      : "Fecha por definir";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Participación de la comunidad
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">
            {assembly ? "Editar borrador" : "Convocar asamblea"}
          </h1>
          <p className="text-gray-600">
            Prepara la convocatoria, define las propuestas y revisa la información antes de
            publicarla.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#f5f0e6] text-xs font-semibold text-gray-900">
          {assembly ? `${assembly.folio} · ` : ""}Borrador · No publicada
        </span>
      </div>

      <div className="bg-[#e6f0eb] rounded-xl p-5 flex items-start gap-3 mb-6">
        <CalendarPlus className="text-[#0a2f1f] mt-0.5 shrink-0" size={22} />
        <div>
          <p className="font-semibold text-gray-900">
            Una convocatoria nueva para {CONDOMINIO.nombre}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            El borrador aún no es visible para los residentes. Publicarlo enviará una
            notificación; la votación abrirá en la fecha y hora indicadas.
          </p>
        </div>
      </div>

      <form
        noValidate
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start"
      >
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Información de la asamblea</h2>
              <p className="text-xs text-gray-500 mt-1">
                Los campos con * son obligatorios. Condominio: {CONDOMINIO.nombre}.
              </p>
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <input id="title" {...register("title")} className={inputClass(Boolean(errors.title))} />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo de asamblea *</Label>
                <div className="relative">
                  <select
                    id="type"
                    {...register("type")}
                    className={`${inputClass(Boolean(errors.type))} appearance-none pr-10`}
                  >
                    <option value="">Selecciona el tipo</option>
                    {Object.entries(TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                </div>
                <FieldError message={errors.type?.message} />
              </div>
              <div>
                <Label htmlFor="modality">Modalidad *</Label>
                <div className="relative">
                  <select
                    id="modality"
                    {...register("modality")}
                    className={`${inputClass(Boolean(errors.modality))} appearance-none pr-10`}
                  >
                    <option value="">Selecciona la modalidad</option>
                    {Object.entries(MODALITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                </div>
                <FieldError message={errors.modality?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Fecha de reunión *</Label>
                <input id="date" type="date" {...register("date")} className={inputClass(Boolean(errors.date))} />
                <FieldError message={errors.date?.message} />
              </div>
              <div>
                <Label htmlFor="startTime">Hora de inicio *</Label>
                <input id="startTime" type="time" {...register("startTime")} className={inputClass(Boolean(errors.startTime))} />
                <FieldError message={errors.startTime?.message} />
              </div>
              <div>
                <Label htmlFor="endTime">Hora de fin *</Label>
                <input id="endTime" type="time" {...register("endTime")} className={inputClass(Boolean(errors.endTime))} />
                <FieldError message={errors.endTime?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Lugar *</Label>
              <input
                id="location"
                {...register("location")}
                placeholder="Ej. Salón de eventos · Casa club"
                className={inputClass(Boolean(errors.location))}
              />
              <FieldError message={errors.location?.message} />
            </div>

            <div>
              <Label htmlFor="description">Descripción de la convocatoria *</Label>
              <textarea
                id="description"
                rows={4}
                {...register("description")}
                className={inputClass(Boolean(errors.description))}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900">Agenda</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Orden de los temas que se tratarán en la reunión. No se votan.
            </p>
            {agenda.fields.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">Aún no hay puntos en la agenda.</p>
            )}
            <ol className="space-y-4 mb-4">
              {agenda.fields.map((field, index) => (
                <li key={field.id} className="flex gap-3 items-start">
                  <span className="shrink-0 w-7 h-7 mt-2 rounded-full bg-[#f5f0e6] text-xs font-semibold text-gray-900 flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <label htmlFor={`agenda.${index}.title`} className="sr-only">
                      Título del punto {index + 1}
                    </label>
                    <input
                      id={`agenda.${index}.title`}
                      {...register(`agenda.${index}.title`)}
                      placeholder="Título del punto"
                      className={inputClass(Boolean(errors.agenda?.[index]?.title))}
                    />
                    <FieldError message={errors.agenda?.[index]?.title?.message} />
                    <label htmlFor={`agenda.${index}.description`} className="sr-only">
                      Descripción del punto {index + 1}
                    </label>
                    <input
                      id={`agenda.${index}.description`}
                      {...register(`agenda.${index}.description`)}
                      placeholder="Descripción breve (opcional)"
                      className={inputClass(Boolean(errors.agenda?.[index]?.description))}
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => agenda.move(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Subir el punto ${index + 1}`}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => agenda.move(index, index + 1)}
                      disabled={index === agenda.fields.length - 1}
                      aria-label={`Bajar el punto ${index + 1}`}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => agenda.remove(index)}
                      aria-label={`Quitar el punto ${index + 1}`}
                      className="p-1 text-gray-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            {agenda.fields.length < 20 && (
              <button
                type="button"
                onClick={() => agenda.append({ title: "", description: "" })}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                <Plus size={16} /> Añadir punto
              </button>
            )}
          </section>

          {topics.fields.map((field, index) => (
            <TopicCard
              key={field.id}
              index={index}
              total={topics.fields.length}
              control={control}
              register={register}
              errors={errors}
              onRemove={() => topics.remove(index)}
            />
          ))}
          <FieldError message={errors.topics?.message ?? errors.topics?.root?.message} />
          {topics.fields.length < 10 && (
            <button
              type="button"
              onClick={() => topics.append(emptyTopic())}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              <Plus size={16} /> Añadir propuesta a votar
            </button>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="bg-[#0a2f1f] text-white rounded-xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9b98f]">
              Revisión de convocatoria
            </p>
            <h2 className="text-2xl font-serif mt-3 break-words">
              {values.title?.trim() || "Sin título"}
            </h2>
            <p className="text-xs text-[#c9b98f] mt-2">
              {values.type ? TYPE_LABEL[values.type] : "Tipo por definir"} · {CONDOMINIO.nombre}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-[#c9b98f] mt-5">
              Reunión {values.modality ? MODALITY_LABEL[values.modality].toLowerCase() : ""}
            </p>
            <p className="text-sm mt-1">{meetingLabel}</p>
            <p className="text-sm text-gray-200">{values.location?.trim() || "Lugar por definir"}</p>
            <p className="text-[11px] uppercase tracking-wider text-[#c9b98f] mt-5">
              Votación programada
            </p>
            <p className="text-sm mt-1">
              {opens.length ? `Desde ${shortDateTime(localToIso(opens[0]))}` : "Apertura por definir"}
            </p>
            <p className="text-sm">
              {closes.length
                ? `Hasta ${shortDateTime(localToIso(closes[closes.length - 1]))}`
                : "Cierre por definir"}
            </p>
            <p className="text-xs text-[#c9b98f] mt-5">
              {(values.agenda ?? []).length} puntos de agenda · {topicValues.length}{" "}
              {topicValues.length === 1 ? "propuesta" : "propuestas"}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revisión completa</h2>
            <ul className="space-y-3">
              <CheckItem ok={scheduleOk}>Título, sede y horario definidos</CheckItem>
              <CheckItem ok={contentOk}>Agenda y propuestas completas</CheckItem>
              <CheckItem ok={periodOk}>Plazo de votación válido</CheckItem>
            </ul>
            <p className="text-xs text-gray-600 border-t border-gray-200 mt-5 pt-4">
              Se publicará para {CONDOMINIO.nombre} y se notificará a{" "}
              {audience === null ? "los" : audience} residentes con acceso activo.
            </p>
          </div>

          <div className="bg-[#f5f0e6] border border-[#e8dfcf] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirmar publicación</h2>
            <p className="text-sm text-gray-700 mb-4">
              La convocatoria será visible para los residentes.
              {opens.length
                ? ` La votación permanecerá programada hasta el ${shortDateTime(localToIso(opens[0]))}.`
                : ""}
            </p>

            {serverErrors.length > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <ul className="space-y-1">
                  {serverErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            <label className="flex items-start gap-3 text-sm text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#0a2f1f]"
              />
              He revisado la convocatoria y confirmo que está lista para publicarse.
            </label>

            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={() => void submit("publish")}
                disabled={!confirmed || submitting !== null}
                className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
                {submitting === "publish" ? "Publicando…" : "Publicar convocatoria"}
              </button>
              <button
                type="button"
                onClick={() => void submit("draft")}
                disabled={submitting !== null}
                className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition disabled:opacity-50"
              >
                {submitting === "draft" ? "Guardando…" : "Guardar borrador"}
              </button>
              <Link href="/admin/asambleas" className="text-sm text-[#0a2f1f] underline">
                Volver a asambleas
              </Link>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Aún no se ha publicado ni enviado ninguna notificación.
            </p>
          </div>
        </aside>
      </form>

      <InfoTimestamp />
    </div>
  );
}
