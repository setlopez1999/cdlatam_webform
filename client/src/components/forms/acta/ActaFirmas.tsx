/**
 * ActaFirmas — Firma del Representante Legal
 * Canvas de dibujo libre, botón borrar, importar imagen de firma
 * Indicador visual "Firmado" cuando hay trazos o imagen importada
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { PenLine, Trash2, Upload, CheckCircle2 } from "lucide-react";
import type { ActaData } from "@/hooks/useFormStore";

interface Props {
  acta: ActaData;
  onUpdate: (updates: Partial<ActaData>) => void;
}

export function ActaFirmas({ acta, onUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [firmado, setFirmado] = useState(false);

  // ── Inicializar canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // ── Helpers de posición ──────────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // ── Eventos de dibujo ────────────────────────────────────────────────────────
  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPos.current) return;

    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setFirmado(true);
  }, []);

  const stopDraw = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
    // Guardar la firma como base64 en el store
    const canvas = canvasRef.current;
    if (canvas && firmado) {
      onUpdate({ firmaImagen: canvas.toDataURL("image/png") });
    }
  }, [firmado, onUpdate]);

  // ── Borrar canvas ────────────────────────────────────────────────────────────
  const handleBorrar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmado(false);
    onUpdate({ firmaImagen: undefined });
  }, [onUpdate]);

  // ── Importar imagen de firma ─────────────────────────────────────────────────
  const handleImportar = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Centrar y ajustar la imagen al canvas manteniendo proporción
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85;
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setFirmado(true);
        // Guardar la firma como base64 en el store
        onUpdate({ firmaImagen: canvas.toDataURL("image/png") });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input para poder importar el mismo archivo de nuevo
    e.target.value = "";
  }, []);

  return (
    <FormSection title="Firma del Representante Legal" icon={PenLine} accent="indigo" collapsible defaultOpen>
      <div className="space-y-4">
        {/* Nombre del firmante */}
        <FieldGroup label="Nombre del Representante Legal">
          <Input
            placeholder="Nombre completo del firmante"
            value={acta.representanteLegal}
            onChange={e => onUpdate({ representanteLegal: e.target.value })}
          />
        </FieldGroup>

        {/* Canvas de firma */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Firma
            </label>
            {firmado && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Firmado
              </span>
            )}
          </div>

          {/* Área de dibujo */}
          <div
            className={`relative rounded-lg border-2 transition-colors overflow-hidden ${
              firmado
                ? "border-green-400 bg-white dark:bg-slate-900"
                : "border-dashed border-border/60 bg-muted/20 hover:bg-muted/30"
            }`}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full h-[140px] cursor-crosshair touch-none block"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!firmado && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1.5">
                <PenLine className="w-6 h-6 text-muted-foreground/30" />
                <span className="text-xs text-muted-foreground/50">
                  Dibuje su firma aquí o importe una imagen
                </span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBorrar}
              className="gap-1.5"
              disabled={!firmado}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar firma
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImportar}
            />
          </div>
        </div>

        {/* Nota legal */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border/40">
          <p className="text-xs text-muted-foreground text-center">
            Al firmar este documento, el representante legal acepta los términos y condiciones descritos en la propuesta comercial y en las consideraciones indicadas.
          </p>
        </div>
      </div>
    </FormSection>
  );
}
