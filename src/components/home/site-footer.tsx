import { ArrowUpRight, GymHubMark } from "./ui";

const HOURS = [
  { days: "Lun–Vie", time: "07:00–22:00" },
  { days: "Sábados", time: "09:00–14:00" },
  { days: "Domingos", time: "Descanso activo" },
] as const;

const LEGAL_LINKS = ["Aviso legal", "Privacidad", "Cookies"] as const;

function ColumnTitle({ children }: { children: string }) {
  return (
    <h3 className="font-body text-[10px] font-semibold tracking-[1.6px] text-gym-muted">{children}</h3>
  );
}

export function SiteFooter() {
  return (
    <footer id="contacto" className="bg-gym-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-16 pb-7 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <GymHubMark size="lg" />
              <span className="font-display text-[50px] leading-none font-bold text-gym-text">
                GymHub
              </span>
            </div>
            <p className="font-body text-[13px] leading-[1.6] text-gym-muted">
              Entrena con intención.
              <br />
              Vive por encima de tus límites.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <ColumnTitle>VISÍTANOS</ColumnTitle>
            <address className="font-body text-[14px] leading-[1.7] text-gym-text not-italic">
              Boulevard de Los Próceres
              <br />
              San Salvador
            </address>
            <a
              href="https://maps.google.com/?q=Boulevard+de+Los+Proceres+San+Salvador"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 font-body text-[12px] text-gym-lime hover:underline"
            >
              Cómo llegar
              <ArrowUpRight variant="lime" className="size-4" />
            </a>
          </div>

          <div className="flex flex-col gap-4">
            <ColumnTitle>AQUÍ PARA TI</ColumnTitle>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-body text-[14px] leading-[1.7]">
              {HOURS.map((row) => (
                <div key={row.days} className="contents">
                  <dt className="text-gym-muted">{row.days}</dt>
                  <dd className="text-gym-text">{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-4">
            <ColumnTitle>HABLEMOS</ColumnTitle>
            <div className="flex flex-col font-body text-[14px] leading-[1.7] text-gym-text">
              <a href="mailto:hola@gymhub.club" className="hover:text-gym-lime">
                hola@gymhub.club
              </a>
              <a href="tel:+50376188058" className="hover:text-gym-lime">
                +503 7618 8058
              </a>
            </div>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 font-body text-[12px] text-gym-lime hover:underline"
            >
              Instagram
              <ArrowUpRight variant="lime" className="size-4" />
            </a>
          </div>
        </div>

        <p
          aria-hidden
          className="mt-11 font-display text-[64px] leading-[0.95] font-bold tracking-[-1px] text-gym-signature sm:text-[96px] lg:text-[132px]"
        >
          NO ES EL LÍMITE. ES EL COMIENZO.
        </p>

        <div className="mt-11 h-px w-full bg-gym-line" />

        <div className="mt-11 flex flex-col gap-4 font-body text-[10px] text-gym-muted lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} GymHub Club de Fuerza. Todos los derechos reservados.</p>
          <ul className="flex gap-[26px]">
            {LEGAL_LINKS.map((link) => (
              <li key={link}>
                <a href="#" className="hover:text-gym-text">
                  {link}
                </a>
              </li>
            ))}
          </ul>
          <p className="tracking-[1.4px]">HECHO CON ACTITUD EN SAN SALVADOR</p>
        </div>
      </div>
    </footer>
  );
}
