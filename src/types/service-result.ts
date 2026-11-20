// Resultado de una llamada a un servicio del backend. Los servicios nunca
// lanzan: la pantalla decide qué mostrar según `status`.
export type ServiceResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };
