/**
 * features/expedientes/f1/sections/F1Empresa.tsx
 *
 * Sección de datos de la empresa del Acta (F1).
 * Campos: Razón Social, Nombre Fantasía, Tipo Doc, RUC/DNI/RUT, Dirección, País, Moneda.
 */
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { Building2, Coins } from "lucide-react";
import type { F1Data } from "../../types";
import type { CatalogItem } from "./F1Encabezado";

const TIPOS_DOC_DEFAULT: CatalogItem[] = [
  { value: "RUT", label: "RUT (Chile)" },
  { value: "RUC", label: "RUC (Perú/Ecuador)" },
  { value: "DNI", label: "DNI" },
  { value: "NIT", label: "NIT (Colombia)" },
  { value: "CUIT", label: "CUIT (Argentina)" },
];

interface Props {
  data: F1Data;
  onUpdate: (partial: Partial<F1Data>) => void;
  catalogs?: {
    documentoIdentidad?: CatalogItem[];
    monedas?: CatalogItem[];
    paises?: CatalogItem[];
  };
}

export function F1Empresa({ data, onUpdate, catalogs }: Props) {
  const tiposDoc = catalogs?.documentoIdentidad?.length ? catalogs.documentoIdentidad : TIPOS_DOC_DEFAULT;

  return (
    <FormSection title="Datos de la Empresa" icon={Building2} accent="indigo">
      {/* Fila 1: Razón Social + Nombre Fantasía */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FieldGroup label="Razón Social" required>
          <Input
            id="f1-razonSocial" placeholder="Nombre legal de la empresa"
            value={data.razonSocial}
            onChange={e => onUpdate({ razonSocial: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Nombre de Fantasía">
          <Input
            placeholder="Nombre comercial"
            value={data.nombreFantasia}
            onChange={e => onUpdate({ nombreFantasia: e.target.value })}
          />
        </FieldGroup>
      </div>

      {/* Fila 2: Tipo Doc + RUC/DNI/RUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FieldGroup label="Tipo de Documento" required>
          <Select value={data.tipoDocumento} onValueChange={v => onUpdate({ tipoDocumento: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
            <SelectContent>
              {tiposDoc.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FieldGroup>
        <FieldGroup label="RUC / DNI / RUT" required>
          <Input
            id="f1-rucDniRut" placeholder="Número de identificación fiscal"
            value={data.rucDniRut}
            onChange={e => onUpdate({ rucDniRut: e.target.value })}
          />
        </FieldGroup>
      </div>

      {/* Fila 3: Dirección Comercial */}
      <div className="mb-4">
        <FieldGroup label="Dirección Comercial">
          <Textarea
            placeholder="Dirección completa de la empresa"
            value={data.direccionComercial}
            onChange={e => onUpdate({ direccionComercial: e.target.value })}
            rows={2}
          />
        </FieldGroup>
      </div>

      {/* Fila 4: País + Moneda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="País">
          {catalogs?.paises?.length ? (
            <Select value={data.pais} onValueChange={v => onUpdate({ pais: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar país..." /></SelectTrigger>
              <SelectContent>
                {catalogs.paises.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="País" value={data.pais} onChange={e => onUpdate({ pais: e.target.value })} />
          )}
        </FieldGroup>

        <FieldGroup label="Moneda" required>
          <div className="space-y-1">
            {catalogs?.monedas?.length ? (
              <Select value={data.moneda} onValueChange={v => onUpdate({ moneda: v })}>
                <SelectTrigger id="f1-moneda"><SelectValue placeholder="Seleccionar moneda..." /></SelectTrigger>
                <SelectContent>
                  {catalogs.monedas.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="f1-moneda" placeholder="Moneda (USD, CLP, PEN...)"
                value={data.moneda}
                onChange={e => onUpdate({ moneda: e.target.value })}
              />
            )}
            {data.moneda && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Coins className="w-3 h-3" />
                Todos los valores monetarios del formulario usarán esta moneda
              </p>
            )}
          </div>
        </FieldGroup>
      </div>
    </FormSection>
  );
}
