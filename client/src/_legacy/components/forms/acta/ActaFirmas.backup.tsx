/**
 * ActaFirmas — Sección de Firmas del Acta
 * Dos bloques: Firma del Cliente y Firma CDLatam
 * Con botón para marcar como firmado
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { PenLine, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { ActaData } from "@/hooks/useFormStore";

interface Props {
  acta: ActaData;
  onUpdate: (updates: Partial<ActaData>) => void;
}

export function ActaFirmas({ acta, onUpdate }: Props) {
  const [clienteFirmado, setClienteFirmado] = useState(false);
  const [cdlatamFirmado, setCdlatamFirmado] = useState(false);

  return (
    <FormSection title="Firmas" icon={PenLine} accent="indigo" collapsible defaultOpen>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firma del Cliente */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Por el Cliente
          </p>
          <FieldGroup label="Nombre completo">
            <Input
              placeholder="Nombre del firmante"
              value={acta.representanteLegal}
              onChange={e => onUpdate({ representanteLegal: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Cargo / Función">
            <Input placeholder="Ej: Gerente General" />
          </FieldGroup>
          {/* Área de firma */}
          <div
            className={`h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
              clienteFirmado
                ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            {clienteFirmado ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Firmado</span>
              </>
            ) : (
              <>
                <PenLine className="w-5 h-5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">Área de firma</span>
              </>
            )}
          </div>
          <Button
            type="button"
            variant={clienteFirmado ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={() => setClienteFirmado(prev => !prev)}
          >
            {clienteFirmado ? "Quitar firma" : "Marcar como firmado"}
          </Button>
        </div>

        {/* Firma CDLatam */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Por CDLatam
          </p>
          <FieldGroup label="Nombre completo">
            <Input placeholder="Representante CDLatam" />
          </FieldGroup>
          <FieldGroup label="Cargo / Función">
            <Input placeholder="Ej: Director Comercial" />
          </FieldGroup>
          {/* Área de firma */}
          <div
            className={`h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
              cdlatamFirmado
                ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            {cdlatamFirmado ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Firmado</span>
              </>
            ) : (
              <>
                <PenLine className="w-5 h-5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">Área de firma</span>
              </>
            )}
          </div>
          <Button
            type="button"
            variant={cdlatamFirmado ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={() => setCdlatamFirmado(prev => !prev)}
          >
            {cdlatamFirmado ? "Quitar firma" : "Marcar como firmado"}
          </Button>
        </div>
      </div>

      {/* Nota legal */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/40">
        <p className="text-xs text-muted-foreground text-center">
          Al firmar este documento, ambas partes aceptan los términos y condiciones descritos en la propuesta comercial y en las consideraciones indicadas.
        </p>
      </div>
    </FormSection>
  );
}
