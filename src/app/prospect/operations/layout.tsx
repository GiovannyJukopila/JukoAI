import { redirect } from "next/navigation";
import { ENABLE_OPERATIONS } from "@/config/features";

/** Sección deprecada (Fase 2.4): accesible solo si se reactiva el flag. */
export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  if (!ENABLE_OPERATIONS) redirect("/prospect/leads");
  return children;
}
