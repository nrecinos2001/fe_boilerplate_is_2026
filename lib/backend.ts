// Helpers de servidor para hablar con el backend. Solo se usan en server
// actions y route handlers: API_URL no se expone al navegador.

export function backendUrl(path: string): URL {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error("Falta la variable de entorno API_URL.");
  }
  return new URL(path.replace(/^\//, ""), apiUrl.replace(/\/?$/, "/"));
}

export function postToBackend(path: string, body: unknown): Promise<Response> {
  return fetch(backendUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
