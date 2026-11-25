import AccountDetailClient from "./detail-client";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <AccountDetailClient accountId={accountId} />;
}
