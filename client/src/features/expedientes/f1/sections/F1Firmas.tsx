/**
 * F1 — Firma del Representante Legal (solo aviso).
 * La captura con canvas no se usa; el PDF reserva el mismo espacio vacío vía pdfExport.
 * El nombre del representante se edita en F1Contactos (representanteLegal).
 */
import { FormSection } from "@/components/FormSection";
import { PenLine } from "lucide-react";
export function F1Firmas() {
  return (
    <FormSection title="Firma del Representante Legal" icon={PenLine} accent="indigo" collapsible defaultOpen>
      <div className="p-3 bg-muted/30 rounded-lg border border-border/40">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          La firma manuscrita se completará en el documento impreso o en el PDF exportado (área reservada).
          Al firmar este documento, el representante legal acepta los términos y condiciones descritos en la
          propuesta comercial y en las consideraciones indicadas.
        </p>
      </div>
    </FormSection>
  );
}
