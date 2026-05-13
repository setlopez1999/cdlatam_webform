/**
 * F1 — Firma del Representante Legal.
 * Se mantiene solo el campo de nombre; la captura de firma (canvas/importar) está deshabilitada.
 * El PDF sigue mostrando el espacio de firma en blanco.
 */
import { FormSection, FieldGroup } from "@/components/FormSection";
import { Input } from "@/components/ui/input";
import { PenLine } from "lucide-react";
import type { F1Data } from "../../types";

interface Props {
  data: F1Data;
  onUpdate: (partial: Partial<F1Data>) => void;
}

export function F1Firmas({ data, onUpdate }: Props) {
  return (
    <FormSection title="Firma del Representante Legal" icon={PenLine} accent="indigo" collapsible defaultOpen>
      <div className="space-y-4">
        <FieldGroup label="Nombre del Representante Legal">
          <Input
            placeholder="Nombre completo del firmante"
            value={data.representanteLegal}
            onChange={e => onUpdate({ representanteLegal: e.target.value })}
          />
        </FieldGroup>

        <div className="p-3 bg-muted/30 rounded-lg border border-border/40">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            La firma manuscrita se completará en el documento impreso o en el PDF exportado (area reservada).
            Al firmar este documento, el representante legal acepta los terminos y condiciones descritos en la
            propuesta comercial y en las consideraciones indicadas.
          </p>
        </div>
      </div>
    </FormSection>
  );
}
