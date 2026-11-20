import Image from "next/image";
import { ArrowUpRight, CtaLink, PhotoPlaceholder, SectionLabel, SectionTitle } from "./ui";

const COACHES = [
  {
    name: "LUCÍA MARTÍN",
    image: "/home/coach-lucia.jpg",
    role: "HEAD COACH · FUERZA",
    quote: "Técnica primero. Confianza en cada repetición.",
  },
  {
    name: "DANI VEGA",
    image: "/home/coach-dani.jpg",
    role: "COACH · HYBRID",
    quote: "La energía que convierte un «no puedo» en otro más.",
  },
  {
    name: "SARA RUIZ",
    image: "/home/coach-sara.jpg",
    role: "COACH · BOXING",
    quote: "Precisión, ritmo y actitud. Dentro y fuera del ring.",
  },
] as const;

export function CoachesSection() {
  return (
    <section id="equipo" className="bg-gym-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-[88px] sm:px-8 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[840px] flex-col gap-[22px]">
            <SectionLabel>04 / TU EQUIPO</SectionLabel>
            <SectionTitle>EXIGEN LO MEJOR. TE DAN LO MEJOR.</SectionTitle>
          </div>
          <p className="w-[290px] font-body text-[14px] leading-[1.6] text-gym-muted">
            Profesionales que conocen tu nombre, tus objetivos y tu siguiente paso.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
          {COACHES.map((coach) => (
            <li key={coach.name} className="flex flex-col gap-[18px]">
              <div className="relative h-[330px] overflow-hidden">
                <Image
                  src={coach.image}
                  alt={`Retrato de ${coach.name.toLowerCase()}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[34px] leading-none font-semibold text-gym-text">
                  {coach.name}
                </h3>
                <ArrowUpRight variant="lime" />
              </div>
              <p className="font-body text-[10px] tracking-[1.3px] text-gym-lime">{coach.role}</p>
              <p className="font-body text-[13px] leading-[1.6] text-gym-muted">{coach.quote}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type Discipline = "Fuerza" | "Hybrid" | "Boxing";

const WEEK_DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"] as const;

const SCHEDULE: { time: string; classes: Discipline[] }[] = [
  { time: "07:00", classes: ["Fuerza", "Hybrid", "Fuerza", "Hybrid", "Fuerza"] },
  { time: "08:30", classes: ["Hybrid", "Fuerza", "Boxing", "Fuerza", "Hybrid"] },
  { time: "18:00", classes: ["Fuerza", "Boxing", "Hybrid", "Boxing", "Fuerza"] },
  { time: "19:30", classes: ["Boxing", "Hybrid", "Fuerza", "Hybrid", "Boxing"] },
];

export function ScheduleSection() {
  return (
    <section id="horarios" className="bg-gym-paper text-gym-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-9 px-4 py-[88px] sm:px-8 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[820px] flex-col gap-[22px]">
            <SectionLabel tone="light">05 / HAZLE SITIO A TU MEJOR VERSIÓN</SectionLabel>
            <SectionTitle className="text-gym-ink">TU DÍA. TU HORA. TU ENTRENO.</SectionTitle>
          </div>
          <a
            href="/classes"
            className="flex items-center gap-3 font-body text-[12px] font-medium hover:underline"
          >
            Ver horario completo
            <ArrowUpRight variant="dark" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left font-body">
            <thead>
              <tr className="border-b border-gym-ink/15">
                <th scope="col" className="w-[100px] pb-8 text-[10px] font-normal tracking-[1.2px] text-gym-ink/60">
                  HORA
                </th>
                {WEEK_DAYS.map((day) => (
                  <th key={day} scope="col" className="pb-8 text-[10px] font-semibold tracking-[1.4px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((slot) => (
                <tr key={slot.time} className="border-b border-gym-ink/15">
                  <th scope="row" className="py-5 text-[14px] font-medium">
                    {slot.time}
                  </th>
                  {slot.classes.map((discipline, index) => (
                    <td key={`${slot.time}-${WEEK_DAYS[index]}`} className="py-5">
                      <p className="text-[14px] font-semibold">{discipline}</p>
                      <p className="mt-1.5 text-[10px] text-gym-ink/60">50 min · 12 plazas</p>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 font-body text-[11px] text-gym-ink/70 sm:flex-row sm:justify-between">
          <p>También entrenamos los sábados de 09:00 a 14:00.</p>
          <p>Reserva desde la app · Cancela hasta 4 h antes</p>
        </div>
      </div>
    </section>
  );
}

interface Plan {
  name: string;
  tagline: string;
  price: number;
  badge: string;
  featured: boolean;
  perks: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: "BASE",
    tagline: "Tu primer paso. Tu nuevo hábito.",
    price: 59,
    badge: "ENCUENTRA TU RITMO",
    featured: false,
    perks: [
      "8 clases al mes",
      "Todas las disciplinas",
      "Valoración inicial incluida",
      "Reserva con 3 días de antelación",
    ],
    cta: "Elegir base",
  },
  {
    name: "IMPULSO",
    tagline: "Más constancia. Más posibilidades.",
    price: 79,
    badge: "EL FAVORITO DE LA COMUNIDAD",
    featured: true,
    perks: [
      "12 clases al mes",
      "Todas las disciplinas",
      "Valoración y revisión trimestral",
      "Reserva con 7 días de antelación",
    ],
    cta: "Elegir impulso",
  },
  {
    name: "SIN LÍMITES",
    tagline: "Todo el club. Todo tu potencial.",
    price: 99,
    badge: "ENCUENTRA TU RITMO",
    featured: false,
    perks: [
      "Clases ilimitadas",
      "Acceso libre a sala de fuerza",
      "Seguimiento mensual individual",
      "1 pase de invitado al mes",
    ],
    cta: "Elegir sin límites",
  },
];

export function PlansSection() {
  return (
    <section id="planes" className="bg-gym-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-24 sm:px-8 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[830px] flex-col gap-[22px]">
            <SectionLabel>06 / INVIERTE EN TI</SectionLabel>
            <SectionTitle>UN PLAN A LA ALTURA DE TUS GANAS.</SectionTitle>
          </div>
          <p className="w-[280px] font-body text-[14px] leading-[1.6] text-gym-muted">
            Sin matrícula. Sin permanencia.
            <br />
            Sin letra pequeña que te frene.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <li
              key={plan.name}
              className={`flex flex-col border ${
                plan.featured ? "border-gym-lime bg-gym-raised" : "border-gym-line bg-gym-surface"
              }`}
            >
              <p
                className={`flex h-8 items-center justify-center font-body text-[10px] font-bold tracking-[1.4px] ${
                  plan.featured ? "bg-gym-lime text-gym-ink" : "text-gym-muted"
                }`}
              >
                {plan.badge}
              </p>
              <div className="flex flex-1 flex-col gap-6 p-8">
                <div className="flex flex-col gap-[9px]">
                  <h3 className="font-display text-[36px] leading-none font-semibold text-gym-text">
                    {plan.name}
                  </h3>
                  <p className="font-body text-[13px] text-gym-muted">{plan.tagline}</p>
                </div>
                <p className="flex items-baseline gap-[7px]">
                  <span className="font-display text-[78px] leading-none font-semibold text-gym-text">
                    ${plan.price}
                  </span>
                  <span className="font-body text-[13px] text-gym-muted">/ mes</span>
                </p>
                <ul className="flex flex-1 flex-col gap-[17px] border-t border-gym-line pt-[22px] pb-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5">
                      <Image src="/home/check.svg" alt="" aria-hidden width={16} height={16} />
                      <span className="font-body text-[12px] leading-[1.5] text-gym-text">{perk}</span>
                    </li>
                  ))}
                </ul>
                <CtaLink href="#reserva" variant={plan.featured ? "primary" : "outline"} className="w-full">
                  {plan.cta}
                </CtaLink>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-center font-body text-[11px] leading-[1.6] text-gym-muted">
          IVA incluido en todos los planes. Renovación mensual. Puedes cambiar o cancelar tu plan
          hasta 7 días antes de la renovación.
        </p>
      </div>
    </section>
  );
}

export function CommunitySection() {
  return (
    <section aria-labelledby="comunidad-titulo" className="bg-gym-surface">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[530px_1fr]">
        <div className="relative h-[320px] lg:h-auto lg:min-h-[440px]">
          <PhotoPlaceholder label="Miembros del club conversando tras entrenar" />
        </div>
        <figure className="flex flex-col justify-center gap-6 px-4 py-16 sm:px-8 lg:px-16">
          <SectionLabel>07 / LO MEJOR DEL CLUB ES SU GENTE</SectionLabel>
          <blockquote
            id="comunidad-titulo"
            className="font-display text-[32px] leading-[1.1] font-semibold text-gym-text sm:text-[40px] lg:text-[44px]"
          >
            “VINE PARA PONERME EN FORMA.
            <br />
            ME QUEDÉ POR CÓMO ME HACEN SENTIR CADA VEZ QUE ENTRO.”
          </blockquote>
          <figcaption className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5 font-body">
              <span className="text-[13px] font-semibold text-gym-text">Marta G.</span>
              <span className="text-[10px] text-gym-muted">En GymHub desde 2024</span>
            </div>
            <div className="flex flex-col items-end gap-1.5 font-body">
              <span className="text-[16px] tracking-[3px] text-gym-lime" aria-label="5 de 5 estrellas">
                ★★★★★
              </span>
              <span className="text-[10px] text-gym-muted">4,9/5 · 126 reseñas en Google</span>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
