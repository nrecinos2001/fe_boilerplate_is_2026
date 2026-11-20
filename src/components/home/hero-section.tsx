import { ArrowDownIcon } from "./icons";
import { ArrowUpRight, CtaLink, GymHubMark, PhotoPlaceholder } from "./ui";

const NAV_LINKS = [
  { href: "#el-club", label: "El club" },
  { href: "#disciplinas", label: "Disciplinas" },
  { href: "#equipo", label: "Equipo" },
  { href: "#horarios", label: "Horarios" },
  { href: "#planes", label: "Planes" },
] as const;

const VALUES = [
  "Fuerza con propósito",
  "Grupos reducidos",
  "Entrenamiento real",
  "Comunidad sin egos",
] as const;

function SiteHeader() {
  return (
    <header className="bg-gym-ink">
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8 lg:px-16">
        <a href="#inicio" className="flex items-center gap-2.5" aria-label="GymHub, inicio">
          <GymHubMark />
          <span className="font-display text-[32px] leading-none font-bold text-gym-text">
            GymHub
          </span>
          <span className="hidden w-[74px] font-body text-[8px] leading-[11px] font-semibold tracking-[1.4px] text-gym-muted sm:block">
            CLUB DE FUERZA
          </span>
        </a>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-[30px]">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-body text-[12px] text-gym-text transition-colors hover:text-gym-lime"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="inline-flex h-11 items-center justify-center gap-2 border border-gym-lime px-4 font-body text-[13px] text-gym-lime transition-colors hover:bg-gym-lime/10 sm:h-[54px] sm:gap-3 sm:px-5"
          >
            Inicio de sesión
            <ArrowUpRight variant="lime" className="size-4 sm:size-5" />
          </a>
          <CtaLink href="#reserva" className="h-11 gap-4 px-4 sm:h-[54px] sm:gap-6 sm:px-6">
            Reserva tu prueba
          </CtaLink>
        </div>
      </div>
    </header>
  );
}

export function HeroSection() {
  return (
    <section id="inicio" aria-label="Presentación">
      <SiteHeader />

      <div className="relative isolate overflow-hidden">
        <PhotoPlaceholder label="Atleta realizando peso muerto en la sala de fuerza" className="-z-20" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(17,19,16,0.92)_0%,rgba(17,19,16,0.55)_55%,rgba(17,19,16,0.15)_100%)]"
        />

        <div className="mx-auto flex min-h-[640px] max-w-[1440px] flex-col justify-between gap-12 px-4 pt-16 pb-8 sm:px-8 lg:min-h-[730px] lg:px-16">
          <div className="flex max-w-[760px] flex-col">
            <div className="flex items-center gap-2.5">
              <span className="size-[7px] bg-gym-lime" />
              <p className="font-body text-[11px] font-semibold tracking-[1.6px] text-gym-muted">
                SAN SALVADOR · EL SALVADOR · EST. 2024
              </p>
            </div>

            <h1 className="mt-6 font-display text-[64px] leading-[0.98] font-bold tracking-[-1px] text-gym-text sm:text-[96px] lg:text-[128px]">
              TU SIGUIENTE NIVEL EMPIEZA <span className="text-gym-lime">AQUÍ.</span>
            </h1>

            <p className="mt-6 max-w-[410px] font-body text-[16px] leading-[1.6] text-gym-text">
              Fuerza, energía y una comunidad que te impulsa. Entrena con intención. Supera tu
              propio umbral.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-6">
              <CtaLink href="#reserva">Prueba una clase gratis</CtaLink>
              <a
                href="#planes"
                className="inline-flex items-center gap-2 font-body text-[13px] text-gym-text transition-colors hover:text-gym-lime"
              >
                Explora los planes
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="flex items-end justify-between gap-6">
            <p className="font-body text-[10px] tracking-[1.6px] text-gym-muted">
              NO COMPITES CON NADIE. AVANZAS CONTIGO.
            </p>
            <a
              href="#el-club"
              className="hidden items-center gap-2.5 font-body text-[10px] tracking-[1.6px] text-gym-muted transition-colors hover:text-gym-text sm:flex"
            >
              DESCUBRE EL CLUB
              <ArrowDownIcon className="text-gym-text" />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-gym-lime">
        <ul className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-around gap-x-10 gap-y-3 px-4 py-[18px] sm:px-8 lg:px-14">
          {VALUES.map((value) => (
            <li key={value} className="flex items-center gap-[38px]">
              <span className="font-display text-[22px] leading-none font-bold tracking-[0.4px] text-gym-ink uppercase">
                {value}
              </span>
              <span aria-hidden className="grid size-[19px] place-items-center bg-gym-ink/15">
                <span className="size-[9px] bg-gym-ink" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
