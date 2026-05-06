/**
 * ActaEncabezado — Encabezado del Acta de Aceptación de Servicios
 * Campos: Sres (combobox BD), Atención (combobox BD), Fecha, No. Acta
 * Texto introductorio editable con botón de restaurar texto original
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { FileText, RotateCcw } from "lucide-react";
import type { ActaData } from "@/hooks/useFormStore";

const TEXTO_INTRODUCTORIO_DEFAULT =
  "Tengo el agrado de comunicar nuestra aceptación a la propuesta comercial número en las condiciones y términos de la misma.";

interface CatalogItem { value: string; label: string; }
interface Catalogs {
  sres?: readonly CatalogItem[] | CatalogItem[];
  atencion?: readonly CatalogItem[] | CatalogItem[];
}

interface Props {
  acta: ActaData;
  onUpdate: (updates: Partial<ActaData>) => void;
  catalogs?: Catalogs;
}

export function ActaEncabezado({ acta, onUpdate, catalogs }: Props) {
  const hasSres = catalogs?.sres && catalogs.sres.length > 0;
  const hasAtencion = catalogs?.atencion && catalogs.atencion.length > 0;

  // Texto introductorio editable: si no está en el acta, usar el default
  const textoIntro = (acta as any).textoIntroductorio ?? TEXTO_INTRODUCTORIO_DEFAULT;

  const handleRestaurarTexto = () => {
    onUpdate({ textoIntroductorio: TEXTO_INTRODUCTORIO_DEFAULT } as any);
  };

  return (
    <FormSection title="Acta de Aceptación de Servicios" icon={FileText} accent="indigo">
      {/* Fila 1: Sres + Atención */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Sres — combobox alimentado desde BD */}
        <FieldGroup label="Sres." required>
          {hasSres ? (
            <Select value={acta.sres} onValueChange={v => onUpdate({ sres: v })}>
              <SelectTrigger id="acta-sres">
                <SelectValue placeholder="Seleccionar empresa..." />
              </SelectTrigger>
              <SelectContent>
                {catalogs!.sres!.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="acta-sres"
              placeholder="Empresa destinataria"
              value={acta.sres}
              onChange={e => onUpdate({ sres: e.target.value })}
            />
          )}
        </FieldGroup>

        {/* Atención — combobox alimentado desde BD */}
        <FieldGroup label="Atención">
          {hasAtencion ? (
            <Select value={acta.atencion} onValueChange={v => onUpdate({ atencion: v })}>
              <SelectTrigger id="acta-atencion">
                <SelectValue placeholder="Seleccionar persona..." />
              </SelectTrigger>
              <SelectContent>
                {catalogs!.atencion!.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="acta-atencion"
              placeholder="Nombre del destinatario"
              value={acta.atencion}
              onChange={e => onUpdate({ atencion: e.target.value })}
            />
          )}
        </FieldGroup>
      </div>

      {/* Texto introductorio editable */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Texto introductorio
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={handleRestaurarTexto}
            title="Restaurar texto original"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar
          </Button>
        </div>
        <Textarea
          value={textoIntro}
          onChange={e => onUpdate({ textoIntroductorio: e.target.value } as any)}
          rows={2}
          className="text-sm resize-none bg-muted/30 border-border/50"
          placeholder="Texto introductorio del acta..."
        />
      </div>

      {/* Fila 2: Fecha + No. Acta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Fecha" required>
          <Input
            id="acta-fecha"
            type="date"
            value={acta.fecha}
            onChange={e => onUpdate({ fecha: e.target.value })}
          />
        </FieldGroup>

        <FieldGroup label="N° Acta" required>
          <Input
            id="acta-noActa"
            placeholder="Ej: 2026-001"
            value={acta.noActa}
            onChange={e => onUpdate({ noActa: e.target.value })}
          />
        </FieldGroup>
      </div>
    </FormSection>
  );
}
