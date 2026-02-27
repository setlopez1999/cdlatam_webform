/**
 * ActaContactos — Sección de datos de contacto del Acta
 * Incluye: Representante Legal, Contacto Técnico, Contacto Facturación
 */
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { Users } from "lucide-react";
import type { ActaData } from "@/hooks/useFormStore";

interface Props {
  acta: ActaData;
  onUpdate: (updates: Partial<ActaData>) => void;
}

export function ActaContactos({ acta, onUpdate }: Props) {
  return (
    <FormSection title="Datos de Contacto" icon={Users} accent="indigo" collapsible defaultOpen>
      <div className="space-y-5">
        {/* Representante Legal */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Representante Legal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FieldGroup label="Nombre" required>
              <Input
                placeholder="Nombre completo"
                value={acta.representanteLegal}
                onChange={e => onUpdate({ representanteLegal: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="DNI / Cédula">
              <Input
                placeholder="Número de identidad"
                value={acta.representanteDni}
                onChange={e => onUpdate({ representanteDni: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input
                type="email"
                placeholder="correo@empresa.com"
                value={acta.representanteEmail}
                onChange={e => onUpdate({ representanteEmail: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="Teléfono">
              <Input
                placeholder="+56 9 XXXX XXXX"
                value={acta.representanteFono}
                onChange={e => onUpdate({ representanteFono: e.target.value })}
              />
            </FieldGroup>
          </div>
        </div>
        <Separator />
        {/* Contacto Técnico */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contacto Técnico
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldGroup label="Nombre">
              <Input
                placeholder="Nombre del contacto técnico"
                value={acta.contactoTecnico}
                onChange={e => onUpdate({ contactoTecnico: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input
                type="email"
                placeholder="tecnico@empresa.com"
                value={acta.contactoTecnicoEmail}
                onChange={e => onUpdate({ contactoTecnicoEmail: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="Teléfono">
              <Input
                placeholder="+56 9 XXXX XXXX"
                value={acta.contactoTecnicoFono}
                onChange={e => onUpdate({ contactoTecnicoFono: e.target.value })}
              />
            </FieldGroup>
          </div>
        </div>
        <Separator />
        {/* Contacto Facturación */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contacto Facturación
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldGroup label="Nombre">
              <Input
                placeholder="Nombre del contacto de facturación"
                value={acta.contactoFacturacion}
                onChange={e => onUpdate({ contactoFacturacion: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input
                type="email"
                placeholder="facturacion@empresa.com"
                value={acta.contactoFacturacionEmail}
                onChange={e => onUpdate({ contactoFacturacionEmail: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="Teléfono">
              <Input
                placeholder="+56 9 XXXX XXXX"
                value={acta.contactoFacturacionFono}
                onChange={e => onUpdate({ contactoFacturacionFono: e.target.value })}
              />
            </FieldGroup>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
