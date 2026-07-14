import { redirect } from "next/navigation";

/**
 * "Cobertura" se fusionó con "Leads" en la vista unificada Negocios
 * (plan de refactor, Fase 2.2). La implementación anterior vive en
 * ../_deprecated/CoveragePage.tsx.
 */
export default function CoverageRedirect() {
  redirect("/prospect/leads");
}
