import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoleNavigationLinks } from "@/src/components/dashboard/role-navigation";
import * as api from "@/src/services/http/api-client";
import { fetchTrainerAgenda, markTrainerSessionResult } from "@/src/services/trainers/trainer-agenda-service";
import type { TrainerAgendaSession } from "@/src/types/trainer-agenda";
import { canMarkTrainerSession, EMPTY_TRAINER_AGENDA, TrainerAgendaPanel } from "./trainer-agenda-view";

const NOW = new Date('2026-11-18T12:00:00.000Z').getTime();
const session: TrainerAgendaSession = {
  id: 7,
  startsAt: new Date(NOW).toISOString(),
  endsAt: new Date(NOW + 60 * 60 * 1000).toISOString(),
  member: { id: 'member-1', fullName: 'Ana Miembro', email: 'ana@example.test' },
  chargeStatus: 'PAID',
  status: 'SCHEDULED',
  outcome: null,
  resultRecordedAt: null,
};

afterEach(() => vi.restoreAllMocks());

describe('H12 / FE-12.1', () => {
  it('protege la ventana desde el inicio hasta 24 horas, y no permite marcar dos veces', () => {
    expect(canMarkTrainerSession(session, NOW)).toBe(true);
    expect(canMarkTrainerSession(session, NOW + 24 * 60 * 60 * 1000)).toBe(true);
    expect(canMarkTrainerSession(session, NOW - 1)).toBe(false);
    expect(canMarkTrainerSession(session, NOW + 24 * 60 * 60 * 1000 + 1)).toBe(false);
    expect(canMarkTrainerSession({ ...session, status: 'COMPLETED' }, NOW)).toBe(false);
  });

  it('muestra agenda, cobro y botones solo al entrenador', () => {
    const html = renderToStaticMarkup(<TrainerAgendaPanel sessions={[session]} nowMs={NOW} loading={false} error={null} sessionExpired={false} busyId={null} onRetry={() => {}} onMark={() => {}} />);
    expect(html).toContain('Ana Miembro');
    expect(html).toContain('Pagado');
    expect(html).toContain('Realizada');
    expect(html).toContain('No asistió');
    const nav = renderToStaticMarkup(<RoleNavigationLinks status="authenticated" role="TRAINER" />);
    expect(nav).toContain('/entrenador/agenda');
    expect(nav).not.toContain('/miembro/sesiones');
  });

  it('muestra el mensaje vacío exacto', () => {
    const html = renderToStaticMarkup(<TrainerAgendaPanel sessions={[]} nowMs={NOW} loading={false} error={null} sessionExpired={false} busyId={null} onRetry={() => {}} onMark={() => {}} />);
    expect(html).toContain(EMPTY_TRAINER_AGENDA);
  });

  it('consulta la agenda sin enviar un entrenador distinto al del JWT', async () => {
    const spy = vi.spyOn(api, 'apiFetch').mockResolvedValue(new Response(JSON.stringify({ data: [session] }), { status: 200 }));
    const result = await fetchTrainerAgenda();
    expect(spy).toHaveBeenCalledWith('personal-sessions/trainer/me');
    expect(result.data?.[0].member.fullName).toBe('Ana Miembro');
  });

  it('registra No asistió y conserva el error de plazo 409', async () => {
    const spy = vi.spyOn(api, 'apiFetch').mockResolvedValueOnce(new Response(JSON.stringify({ ...session, status: 'COMPLETED', outcome: 'NO_SHOW', resultRecordedAt: new Date(NOW).toISOString() }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Solo puedes marcar el resultado desde el inicio de la sesión y hasta 24 horas después.' }), { status: 409 }));
    const ok = await markTrainerSessionResult(7, 'NO_SHOW');
    expect(spy).toHaveBeenCalledWith('personal-sessions/trainer/me/7/result', { method: 'PATCH', body: JSON.stringify({ outcome: 'NO_SHOW' }) });
    expect(ok.data?.outcome).toBe('NO_SHOW');
    const late = await markTrainerSessionResult(7, 'NO_SHOW');
    expect(late.status).toBe(409);
    expect(late.error).toContain('24 horas');
  });
});
