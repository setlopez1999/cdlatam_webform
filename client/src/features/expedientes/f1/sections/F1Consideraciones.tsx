/**
 * features/expedientes/f1/sections/F1Consideraciones.tsx
 *
 * Obs. 11: Consideraciones editables — el usuario puede agregar, editar y eliminar
 *          ítems personalizados además de los fijos.
 * Extra:   Campo de cláusulas legales (texto libre) para pegar o escribir condiciones.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/FormSection";
import { ClipboardList, Plus, Trash2, Lock } from "lucide-react";
import type { F1Data } from "../../types";

// Consideraciones fijas — no editables desde la UI
const CONSIDERACIONES_FIJAS = [
  "Activación nueva.",
  "Valores expresados en dólares.",
  "Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.",
  "El servicio no incluye hardware.",
  "Se considera un descuento del 50% en las dos primeras cuotas de mantención.",
  "La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.",
];

interface Props {
  data: F1Data;
  onUpdate: (partial: Partial<F1Data>) => void;
}

export function F1Consideraciones({ data, onUpdate }: Props) {
  const [nuevoItem, setNuevoItem] = useState("");

  const personalizadas = data.consideracionesPersonalizadas ?? [];

  const agregarItem = () => {
    const texto = nuevoItem.trim();
    if (!texto) return;
    onUpdate({ consideracionesPersonalizadas: [...personalizadas, texto] });
    setNuevoItem("");
  };

  const editarItem = (idx: number, valor: string) => {
    const copia = [...personalizadas];
    copia[idx] = valor;
    onUpdate({ consideracionesPersonalizadas: copia });
  };

  const eliminarItem = (idx: number) => {
    onUpdate({ consideracionesPersonalizadas: personalizadas.filter((_, i) => i !== idx) });
  };

  return (
    <FormSection title="Consideraciones y Alcances Comerciales" icon={ClipboardList} accent="indigo" collapsible defaultOpen>
      <div className="space-y-6">

        {/* ── Consideraciones fijas (solo lectura) ─────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Consideraciones generales (fijas)
            </p>
          </div>
          <ul className="space-y-1.5">
            {CONSIDERACIONES_FIJAS.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5">
                <span className="text-primary font-bold mt-0.5 shrink-0">–</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Consideraciones personalizadas (editables) ────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Consideraciones adicionales
          </p>

          {personalizadas.length > 0 && (
            <ul className="space-y-2 mb-3">
              {personalizadas.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-primary font-bold shrink-0">–</span>
                  <Input
                    className="h-8 text-sm flex-1"
                    value={item}
                    onChange={e => editarItem(idx, e.target.value)}
                    placeholder="Consideración adicional..."
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => eliminarItem(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {/* Input para agregar nuevo ítem */}
          <div className="flex gap-2">
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Agregar consideración adicional..."
              value={nuevoItem}
              onChange={e => setNuevoItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarItem(); } }}
            />
            <Button type="button" variant="outline" size="sm" onClick={agregarItem} className="h-8 shrink-0">
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {/* ── Cláusulas legales (texto libre) ──────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cláusulas legales
          </p>
          <p className="text-xs text-muted-foreground">
            Pega o escribe aquí las cláusulas legales o condiciones adicionales del contrato.
          </p>
          <Textarea
            className="min-h-[120px] text-sm resize-y"
            placeholder="Ej: El cliente acepta los términos y condiciones descritos en el contrato marco N°..."
            value={data.clausulasLegales ?? ""}
            onChange={e => onUpdate({ clausulasLegales: e.target.value })}
          />
        </div>

      </div>
    </FormSection>
  );
}
