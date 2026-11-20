import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AppNotification } from "@/src/types/notifications";
import { BellBadge } from "./bell-badge";
import { NotificationList } from "./notification-list";

const notice = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 1,
  title: "Clase cancelada",
  message: "La clase Yoga Flow fue cancelada.",
  source: "CLASSES",
  createdAt: new Date(2026, 10, 13, 8, 30).toISOString(),
  isRead: false,
  ...overrides,
});

const noop = () => undefined;

describe("BellBadge", () => {
  it("sin avisos sin leer no muestra el contador", () => {
    const html = renderToStaticMarkup(<BellBadge unread={0} />);
    expect(html).not.toContain('data-testid="bell-badge"');
    expect(html).toContain("no tienes avisos sin leer");
  });

  it("muestra la cantidad sin leer", () => {
    const html = renderToStaticMarkup(<BellBadge unread={7} />);
    expect(html).toMatch(/data-testid="bell-badge"[^>]*>7</);
    expect(html).toContain("Avisos: 7 sin leer");
  });

  it("por encima de 99 muestra 99+", () => {
    const html = renderToStaticMarkup(<BellBadge unread={150} />);
    expect(html).toMatch(/data-testid="bell-badge"[^>]*>99\+</);
  });
});

describe("NotificationList", () => {
  it("sin avisos muestra el mensaje vacío", () => {
    const html = renderToStaticMarkup(<NotificationList notifications={[]} onMarkRead={noop} />);
    expect(html).toContain("No tienes avisos.");
  });

  it("muestra título, mensaje, fecha y módulo de origen en el orden recibido", () => {
    const html = renderToStaticMarkup(
      <NotificationList
        notifications={[
          notice({ id: 2, title: "Pago registrado", source: "PAYMENTS" }),
          notice({ id: 1 }),
        ]}
        onMarkRead={noop}
      />,
    );
    expect(html).toContain("Pago registrado");
    expect(html).toContain("La clase Yoga Flow fue cancelada.");
    expect(html).toContain("13/11/2026 08:30");
    expect(html).toContain("Pagos");
    expect(html).toContain("Clases grupales");
    expect(html.indexOf("Pago registrado")).toBeLessThan(html.indexOf("Clase cancelada"));
  });

  it("solo los avisos sin leer tienen el botón de marcar como leído", () => {
    const html = renderToStaticMarkup(
      <NotificationList
        notifications={[notice({ id: 1, isRead: false }), notice({ id: 2, isRead: true })]}
        onMarkRead={noop}
      />,
    );
    expect(html.match(/Marcar como leído/g)).toHaveLength(1);
    expect(html).toContain('data-read="false"');
    expect(html).toContain('data-read="true"');
  });

  it("deshabilita el botón del aviso que se está marcando", () => {
    const html = renderToStaticMarkup(
      <NotificationList notifications={[notice({ id: 5 })]} markingId={5} onMarkRead={noop} />,
    );
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Marcar como leído/);
  });
});
