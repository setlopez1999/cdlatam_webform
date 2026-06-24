/**
 * features/expedientes/f1/sections/F1Encabezado.tsx
 *
 * Sección de encabezado del Acta (F1).
 * Campos: Sres (catálogo), Atención (catálogo), Texto introductorio, Fecha, N° Acta.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { FileText, RotateCcw } from "lucide-react";
import type { F1Data } from "../../types";
import { buildActaCodigo } from "@shared/documentCodes";

const TEXTO_INTRODUCTORIO_DEFAULT =
  "Por medio de la presente, confirmo la recepción y aprobación de la propuesta comercial, en los términos y condiciones aquí expresados.";

export interface CatalogItem { value: string; label: string; logoBase64?: string; }

interface Props {
  data: F1Data;
  onUpdate: (partial: Partial<F1Data>) => void;
  catalogs?: {
    sres?: CatalogItem[];
    atencion?: CatalogItem[];
  };
  /** nroActa del servidor (ya asignado). Si es null, el acta aún no fue guardada. */
  serverNroActa?: number | null;
  /** Servicios contratados para extraer la primera unidad de negocio en tiempo real */
  serviciosContratados?: Array<{ unidadNegocio?: string }>;
  /** Logo de la empresa seleccionada (data URL) para previsualización */
  empresaLogoBase64?: string;
}

export function F1Encabezado({ data, onUpdate, catalogs, serverNroActa, serviciosContratados, empresaLogoBase64 }: Props) {
  // Preview del código en tiempo real: usa la primera unidad de negocio y el nroActa del servidor
  const primeraUnidad = (serviciosContratados ?? [])[0]?.unidadNegocio ?? "";
  const codigoPreview = serverNroActa
    ? buildActaCodigo("", serverNroActa, primeraUnidad)
    : primeraUnidad
      ? buildActaCodigo("", 10001, primeraUnidad).replace(/\d+$/, "#####")
      : "";
  const hasSres     = (catalogs?.sres?.length ?? 0) > 0;
  const hasAtencion = (catalogs?.atencion?.length ?? 0) > 0;

  const textoIntro = (data as any).textoIntroductorio ?? TEXTO_INTRODUCTORIO_DEFAULT;

  return (
    <FormSection title="Acta de Aceptación de Servicios" icon={FileText} accent="indigo">
      {/* Fila 1: Sres + Atención */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FieldGroup label="Sres." required>
          {hasSres ? (
            <Select value={data.sres} onValueChange={v => onUpdate({ sres: v })}>
              <SelectTrigger id="f1-sres">
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
              id="f1-sres"
              placeholder="Empresa destinataria"
              value={data.sres}
              onChange={e => onUpdate({ sres: e.target.value })}
            />
          )}
          {empresaLogoBase64 && (
            <div className="mt-2 border border-white/10 rounded-lg overflow-hidden inline-block">
              <img
                src={empresaLogoBase64}
                alt="Logo empresa"
                className="max-h-[50px] w-auto object-contain"
              />
            </div>
          )}
        </FieldGroup>

        <FieldGroup label="Atención">
          {hasAtencion ? (
            <Select value={data.atencion} onValueChange={v => onUpdate({ atencion: v })}>
              <SelectTrigger id="f1-atencion">
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
              id="f1-atencion"
              placeholder="Nombre del destinatario"
              value={data.atencion}
              onChange={e => onUpdate({ atencion: e.target.value })}
            />
          )}
        </FieldGroup>
      </div>

      {/* Texto introductorio editable */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-muted-foreground">Texto introductorio</label>
          <Button
            type="button" variant="ghost" size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => onUpdate({ textoIntroductorio: TEXTO_INTRODUCTORIO_DEFAULT } as any)}
            title="Restaurar texto original"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar
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

      {/* Fila 2: Fecha + N° Acta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Fecha" required>
          <Input
            id="f1-fecha" type="date"
            value={data.fecha}
            onChange={e => onUpdate({ fecha: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Código Acta (autogenerado)">
          <Input
            id="f1-noActa"
            placeholder={primeraUnidad ? "Guardar para confirmar número" : "Selecciona unidad de negocio"}
            value={codigoPreview}
            readOnly
            disabled
            className={!serverNroActa && codigoPreview ? "text-muted-foreground italic" : ""}
          />
          {!serverNroActa && codigoPreview && (
            <p className="text-xs text-muted-foreground mt-1">Vista previa — el número se confirma al guardar</p>
          )}
        </FieldGroup>
      </div>
    </FormSection>
  );
}
