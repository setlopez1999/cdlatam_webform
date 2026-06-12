/**
 * Re-export desde la estructura modular pdf/.
 * @deprecated Importar desde "@/lib/pdf" en lugar de "@/lib/pdfExport".
 */
export type { ClausulaParaPdf, SectionFlags, ActaPdfExportOpts } from "./pdf/types";
export { createActaPdfBlob, downloadPdfBlob, generateActaPDF } from "./pdf/acta-pdf";
export { generateResultadoPDF } from "./pdf/resultado-ep";
export { buildFeaturesResumidoPdfBytes } from "./pdf/features-resumido";
