/**
 * features/expedientes/f2/sections/F2InfoGeneral.tsx
 *
 * Sección de Información General del Proyecto (F2).
 * Incluye botón "Importar desde F1" para pre-llenar campos comunes.
 *
 * Preventa se carga desde catalog_custom_preventas y Ejecutivo Comercial desde
 * catalog_nombres (misma fuente que "Atención" de F1).
 */
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { TipoCambioInput } from "../TipoCambioInput";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { Info, Download } from "lucide-react";
import { formatCurrency, parseNumeric } from "@/lib/formatters";
import type { F2Data } from "../../types";

interface CatalogItem { value: string; label: string; }

interface Props {
  data: F2Data;
  onUpdate: (partial: Partial<F2Data>) => void;
  catalogs?: {
    monedas?: CatalogItem[];
    paises?: CatalogItem[];
    plazos?: CatalogItem[];
    cecos?: CatalogItem[];
    areas?: CatalogItem[];
    nombres?: CatalogItem[];
    preventas?: CatalogItem[];
  };
  /** Sugerencias de F1 para pre-llenado */
  f1Suggestions?: {
    nombreCliente?: string;
    nombreFantasia?: string;
    rut?: string;
    paisImplementacion?: string;
    tipoMoneda?: string;
    unidadNegocios?: string;
    solucion?: string;
    plazoImplementacion?: string;
    montoProyecto?: number;
  } | null;
  onImportarDesdeF1?: () => void;
}

/** Campos de encabezado — ignorar arrays de costos al comparar props para memo. */
const F2_INFO_FIELDS: (keyof F2Data)[] = [
  "unidadNegocios", "empresa", "nombreFantasia", "centroCostoHeader", "solucion", "tipoMoneda",
  "montoProyecto", "tipoCambio", "totalClp", "descripcion", "preventa",
  "fechaEntrega", "ejecutivoComercial", "plazoImplementacion", "propuestaNumero",
  "paisImplementacion", "rut", "nombreCliente", "firmaImagen",
];

function f2InfoGeneralPropsEqual(prev: Props, next: Props): boolean {
  for (const key of F2_INFO_FIELDS) {
    if (prev.data[key] !== next.data[key]) return false;
  }
  return (
    prev.catalogs === next.catalogs &&
    prev.f1Suggestions === next.f1Suggestions &&
    prev.onUpdate === next.onUpdate &&
    prev.onImportarDesdeF1 === next.onImportarDesdeF1
  );
}

function F2InfoGeneralInner({ data, onUpdate, catalogs, f1Suggestions, onImportarDesdeF1 }: Props) {
  const totalClp = data.montoProyecto * (data.tipoCambio || 1);

  // Ejecutivo Comercial desde catalog_nombres, Preventa desde catalog_preventas
  const nombresForSelect = catalogs?.nombres;
  const preventasForSelect = catalogs?.preventas;

  return (
    <FormSection title="Información General del Proyecto" icon={Info} accent="violet">
      {/* Banner de importar desde F1 */}
      {f1Suggestions && (f1Suggestions.nombreCliente || f1Suggestions.rut) && (
        <div className="mb-4 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
          <div className="text-xs text-indigo-700">
            <span className="font-semibold">F1 disponible:</span>{" "}
            {f1Suggestions.nombreCliente && <span>Cliente: <b>{f1Suggestions.nombreCliente}</b></span>}
            {f1Suggestions.nombreFantasia && <span className="ml-2">· Marca: <b>{f1Suggestions.nombreFantasia}</b></span>}
            {f1Suggestions.tipoMoneda && <span className="ml-2">· Moneda: <b>{f1Suggestions.tipoMoneda}</b></span>}
            {f1Suggestions.unidadNegocios && <span className="ml-2">· UN: <b>{f1Suggestions.unidadNegocios}</b></span>}
            {f1Suggestions.solucion && <span className="ml-2">· Sol: <b>{f1Suggestions.solucion}</b></span>}
            {f1Suggestions.plazoImplementacion && <span className="ml-2">· Plazo: <b>{f1Suggestions.plazoImplementacion}</b></span>}
            {f1Suggestions.montoProyecto ? <span className="ml-2">· Monto impl: <b>$ {Number(f1Suggestions.montoProyecto).toLocaleString("es-CL")}</b></span> : null}
          </div>
          <Button
            type="button" variant="outline" size="sm"
            className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100 gap-1.5"
            onClick={onImportarDesdeF1}
          >
            <Download className="w-3 h-3" /> Importar desde F1
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FieldGroup label="Nombre Cliente" required>
          <Input placeholder="Nombre del cliente" value={data.nombreCliente}
            onChange={e => onUpdate({ nombreCliente: e.target.value })} />
        </FieldGroup>

        <FieldGroup label="Razón Social">
          <Input placeholder="Razón social de la empresa" value={data.empresa}
            onChange={e => onUpdate({ empresa: e.target.value })} />
        </FieldGroup>

        <FieldGroup label="Nombre de Fantasía o Marca">
          <Input placeholder="Nombre comercial o marca" value={data.nombreFantasia}
            onChange={e => onUpdate({ nombreFantasia: e.target.value })} />
        </FieldGroup>

        <FieldGroup label="Unidad de Negocio">
          <Input placeholder="Unidad de negocio" value={data.unidadNegocios}
            onChange={e => onUpdate({ unidadNegocios: e.target.value })} />
        </FieldGroup>

        <FieldGroup label="Solución / Proyecto">
          <Input placeholder="Nombre de la solución" value={data.solucion}
            onChange={e => onUpdate({ solucion: e.target.value })} />
        </FieldGroup>

        <FieldGroup label="Centro de Costo">
          {catalogs?.cecos?.length ? (
            <Select value={data.centroCostoHeader} onValueChange={v => onUpdate({ centroCostoHeader: v })}>
              <SelectTrigger><SelectValue placeholder="Centro de costo..." /></SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[200]">
                {catalogs.cecos.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Centro de costo" value={data.centroCostoHeader}
              onChange={e => onUpdate({ centroCostoHeader: e.target.value })} />
          )}
        </FieldGroup>

        <FieldGroup label="Tipo de Moneda" required>
          {catalogs?.monedas?.length ? (
            <Select value={data.tipoMoneda} onValueChange={v => onUpdate({ tipoMoneda: v })}>
              <SelectTrigger><SelectValue placeholder="Moneda..." /></SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[200]">
                {catalogs.monedas.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="USD, CLP, PEN..." value={data.tipoMoneda}
              onChange={e => onUpdate({ tipoMoneda: e.target.value })} />
          )}
        </FieldGroup>

        <FieldGroup label="Monto Proyecto" required>
          <Input type="number" className="text-right" placeholder="0.00"
            value={data.montoProyecto || ""}
            onChange={e => onUpdate({ montoProyecto: parseNumeric(e.target.value) })} />
        </FieldGroup>

        <FieldGroup label="Tipo de Cambio">
          <TipoCambioInput value={data.tipoCambio} onChange={v => onUpdate({ tipoCambio: v })} className="text-right" />
        </FieldGroup>

        <FieldGroup label="Total CLP (calculado)">
          <div className="h-9 px-3 flex items-center bg-muted rounded-md border border-border">
            <span className="text-sm font-mono font-medium">{formatCurrency(totalClp, "CLP")}</span>
          </div>
        </FieldGroup>

        <FieldGroup label="País Implementación">
          {catalogs?.paises?.length ? (
            <Select value={data.paisImplementacion} onValueChange={v => onUpdate({ paisImplementacion: v })}>
              <SelectTrigger><SelectValue placeholder="País..." /></SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[200]">
                {catalogs.paises.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="País" value={data.paisImplementacion}
              onChange={e => onUpdate({ paisImplementacion: e.target.value })} />
          )}
        </FieldGroup>

        <FieldGroup label="Plazo Implementación">
          {catalogs?.plazos?.length ? (
            <Select value={data.plazoImplementacion} onValueChange={v => onUpdate({ plazoImplementacion: v })}>
              <SelectTrigger><SelectValue placeholder="Plazo..." /></SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[200]">
                {catalogs.plazos.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Plazo" value={data.plazoImplementacion}
              onChange={e => onUpdate({ plazoImplementacion: e.target.value })} />
          )}
        </FieldGroup>

        {/* Ejecutivo Comercial — select desde catalog_nombres (misma fuente que F1 Atención) */}
        <FieldGroup label="Ejecutivo Comercial">
          {nombresForSelect?.length ? (
            <Select value={data.ejecutivoComercial} onValueChange={v => onUpdate({ ejecutivoComercial: v })}>
              <SelectTrigger><SelectValue placeholder="Ejecutivo comercial..." /></SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[200]">
                {nombresForSelect.map(n => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Nombre del ejecutivo" value={data.ejecutivoComercial}
              onChange={e => onUpdate({ ejecutivoComercial: e.target.value })} />
          )}
        </FieldGroup>

        {/* Preventa — select desde catalog_preventas */}
        <FieldGroup label="Preventa">
          {preventasForSelect?.length ? (
            <Select value={data.preventa} onValueChange={v => onUpdate({ preventa: v })}>
              <SelectTrigger><SelectValue placeholder="Preventa..." /></SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[200]">
                {preventasForSelect.map(n => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Preventa" value={data.preventa}
              onChange={e => onUpdate({ preventa: e.target.value })} />
          )}
        </FieldGroup>

        <FieldGroup label="Fecha Entrega">
          <Input type="date" value={data.fechaEntrega}
            onChange={e => onUpdate({ fechaEntrega: e.target.value })} />
        </FieldGroup>

        <FieldGroup label="Descripción" className="md:col-span-2 lg:col-span-3">
          <Textarea placeholder="Descripción del proyecto..." value={data.descripcion}
            onChange={e => onUpdate({ descripcion: e.target.value })} rows={2} />
        </FieldGroup>
      </div>
    </FormSection>
  );
}

export const F2InfoGeneral = memo(F2InfoGeneralInner, f2InfoGeneralPropsEqual);
