import { describe, it, expect, vi } from "vitest";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

vi.mock("@/assets/cdlatam-logo-on-brand.png", () => ({
  default: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
}));

(globalThis as any).Image = class Image {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 100;
  naturalHeight = 20;
  set src(_val: string) {
    setTimeout(() => this.onload?.(), 0);
  }
};

import { createActaPdfBlob, downloadPdfBlob } from "./acta-pdf";

describe("createActaPdfBlob", () => {
  const MINIMAL_ACTA: any = {
    noActa: "TEST-001",
    fecha: "2026-01-01",
    sres: "Cliente Test",
    atencion: "Persona Test",
    rut: "12.345.678-9",
    razonSocial: "Razon Social Test",
    direccion: "Direccion Test",
    ciudad: "Ciudad Test",
    pais: "Chile",
    representanteLegal: "Rep Legal",
    representanteTelefonoFijo: "+56 2 1234 5678",
    representanteTelefonoMovil: "",
    representanteEmail: "rep@test.cl",
    contactoTecnicoNombre: "Tecnico Test",
    contactoTecnicoTelefonoFijo: "",
    contactoTecnicoTelefonoMovil: "+56 9 8765 4321",
    contactoTecnicoEmail: "tec@test.cl",
    contactoFacturacionNombre: "Fact Test",
    contactoFacturacionTelefonoFijo: "",
    contactoFacturacionTelefonoMovil: "",
    contactoFacturacionEmail: "fact@test.cl",
    moneda: "CLP",
    serviciosContratados: [
      {
        id: "s1",
        unidadNegocio: "CLOUD",
        solucion: "Solucion A",
        detalleServicio: "Detalle A",
        tipoVenta: "Venta",
        cantidad: 1,
        precioUnitario: 100000,
        total: 100000,
        plazo: "Mensual",
      },
    ],
    formasPagoImplementacion: [],
    formasPagoMantencion: [],
    consideracionesPersonalizadas: [],
    clausulasLegales: "",
  };

  it("genera un PDF blob valido sin clausulas", async () => {
    const { blob, filename } = await createActaPdfBlob(MINIMAL_ACTA);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);
    expect(filename).toContain(".pdf");
  });

  it("genera un PDF blob con numero de acta real", async () => {
    const { blob, filename } = await createActaPdfBlob(MINIMAL_ACTA, [], {
      serverNroActa: 10001,
      serverUnidadNegocio: "VS",
    });
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toBe("application/pdf");
    expect(filename).toContain(".pdf");
  });

  it("incluye features resumido cuando se provee", async () => {
    const { PDFDocument: PDFDoc } = await import("pdf-lib");
    // Crear un PDF simple como features
    const featDoc = new jsPDF({ unit: "mm", format: "letter" });
    featDoc.text("FEATURES", 10, 10);
    const featBytes = new Uint8Array(featDoc.output("arraybuffer"));

    const { blob } = await createActaPdfBlob(MINIMAL_ACTA, [], {
      featuresResumidoBytes: featBytes,
    });

    const buf = await blob.arrayBuffer();
    const pdf = await PDFDoc.load(buf);
    // Debe tener al menos 2 paginas: acta + features
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("incluye clausulas y les agrega header", async () => {
    // Crear un PDF de clausula simple
    const clauseDoc = new jsPDF({ unit: "mm", format: "letter" });
    clauseDoc.text("CLAUSULA CONTENT", 10, 50);
    const clauseBytes = clauseDoc.output("arraybuffer");

    // Convertir a Blob y crear una URL falsa
    const clauseBlob = new Blob([clauseBytes], { type: "application/pdf" });
    const clauseUrl = URL.createObjectURL(clauseBlob);

    const clausulas = [
      {
        id: 1,
        valor: "Clausula legal de prueba",
        filePath: clauseUrl,
        fileName: "clausula_test.pdf",
        tipo: "clausula",
        ordenGlobal: 10,
      },
    ];

    const { blob } = await createActaPdfBlob(MINIMAL_ACTA, clausulas, {
      empresaLogoBase64:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      expedienteUuid: "test-uuid",
    });

    const buf = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    // Debe tener acta + clausula = 2+ paginas
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);

    URL.revokeObjectURL(clauseUrl);
  });
});
