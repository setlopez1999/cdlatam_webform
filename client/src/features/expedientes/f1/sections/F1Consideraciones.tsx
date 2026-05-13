/**
 * features/expedientes/f1/sections/F1Consideraciones.tsx
 *
 * Consideraciones del Acta: checklist desde catálogo (BD) + líneas libres con agregar/quitar.
 * Los textos que van al PDF son `consideracionesPersonalizadas`.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSection } from "@/components/FormSection";
import {
  ClipboardList,
  Plus,
  Trash2,
  ShieldOff,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { F1Data } from "../../types";
import type { ClausulasVigentesState } from "../useClausulasVigentes";

/** Fila devuelta por `catalogs.getAll().consideracionesComerciales`. */
export interface PlantillaConsideracionCatalogo {
  id: number;
  value: string;
  label: string;
  orden: number;
}

interface Props {
  data: F1Data;
  onUpdate: (partial: Partial<F1Data>) => void;
  plantillasCatalogo: PlantillaConsideracionCatalogo[];
  clausulasAuto: ClausulasVigentesState;
  restricted?: boolean;
}

function matchesCatalogLine(texto: string, plantillas: PlantillaConsideracionCatalogo[]): boolean {
  const t = texto.trim();
  return plantillas.some(p => p.value.trim() === t);
}

/** Líneas que no coinciden con ningún valor del catálogo (orden conservado). */
function lineasLibres(personalizadas: string[], plantillas: PlantillaConsideracionCatalogo[]): string[] {
  return personalizadas.filter(s => !matchesCatalogLine(s, plantillas));
}

/** Bloque catálogo en orden de plantillas (solo valores marcados en `personalizadas`). */
function bloqueCatalogoOrdenado(
  plantillas: PlantillaConsideracionCatalogo[],
  personalizadas: string[],
): string[] {
  const sorted = [...plantillas].sort((a, b) => a.orden - b.orden || a.id - b.id);
  return sorted
    .filter(p => personalizadas.some(x => x.trim() === p.value.trim()))
    .map(p => p.value);
}

export function F1Consideraciones({
  data,
  onUpdate,
  plantillasCatalogo,
  clausulasAuto,
  restricted = false,
}: Props) {
  const [nuevoItem, setNuevoItem] = useState("");

  const personalizadas = data.consideracionesPersonalizadas ?? [];

  const { clausulas, isLoading: clausulasLoading, hasUnidades } = clausulasAuto;

  const plantillasOrdenadas = useMemo(
    () => [...plantillasCatalogo].sort((a, b) => a.orden - b.orden || a.id - b.id),
    [plantillasCatalogo],
  );

  const libres = useMemo(
    () => lineasLibres(personalizadas, plantillasCatalogo),
    [personalizadas, plantillasCatalogo],
  );

  const toggleCatalogo = (valorCatalogo: string, checked: boolean) => {
    const custom = lineasLibres(personalizadas, plantillasCatalogo);
    const selectedTrims = new Set(
      plantillasCatalogo
        .filter(p => personalizadas.some(x => x.trim() === p.value.trim()))
        .map(p => p.value.trim()),
    );
    const vTrim = valorCatalogo.trim();
    if (checked) selectedTrims.add(vTrim);
    else selectedTrims.delete(vTrim);

    const ordered = [...plantillasCatalogo]
      .sort((a, b) => a.orden - b.orden || a.id - b.id)
      .filter(p => selectedTrims.has(p.value.trim()))
      .map(p => p.value);

    onUpdate({ consideracionesPersonalizadas: [...ordered, ...custom] });
  };

  const agregarLibre = () => {
    const texto = nuevoItem.trim();
    if (!texto) return;
    const catalogo = bloqueCatalogoOrdenado(plantillasCatalogo, personalizadas);
    const lib = lineasLibres(personalizadas, plantillasCatalogo);
    onUpdate({ consideracionesPersonalizadas: [...catalogo, ...lib, texto] });
    setNuevoItem("");
  };

  const quitarLibre = (idx: number) => {
    const nextLibres = libres.filter((_, j) => j !== idx);
    const catalogo = bloqueCatalogoOrdenado(plantillasCatalogo, personalizadas);
    onUpdate({ consideracionesPersonalizadas: [...catalogo, ...nextLibres] });
  };

  if (restricted) {
    return (
      <FormSection title="Consideraciones y Alcances Comerciales" icon={ClipboardList} accent="indigo" collapsible defaultOpen>
        <div className="flex items-center gap-3 py-6 px-2 text-muted-foreground">
          <ShieldOff className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">[Restringido]</span> — No tienes acceso a las consideraciones comerciales de este expediente.
          </p>
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection title="Consideraciones y Alcances Comerciales" icon={ClipboardList} accent="indigo" collapsible defaultOpen>
      <div className="space-y-6">

        {/* ── Catálogo (BD): checklist ───────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Del catálogo
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Marca las que deben figurar en el acta. Los textos vienen de Base de datos → Consideraciones comerciales (Acta).
          </p>

          {plantillasOrdenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground italic px-1 py-2">
              No hay ítems en el catálogo. Configúralos en Base de datos → Consideraciones comerciales (Acta).
            </p>
          ) : (
            <ul className="space-y-3">
              {plantillasOrdenadas.map(row => {
                const marcado = personalizadas.some(p => p.trim() === row.value.trim());
                return (
                  <li key={row.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`consideracion-cat-${row.id}`}
                      checked={marcado}
                      onCheckedChange={v => toggleCatalogo(row.value, v === true)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`consideracion-cat-${row.id}`}
                      className="text-sm text-foreground/90 leading-snug cursor-pointer select-none flex-1"
                    >
                      {row.label}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Líneas adicionales ───────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Líneas adicionales
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Texto propio que no está en el catálogo; también se incluye en el PDF del acta.
          </p>

          {libres.length > 0 && (
            <ul className="space-y-2 mb-3">
              {libres.map((linea, idx) => (
                <li key={`libre-${idx}`} className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="text-sm text-foreground/90 flex-1 whitespace-pre-wrap break-words">{linea}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => quitarLibre(idx)}
                    title="Quitar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              className="h-9 text-sm flex-1"
              placeholder="Escribe una línea y pulsa Agregar…"
              value={nuevoItem}
              onChange={e => setNuevoItem(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarLibre();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={agregarLibre} className="h-9 shrink-0">
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

        {/* ── Cláusulas legales adjuntas (auto, según unidades en Servicios) ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cláusulas legales adjuntas (auto)
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Estas cláusulas se anexarán automáticamente al final del PDF del Acta al exportar,
            según las Unidades de Negocio elegidas en Servicios Contratados.
          </p>

          {!hasUnidades && (
            <p className="text-xs text-muted-foreground italic px-3 py-3 bg-muted/30 rounded-md border border-border/40">
              Selecciona Unidades de Negocio en la sección Servicios Contratados para ver las cláusulas asociadas.
            </p>
          )}

          {hasUnidades && clausulasLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-2 px-3 py-3 bg-muted/30 rounded-md border border-border/40">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando cláusulas…
            </p>
          )}

          {hasUnidades && !clausulasLoading && clausulas.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-3 py-3 bg-muted/30 rounded-md border border-border/40">
              No hay cláusulas registradas para las unidades seleccionadas.
            </p>
          )}

          {hasUnidades && clausulas.length > 0 && (
            <ul className="space-y-1.5 px-3 py-3 bg-muted/30 rounded-md border border-border/40">
              {clausulas.map(c => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="flex-1 text-foreground/90 truncate" title={c.fileName}>
                    {c.valor}
                  </span>
                  <a
                    href={c.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                  >
                    Ver PDF <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </FormSection>
  );
}
