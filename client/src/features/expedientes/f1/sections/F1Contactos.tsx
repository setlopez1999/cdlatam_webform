/**
 * features/expedientes/f1/sections/F1Contactos.tsx
 *
 * Sección de datos de contacto del Acta (F1).
 * Obs. 5: DNI/Cédula → Número de Identificación Fiscal
 * Obs. 6: Agregar campo Tipo de documento
 * Obs. 7: Teléfono → separar en Teléfono Fijo y Teléfono Móvil
 */
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { Users } from "lucide-react";
import type { F1Data } from "../../types";

const TIPOS_DOC = [
  { value: "RUT",  label: "RUT (Chile)" },
  { value: "RUC",  label: "RUC (Perú/Ecuador)" },
  { value: "DNI",  label: "DNI" },
  { value: "NIT",  label: "NIT (Colombia)" },
  { value: "CUIT", label: "CUIT (Argentina)" },
  { value: "OTRO", label: "Otro" },
];

interface Props {
  data: F1Data;
  onUpdate: (partial: Partial<F1Data>) => void;
}

export function F1Contactos({ data, onUpdate }: Props) {
  return (
    <FormSection title="Datos de Contacto" icon={Users} accent="indigo" collapsible defaultOpen>
      <div className="space-y-5">

        {/* ── Representante Legal ─────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Representante Legal
          </p>
          {/* Fila 1: Nombre + Tipo Documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <FieldGroup label="Nombre" required>
              <Input placeholder="Nombre completo" value={data.representanteLegal}
                onChange={e => onUpdate({ representanteLegal: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Tipo de Documento">
              <Select value={data.representanteTipoDoc} onValueChange={v => onUpdate({ representanteTipoDoc: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DOC.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>
          {/* Fila 2: N° Identificación + Email + Tel. Fijo + Tel. Móvil */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FieldGroup label="Número de Identificación Fiscal">
              <Input placeholder="Número de identidad" value={data.representanteDni}
                onChange={e => onUpdate({ representanteDni: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input type="email" placeholder="correo@empresa.com" value={data.representanteEmail}
                onChange={e => onUpdate({ representanteEmail: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Teléfono Fijo">
              <Input placeholder="+56 2 XXXX XXXX" value={data.representanteTelefonoFijo}
                onChange={e => onUpdate({ representanteTelefonoFijo: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Teléfono Móvil">
              <Input placeholder="+56 9 XXXX XXXX" value={data.representanteTelefonoMovil}
                onChange={e => onUpdate({ representanteTelefonoMovil: e.target.value })} />
            </FieldGroup>
          </div>
        </div>

        <Separator />

        {/* ── Contacto Técnico ────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contacto Técnico
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FieldGroup label="Nombre">
              <Input placeholder="Nombre del contacto técnico" value={data.contactoTecnico}
                onChange={e => onUpdate({ contactoTecnico: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input type="email" placeholder="tecnico@empresa.com" value={data.contactoTecnicoEmail}
                onChange={e => onUpdate({ contactoTecnicoEmail: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Teléfono Fijo">
              <Input placeholder="+56 2 XXXX XXXX" value={data.contactoTecnicoTelefonoFijo}
                onChange={e => onUpdate({ contactoTecnicoTelefonoFijo: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Teléfono Móvil">
              <Input placeholder="+56 9 XXXX XXXX" value={data.contactoTecnicoTelefonoMovil}
                onChange={e => onUpdate({ contactoTecnicoTelefonoMovil: e.target.value })} />
            </FieldGroup>
          </div>
        </div>

        <Separator />

        {/* ── Contacto Facturación ────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contacto Facturación
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FieldGroup label="Nombre">
              <Input placeholder="Nombre del contacto de facturación" value={data.contactoFacturacion}
                onChange={e => onUpdate({ contactoFacturacion: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input type="email" placeholder="facturacion@empresa.com" value={data.contactoFacturacionEmail}
                onChange={e => onUpdate({ contactoFacturacionEmail: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Teléfono Fijo">
              <Input placeholder="+56 2 XXXX XXXX" value={data.contactoFacturacionTelefonoFijo}
                onChange={e => onUpdate({ contactoFacturacionTelefonoFijo: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Teléfono Móvil">
              <Input placeholder="+56 9 XXXX XXXX" value={data.contactoFacturacionTelefonoMovil}
                onChange={e => onUpdate({ contactoFacturacionTelefonoMovil: e.target.value })} />
            </FieldGroup>
          </div>
        </div>

      </div>
    </FormSection>
  );
}
