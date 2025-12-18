// app/boletos/[cedula]/page.tsx
import TicketsByCedulaClient from "./TicketsByCedulaClient";

export default async function Page({
  params,
}: {
  params: Promise<{ cedula: string }>;
}) {
  const { cedula } = await params; // Next 15: params viene como Promise
  return <TicketsByCedulaClient cedulaParam={cedula} />;
}
