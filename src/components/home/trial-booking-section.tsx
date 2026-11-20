"use client";

import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, SectionLabel } from "./ui";

interface TrialBookingForm {
  name: string;
  email: string;
  discipline: string;
  timeSlot: string;
  acceptsPrivacy: boolean;
}

const EMPTY_FORM: TrialBookingForm = {
  name: "",
  email: "",
  discipline: "",
  timeSlot: "",
  acceptsPrivacy: false,
};

const FIELD_CLASS =
  "h-[52px] w-full border border-gym-line bg-gym-ink px-3.5 font-body text-[12px] text-gym-text placeholder:text-gym-muted focus:border-gym-lime focus:outline-none";

interface FieldProps {
  id: string;
  label: string;
  children: ReactNode;
}

function Field({ id, label, children }: FieldProps) {
  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <label htmlFor={id} className="font-body text-[11px] font-medium text-gym-text">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectChevron() {
  return (
    <Image
      src="/home/chevron-down.svg"
      alt=""
      aria-hidden
      width={16}
      height={16}
      className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
    />
  );
}

export function TrialBookingSection() {
  const [form, setForm] = useState<TrialBookingForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof TrialBookingForm>(key: K, value: TrialBookingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setForm(EMPTY_FORM);
  }

  return (
    <section id="reserva" className="bg-gym-raised">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 py-20 sm:px-8 lg:flex-row lg:gap-[100px] lg:px-16">
        <div className="flex flex-col gap-[25px] lg:w-[620px] lg:shrink-0">
          <SectionLabel>09 / CRUZA TU UMBRAL</SectionLabel>
          <h2 className="font-display text-[56px] leading-[0.98] font-bold tracking-[-0.8px] text-gym-text sm:text-[80px] lg:text-[96px]">
            EL PRIMER PASO
            <br />
            ES TUYO.
          </h2>
          <p className="font-body text-[17px] leading-[1.6] text-gym-text">
            Tu primera clase es gratis.
            <br />
            Ven a conocernos. Lo demás empieza en la sala.
          </p>
          <p className="font-body text-[11px] text-gym-muted">
            50 minutos · Coach a tu lado · Cero compromiso
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-[22px]">
          <h3 className="font-body text-[20px] font-semibold text-gym-text">
            Reserva tu clase de prueba
          </h3>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="trial-name" label="Nombre *">
              <input
                id="trial-name"
                type="text"
                required
                autoComplete="given-name"
                placeholder="¿Cómo te llamas?"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className={FIELD_CLASS}
              />
            </Field>
            <Field id="trial-email" label="Email *">
              <input
                id="trial-email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className={FIELD_CLASS}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="trial-discipline" label="Disciplina *">
              <div className="relative">
                <select
                  id="trial-discipline"
                  required
                  value={form.discipline}
                  onChange={(event) => update("discipline", event.target.value)}
                  className={`${FIELD_CLASS} appearance-none pr-10 ${form.discipline ? "" : "text-gym-muted"}`}
                >
                  <option value="" disabled>
                    Elige tu clase
                  </option>
                  <option value="fuerza">Fuerza</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="boxing">Boxing</option>
                </select>
                <SelectChevron />
              </div>
            </Field>
            <Field id="trial-slot" label="¿Cuándo te viene bien?">
              <div className="relative">
                <select
                  id="trial-slot"
                  value={form.timeSlot}
                  onChange={(event) => update("timeSlot", event.target.value)}
                  className={`${FIELD_CLASS} appearance-none pr-10 ${form.timeSlot ? "" : "text-gym-muted"}`}
                >
                  <option value="">Mañana o tarde</option>
                  <option value="manana">Mañana</option>
                  <option value="tarde">Tarde</option>
                </select>
                <SelectChevron />
              </div>
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              required
              checked={form.acceptsPrivacy}
              onChange={(event) => update("acceptsPrivacy", event.target.checked)}
              className="mt-0.5 size-[15px] shrink-0 cursor-pointer appearance-none border border-gym-muted bg-transparent checked:border-gym-lime checked:bg-gym-lime"
            />
            <span className="font-body text-[10px] leading-[1.6] text-gym-muted">
              He leído y acepto la política de privacidad para gestionar mi reserva.
            </span>
          </label>

          <button
            type="submit"
            className="flex h-[54px] w-full items-center justify-center gap-6 bg-gym-lime px-6 font-body text-[13px] text-gym-ink transition-colors hover:bg-[#c3ea45]"
          >
            Quiero mi clase gratis
            <ArrowUpRight variant="dark" />
          </button>

          <p role="status" className="text-center font-body text-[10px] text-gym-muted">
            {submitted
              ? "¡Gracias! Hemos recibido tu solicitud. Te contactaremos en menos de 24 h."
              : "Te contactaremos en menos de 24 h para confirmar tu plaza."}
          </p>
        </form>
      </div>
    </section>
  );
}
