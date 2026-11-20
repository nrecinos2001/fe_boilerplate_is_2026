import Image from "next/image";
import type { ComponentType } from "react";
import { CoffeeIcon, DropletsIcon, DumbbellIcon, LockKeyholeIcon } from "./icons";
import { ArrowUpRight, PhotoPlaceholder, SectionLabel, SectionTitle } from "./ui";

const FIGURES = [
  { value: "850", label: "m² para ir más allá" },
  { value: "40+", label: "clases cada semana" },
  { value: "12", label: "personas máximo por grupo" },
  { value: "100%", label: "acompañamiento humano" },
] as const;

export function ClubSection() {
  return (
    <section id="el-club" className="bg-gym-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[52px] px-4 py-[88px] sm:px-8 lg:px-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-[72px]">
          <div className="flex flex-col gap-6 lg:w-[710px] lg:shrink-0">
            <SectionLabel>01 / NO ES SOLO UN GIMNASIO</SectionLabel>
            <SectionTitle className="text-gym-text lg:text-[64px]">
              MENOS EXCUSAS.
              <br />
              MÁS DE LO QUE ERES.
            </SectionTitle>
          </div>
          <div className="flex flex-1 flex-col gap-5 font-body text-[16px] lg:pt-10">
            <p className="leading-[1.65] text-gym-muted">
              No necesitas estar en forma para empezar. Solo necesitas un lugar donde hacerlo
              bien. En GymHub combinamos método, acompañamiento y ganas de superarnos.
            </p>
            <p className="leading-[1.6] font-semibold text-gym-text">
              Tú traes la actitud. Nosotros ponemos el resto.
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-gym-line" />

        <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FIGURES.map((figure) => (
            <div key={figure.value} className="flex items-center gap-[18px]">
              <dt className="font-display text-[59px] leading-none font-semibold text-gym-text">
                {figure.value}
              </dt>
              <dd className="w-[140px] font-body text-[12px] leading-[1.6] text-gym-muted">
                {figure.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const DISCIPLINES = [
  {
    name: "FUERZA",
    image: "/home/disciplina-fuerza.jpg",
    imageAlt: "Atleta realizando una sentadilla con barra",
    tags: "TÉCNICA · POTENCIA · PROGRESO",
    description:
      "Construye una base sólida. Barras, mancuernas y un plan que evoluciona contigo.",
  },
  {
    name: "HYBRID",
    image: "/home/disciplina-hybrid.jpg",
    imageAlt: "Atleta entrenando resistencia sobre césped artificial",
    tags: "RESISTENCIA · RITMO · ENERGÍA",
    description:
      "Fuerza y cardio en equipo. Sesiones intensas para descubrir hasta dónde puedes llegar.",
  },
  {
    name: "BOXING",
    image: "/home/disciplina-boxing.jpg",
    imageAlt: "Atleta golpeando un saco de boxeo",
    tags: "COORDINACIÓN · FOCO · ACTITUD",
    description:
      "Aprende la técnica, libera tensión y encuentra tu ritmo. Sin contacto, sin límites.",
  },
] as const;

export function DisciplinesSection() {
  return (
    <section id="disciplinas" className="bg-gym-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pt-[88px] pb-24 sm:px-8 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[800px] flex-col gap-[22px]">
            <SectionLabel>02 / ENCUENTRA TU FORMA</SectionLabel>
            <SectionTitle>DISTINTOS CAMINOS. TU MISMA META.</SectionTitle>
          </div>
          <p className="w-[270px] font-body text-[14px] leading-[1.6] text-gym-muted">
            Elige lo que te mueve.
            <br />
            Nosotros lo adaptamos a ti.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
          {DISCIPLINES.map((discipline, index) => (
            <li key={discipline.name}>
              <a href="#reserva" className="group flex flex-col">
                <div className="relative h-[340px] overflow-hidden">
                  <Image
                    src={discipline.image}
                    alt={discipline.imageAlt}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-5 left-5 bg-gym-ink p-2 font-body text-[11px] text-gym-text">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col gap-3.5 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-[44px] leading-none font-semibold text-gym-text">
                      {discipline.name}
                    </h3>
                    <ArrowUpRight
                      variant="lime-lg"
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </div>
                  <p className="font-body text-[10px] font-medium tracking-[1.2px] text-gym-lime">
                    {discipline.tags}
                  </p>
                  <p className="font-body text-[14px] leading-[1.65] text-gym-muted">
                    {discipline.description}
                  </p>
                  <p className="font-body text-[11px] whitespace-pre text-gym-muted">
                    {"50 MIN  /  TODOS LOS NIVELES"}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface Amenity {
  label: string;
  Icon: ComponentType<{ className?: string }>;
}

const AMENITIES: Amenity[] = [
  { label: "Material profesional", Icon: DumbbellIcon },
  { label: "Vestuarios y taquillas", Icon: LockKeyholeIcon },
  { label: "Duchas y amenities", Icon: DropletsIcon },
  { label: "Café y zona social", Icon: CoffeeIcon },
];

export function FacilitiesSection() {
  return (
    <section id="instalaciones" className="bg-gym-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-24 sm:px-8 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[760px] flex-col gap-[22px]">
            <SectionLabel>03 / EL ESPACIO IMPORTA</SectionLabel>
            <SectionTitle>
              DISEÑADO PARA ENTRENAR.
              <br />
              HECHO PARA QUEDARTE.
            </SectionTitle>
          </div>
          <p className="max-w-[472px] font-body text-[14px] leading-[1.65] text-gym-muted">
            Luz natural, material de primera y espacio para moverte de verdad. Un antiguo taller
            convertido en tu nuevo punto de encuentro.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[854fr_438fr]">
          <figure className="relative h-[320px] overflow-hidden md:h-[400px]">
            <PhotoPlaceholder label="Sala de fuerza con racks y luz natural" />
            <figcaption className="absolute bottom-6 left-6 flex items-center gap-6 bg-gym-ink px-4 py-3 font-body text-[11px] tracking-[1.2px] text-gym-text">
              01 / SALA DE FUERZA
              <ArrowUpRight className="size-4" />
            </figcaption>
          </figure>
          <figure className="relative h-[320px] overflow-hidden md:h-[400px]">
            <PhotoPlaceholder label="Lounge con sofá y plantas" />
            <figcaption className="absolute bottom-6 left-6 bg-gym-ink px-4 py-3 font-body text-[11px] tracking-[1.2px] text-gym-text">
              02 / LOUNGE Y CAFETERÍA
            </figcaption>
          </figure>
        </div>

        <ul className="grid grid-cols-2 gap-6 md:flex md:justify-between">
          {AMENITIES.map(({ label, Icon }) => (
            <li key={label} className="flex items-center gap-3 font-body text-[13px] text-gym-text">
              <Icon className="shrink-0 text-gym-lime" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
