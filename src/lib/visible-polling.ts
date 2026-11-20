/** Lo mínimo de `document` que necesita el sondeo; permite probarlo sin navegador. */
export interface VisibilitySource {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

/**
 * Ejecuta `task` al arrancar y luego cada `intervalMs`, pero solo mientras la
 * pestaña está visible. Al ocultarse se detiene; al volver a mostrarse ejecuta
 * `task` de inmediato y retoma el intervalo. Devuelve la función que lo apaga.
 */
export function startVisiblePolling(
  task: () => void,
  intervalMs: number,
  source: VisibilitySource,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const start = () => {
    if (timer !== null) return;
    task();
    timer = setInterval(task, intervalMs);
  };

  const onVisibilityChange = () => {
    if (source.visibilityState === "visible") start();
    else stop();
  };

  source.addEventListener("visibilitychange", onVisibilityChange);
  onVisibilityChange();

  return () => {
    source.removeEventListener("visibilitychange", onVisibilityChange);
    stop();
  };
}
