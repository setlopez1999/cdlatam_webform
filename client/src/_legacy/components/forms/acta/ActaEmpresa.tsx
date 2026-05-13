/**
 * ActaEmpresa — Datos de la Empresa del Acta
 * Campos: Razón Social, Nombre Fantasía, Tipo Doc (combobox), RUC/DNI/RUT,
 * Dirección Comercial, Moneda (combobox BD — valor global del formulario)
 *
 * NOTA: El campo "Moneda" es global: su valor se propaga a todos los campos
 * monetarios del formulario (servicios, formas de pago, etc.)
 */
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { Building2, Coins } from "lucide-react";
import type { ActaData } from "@/hooks/useFormStore";

interface CatalogItem { value: string; label: string; }
interface Catalogs {
  documentoIdentidad?: readonly CatalogItem[] | CatalogItem[];
  monedas?: readonly CatalogItem[] | CatalogItem[];
}

interface Props {
  acta: ActaData;
  onUpdate: (updates: Partial<ActaData>) => void;
  catalogs?: Catalogs;
}

const TIPOS_DOC_DEFAULT: CatalogItem[] = [
  { value: "RUT", label: "RUT (Chile)" },
  { value: "RUC", label: "RUC (Perú/Ecuador)" },
  { value: "DNI", label: "DNI" },
  { value: "NIT", label: "NIT (Colombia)" },
  { value: "CUIT", label: "CUIT (Argentina)" },
];

export function ActaEmpresa({ acta, onUpdate, catalogs }: Props) {
  const tiposDoc = catalogs?.documentoIdentidad?.length
    ? catalogs.documentoIdentidad
    : TIPOS_DOC_DEFAULT;

  return (
    <FormSection title="Datos de la Empresa" icon={Building2} accent="indigo">
      {/* Fila 1: Razón Social + Nombre Fantasía */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FieldGroup label="Razón Social" required>
          <Input
            id="acta-razonSocial"
            placeholder="Nombre legal de la empresa"
            value={acta.razonSocial}
            onChange={e => onUpdate({ razonSocial: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Nombre de Fantasía">
          <Input
            placeholder="Nombre comercial"
            value={acta.nombreFantasia}
            onChange={e => onUpdate({ nombreFantasia: e.target.value })}
          />
        </FieldGroup>
      </div>

      {/* Fila 2: Tipo Doc + RUC/DNI/RUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FieldGroup label="Tipo de Documento" required>
          <Select value={acta.tipoDocumento} onValueChange={v => onUpdate({ tipoDocumento: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo..." />
            </SelectTrigger>
            <SelectContent>
              {tiposDoc.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
        <FieldGroup label="RUC / DNI / RUT" required>
          <Input
            id="acta-rucDniRut"
            placeholder="Número de identificación fiscal"
            value={acta.rucDniRut}
            onChange={e => onUpdate({ rucDniRut: e.target.value })}
          />
        </FieldGroup>
      </div>

      {/* Fila 3: Dirección Comercial */}
      <div className="mb-4">
        <FieldGroup label="Dirección Comercial">
          <Textarea
            placeholder="Dirección completa de la empresa"
            value={acta.direccionComercial}
            onChange={e => onUpdate({ direccionComercial: e.target.value })}
            rows={2}
          />
        </FieldGroup>
      </div>

      {/* Fila 4: Moneda (global del formulario) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Moneda" required>
          <div className="space-y-1">
            {catalogs?.monedas && catalogs.monedas.length > 0 ? (
              <Select value={acta.moneda} onValueChange={v => onUpdate({ moneda: v })}>
                <SelectTrigger id="acta-moneda">
                  <SelectValue placeholder="Seleccionar moneda..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.monedas.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="acta-moneda"
                placeholder="Moneda (USD, CLP, PEN...)"
                value={acta.moneda}
                onChange={e => onUpdate({ moneda: e.target.value })}
              />
            )}
            {acta.moneda && (
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
