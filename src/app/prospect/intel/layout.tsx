import { redirect } from "next/navigation";
import { ENABLE_CONTENT_INTEL } from "@/config/features";

/**
 * Sección deprecada (Fase 2.4): Content Intel será reemplazada por Social
 * Studio + Radar IA. El layout gatea todas las subrutas (/intel, /intel/trends,
 * /intel/opportunities) mientras el flag esté apagado.
 */
export default function IntelLayout({ children }: { children: React.ReactNode }) {
  if (!ENABLE_CONTENT_INTEL) redirect("/prospect/leads");
  return children;
}
