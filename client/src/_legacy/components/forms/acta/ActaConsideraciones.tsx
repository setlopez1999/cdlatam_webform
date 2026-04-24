/**
 * ActaConsideraciones — Sección de Consideraciones y Alcances Comerciales
 *
 * "Activación nueva" es texto plano (no input), aparece como primer ítem de la lista.
 * Las consideraciones generales son ítems fijos con guión.
 */
import { FormSection } from "@/components/FormSection";
import { ClipboardList } from "lucide-react";
import type { ActaData } from "@/hooks/useFormStore";

interface Props {
  acta: ActaData;
  onUpdate: (updates: Partial<ActaData>) => void;
}

const CONSIDERACIONES_FIJAS = [
  "Activación nueva.",
  "Valores expresados en dólares.",
  "Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.",
  "El servicio no incluye hardware.",
  "Se considera un descuento del 50% en las dos primeras cuotas de mantención.",
  "La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.",
];

export function ActaConsideraciones({ acta }: Props) {
  return (
    <FormSection title="Consideraciones y Alcances Comerciales" icon={ClipboardList} accent="indigo" collapsible defaultOpen>
      <div className="space-y-4">
        {/* Lista de consideraciones generales */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Consideraciones generales
          </p>
          <ul className="space-y-1.5">
            {/* Ítems fijos (incluye Activación nueva como primer ítem) */}
            {CONSIDERACIONES_FIJAS.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5">
                <span className="text-primary font-bold mt-0.5 shrink-0">–</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FormSection>
  );
}
