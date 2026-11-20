import { proxyLoyaltyRequest } from "@/lib/server/loyalty-proxy";

export async function GET() {
  return proxyLoyaltyRequest("benefits", "GET");
}
