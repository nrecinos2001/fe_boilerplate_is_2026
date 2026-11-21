import { apiFetch } from "@/lib/api";
import { forward } from "@/lib/api-route";

export async function GET() {
  return forward(() => apiFetch("/unidades"));
}
