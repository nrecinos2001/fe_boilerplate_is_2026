import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  FilePlus,
  FileText,
  Grid2X2,
  Megaphone,
  Package,
  PieChart,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { CONDOMINIO } from "@/lib/condominio";

export default async function MiComunidadPage() {
  const user = await getCurrentUser();

  const role = user?.role;
  const name = user?.email
    ? user.email
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Usuario";

  const sections = [
    ...(role === "RESIDENTE"
      ? [
          {
            title: "Cartelera de comunicados",
            description: "Lee avisos oficiales y comunicados urgentes del condominio.",
            href: "/cartelera",
            icon: Megaphone,
          },
          {
            title: "Directorio de vecinos",
            description: "Consulta contactos autorizados y configura tu privacidad.",
            href: "/directorio",
            icon: BookOpen,
          },
          {
            title: "Áreas comunes",
            description: "Consulta la disponibilidad de las áreas del condominio.",
            href: "/areas/disponibilidad",
            icon: Grid2X2,
          },
          {
            title: "Reservas",
            description: "Gestiona tus reservas de áreas comunes.",
            href: "/reservas/nueva",
            icon: CalendarDays,
          },
          {
            title: "Mis visitas",
            description: "Consulta y registra las visitas autorizadas.",
            href: "/visitas",
            icon: Users,
          },
          {
            title: "Paquetes",
            description: "Consulta el estado de tus paquetes recibidos.",
            href: "/paquetes",
            icon: Package,
          },
          {
            title: "Incidencias",
            description: "Consulta o registra problemas en el condominio.",
            href: "/incidencias",
            icon: FileText,
          },
        ]
      : []),

    ...(role === "ADMINISTRADOR"
      ? [
          {
            title: "Registrar usuario",
            description: "Da de alta a residentes y al personal de seguridad.",
            href: "/usuarios",
            icon: UserPlus,
          },
          {
            title: "Publicar comunicado",
            description: "Redacta y envía comunicados informativos o urgentes.",
            href: "/administracion/cartelera/nuevo",
            icon: FilePlus,
          },
          {
            title: "Reporte de incidencias",
            description: "Analiza incidencias abiertas por fecha y sección.",
            href: "/reportes/incidencias",
            icon: BarChart3,
          },
          {
            title: "Reporte de votaciones",
            description: "Consulta el porcentaje de participación en asambleas.",
            href: "/reportes/votaciones",
            icon: PieChart,
          },
          {
            title: "Administración de incidencias",
            description: "Consulta y gestiona los reportes del condominio.",
            href: "/admin/incidencias",
            icon: ShieldCheck,
          },
          {
            title: "Asambleas",
            description: "Gestiona las convocatorias y asambleas.",
            href: "/admin/asambleas",
            icon: CalendarDays,
          },
          {
            title: "Áreas comunes",
            description: "Consulta la gestión de las áreas del condominio.",
            href: "/areas",
            icon: Grid2X2,
          },
          {
            title: "Cuotas y reglas",
            description: "Consulta las reglas y configuraciones de cuotas.",
            href: "/cuotas/reglas",
            icon: Wallet,
          },
        ]
      : []),

    ...(role === "SEGURIDAD"
      ? [
          {
            title: "Panel de seguridad",
            description: "Consulta la información y los movimientos de acceso.",
            href: "/seguridad/panel",
            icon: ShieldCheck,
          },
          {
            title: "Registro de visitas",
            description: "Registra entradas y salidas de visitantes.",
            href: "/seguridad/visitas",
            icon: Users,
          },
          {
            title: "Paquetes",
            description: "Registra llegadas y consulta paquetes pendientes.",
            href: "/paquetes/nuevo",
            icon: Package,
          },
        ]
      : []),

    // El backend solo da notificaciones a residentes.
    ...(role === "RESIDENTE"
      ? [
          {
            title: "Notificaciones",
            description: "Consulta los avisos y novedades del condominio.",
            href: "/notificaciones",
            icon: Bell,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-[#164a33] mb-2">
          {CONDOMINIO.nombre}
        </p>

        <h1 className="text-3xl font-semibold text-gray-900">
          Bienvenido, {name}
        </h1>

        <p className="text-gray-500 mt-2">
          Consulta la información de tu comunidad y accede rápidamente a sus
          funcionalidades.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Accesos directos
            </h2>
            <p className="text-sm text-gray-500">
              Secciones disponibles para tu cuenta.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sections.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#164a33] hover:shadow-md"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#e8f0eb] text-[#164a33] mb-4">
                <Icon size={22} />
              </div>

              <h3 className="font-semibold text-gray-900 group-hover:text-[#164a33]">
                {title}
              </h3>

              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {description}
              </p>

              <span className="inline-block text-sm font-medium text-[#164a33] mt-4">
                Ir a la sección →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
