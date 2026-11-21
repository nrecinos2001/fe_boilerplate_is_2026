"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Package as PackageIcon,
  PackagePlus,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import UnitPicker from "@/app/components/paquetes/UnitPicker";
import InfoTimestamp from "@/app/components/paquetes/InfoTimestamp";
import {
  CARRIERS,
  CONDOMINIUM,
  PICKUP_LOCATION,
  formatDate,
  formatTime,
  readError,
  type Package,
  type Unit,
} from "@/lib/paquetes";

const OTHER_CARRIER = "__otra__";

const schema = z
  .object({
    carrierOption: z.string().min(1, "Selecciona la empresa de mensajería."),
    carrierOther: z.string().trim().max(60, "Máximo 60 caracteres."),
    trackingReference: z
      .string()
      .trim()
      .min(1, "La referencia o guía es obligatoria.")
      .max(100, "Máximo 100 caracteres."),
    description: z
      .string()
      .trim()
      .min(1, "La descripción del paquete es obligatoria.")
      .max(200, "Máximo 200 caracteres."),
    notes: z.string().trim().max(300, "Máximo 300 caracteres."),
    unitId: z.string().min(1, "Selecciona la unidad destinataria."),
    recipientName: z
      .string()
      .trim()
      .min(1, "El nombre del destinatario es obligatorio.")
      .max(100, "Máximo 100 caracteres."),
  })
  .superRefine((values, ctx) => {
    if (values.carrierOption === OTHER_CARRIER && !values.carrierOther) {
      ctx.addIssue({
        code: "custom",
        path: ["carrierOther"],
        message: "Escribe el nombre de la empresa de mensajería.",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  carrierOption: "",
  carrierOther: "",
  trackingReference: "",
  description: "",
  notes: "",
  unitId: "",
  recipientName: "",
};

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition ${
    hasError ? "border-red-500" : "border-gray-300"
  }`;

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-sm text-red-700">{message}</p>
  ) : null;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value || "—"}</p>
    </div>
  );
}

export default function RegisterPackageForm({ guardName }: { guardName: string }) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Package | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const values = { ...DEFAULTS, ...useWatch({ control }) };
  const carrier =
    values.carrierOption === OTHER_CARRIER
      ? values.carrierOther.trim()
      : values.carrierOption;

  const selectUnit = (selected: Unit | null) => {
    setUnit(selected);
    setValue("unitId", selected?.id ?? "", { shouldValidate: Boolean(selected) });
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/paquetes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: data.unitId,
          recipientName: data.recipientName,
          carrier:
            data.carrierOption === OTHER_CARRIER
              ? data.carrierOther
              : data.carrierOption,
          trackingReference: data.trackingReference,
          description: data.description,
          ...(data.notes ? { notes: data.notes } : {}),
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setRegistered(await res.json());
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "No se pudo registrar el paquete.",
      );
    }
  };

  const registerAnother = () => {
    reset(DEFAULTS);
    setUnit(null);
    setRegistered(null);
  };

  if (registered) {
    return (
      <div className="max-w-2xl mx-auto mt-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="text-[#0a2f1f]" size={28} />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Llegada registrada
              </p>
              <h1 className="text-3xl font-serif text-gray-900">
                {registered.folio}
              </h1>
            </div>
          </div>
          <p className="text-gray-700 mb-6">
            El paquete quedó <strong>pendiente de retiro</strong> bajo custodia
            de la {PICKUP_LOCATION.toLowerCase()}. El residente recibirá su
            código de retiro.
          </p>
          <div className="grid grid-cols-2 gap-5 border-t border-gray-200 pt-6 mb-8">
            <SummaryItem
              label="Destinatario"
              value={`${registered.recipientName} · ${registered.unit.code}`}
            />
            <SummaryItem label="Transportista" value={registered.carrier} />
            <SummaryItem
              label="Recibido"
              value={`${formatDate(registered.receivedAt)} · ${formatTime(registered.receivedAt)}`}
            />
            <SummaryItem label="Recibió" value={`${guardName} · Seguridad`} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={registerAnother}
              className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition"
            >
              <PackagePlus size={18} /> Registrar otro paquete
            </button>
            <Link
              href="/paquetes"
              className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
            >
              Ver paquetes pendientes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Recepción de paquetes
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">
            Registrar llegada de paquete
          </h1>
          <p className="text-gray-600">
            Registra el paquete recibido en caseta y vincúlalo con su
            destinatario.
          </p>
        </div>
        <Link
          href="/paquetes"
          className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
        >
          <PackageIcon size={18} /> Paquetes pendientes
        </Link>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start"
      >
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos de recepción
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="carrierOption"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Transportista *
                </label>
                <div className="relative">
                  <select
                    id="carrierOption"
                    {...register("carrierOption")}
                    aria-invalid={Boolean(errors.carrierOption)}
                    className={`${inputClass(Boolean(errors.carrierOption))} appearance-none pr-10`}
                  >
                    <option value="">Selecciona una empresa</option>
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={OTHER_CARRIER}>Otra empresa</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    size={18}
                  />
                </div>
                <FieldError message={errors.carrierOption?.message} />
                {values.carrierOption === OTHER_CARRIER && (
                  <div className="mt-2">
                    <label htmlFor="carrierOther" className="sr-only">
                      Nombre de la empresa
                    </label>
                    <input
                      id="carrierOther"
                      {...register("carrierOther")}
                      placeholder="Nombre de la empresa"
                      aria-invalid={Boolean(errors.carrierOther)}
                      className={inputClass(Boolean(errors.carrierOther))}
                    />
                    <FieldError message={errors.carrierOther?.message} />
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="trackingReference"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Referencia o guía *
                </label>
                <input
                  id="trackingReference"
                  {...register("trackingReference")}
                  placeholder="Ej. EST-629483715"
                  aria-invalid={Boolean(errors.trackingReference)}
                  className={inputClass(Boolean(errors.trackingReference))}
                />
                <FieldError message={errors.trackingReference?.message} />
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descripción del paquete *
              </label>
              <input
                id="description"
                {...register("description")}
                placeholder="Ej. 1 caja mediana de cartón, cerrada."
                aria-invalid={Boolean(errors.description)}
                className={inputClass(Boolean(errors.description))}
              />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Observaciones (opcional)
              </label>
              <input
                id="notes"
                {...register("notes")}
                placeholder="Ej. Sin daños visibles en el empaque."
                aria-invalid={Boolean(errors.notes)}
                className={inputClass(Boolean(errors.notes))}
              />
              <FieldError message={errors.notes?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
              <SummaryItem
                label="Lugar de resguardo"
                value={`${PICKUP_LOCATION} · ${CONDOMINIUM}`}
              />
              <SummaryItem label="Recibe" value={`${guardName} · Seguridad`} />
            </div>
            <p className="text-xs text-gray-500 mt-4">
              La fecha y hora de recepción se guardarán al registrar la llegada.
            </p>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Destinatario</h2>
            <input type="hidden" {...register("unitId")} />
            <UnitPicker
              value={values.unitId}
              onChange={selectUnit}
              error={errors.unitId?.message}
            />
            <div>
              <label
                htmlFor="recipientName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre del destinatario *
              </label>
              <input
                id="recipientName"
                {...register("recipientName")}
                placeholder="Como aparece en la etiqueta del paquete"
                aria-invalid={Boolean(errors.recipientName)}
                className={inputClass(Boolean(errors.recipientName))}
              />
              <FieldError message={errors.recipientName?.message} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <span className="inline-block px-3 py-1 rounded-full bg-[#f5f0e6] text-xs font-semibold text-gray-900 mb-4">
              Recepción sin registrar
            </span>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revisar llegada
            </h2>
            <div className="space-y-4">
              <SummaryItem label="Transportista" value={carrier} />
              <SummaryItem label="Referencia" value={values.trackingReference} />
              <SummaryItem
                label="Destinatario"
                value={[values.recipientName.trim(), unit?.code]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <SummaryItem label="Contenido registrado" value={values.description} />
            </div>
            <p className="text-sm text-gray-600 border-t border-gray-200 mt-5 pt-5 mb-5">
              Al registrar se asignará un folio y el paquete quedará pendiente
              de retiro, bajo custodia de caseta.
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
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <PackagePlus size={18} />
                {isSubmitting ? "Registrando…" : "Registrar llegada"}
              </button>
              <Link
                href="/paquetes"
                className="px-5 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
              >
                Cancelar
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Durante el envío, Registrar llegada se deshabilita para evitar
              duplicados.
            </p>
          </div>

          <div className="bg-[#f5f0e6] rounded-xl p-5 flex items-start gap-3">
            <PackageIcon className="text-[#0a2f1f] mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-gray-900">Recibir no es entregar</p>
              <p className="text-sm text-gray-600 mt-1">
                La entrega se registra por separado, validando el código de
                retiro presentado por el residente.
              </p>
            </div>
          </div>
        </aside>
      </form>

      <InfoTimestamp />
    </div>
  );
}
