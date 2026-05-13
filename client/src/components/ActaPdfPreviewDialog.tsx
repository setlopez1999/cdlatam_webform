import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadPdfBlob } from "@/lib/pdfExport";

export interface ActaPdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: Blob | null;
  filename: string;
}

export function ActaPdfPreviewDialog({ open, onOpenChange, blob, filename }: ActaPdfPreviewDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setObjectUrl(u => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(blob);
    setObjectUrl(u => {
      if (u) URL.revokeObjectURL(u);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-4xl w-[95vw] h-[min(90vh,900px)] flex flex-col gap-0 p-0 overflow-hidden sm:max-w-4xl"
      >
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0 space-y-1">
          <DialogTitle className="text-base truncate pr-8" title={filename}>
            Vista previa — {filename}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-[50vh] bg-muted/30">
          {objectUrl ? (
            <iframe title="Vista previa PDF" src={objectUrl} className="w-full h-full min-h-[50vh] border-0 block" />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {blob ? "Cargando vista previa…" : "Sin documento"}
            </div>
          )}
        </div>
        <DialogFooter className="px-4 py-3 border-t shrink-0 gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={() => blob && downloadPdfBlob(blob, filename)} disabled={!blob}>
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
