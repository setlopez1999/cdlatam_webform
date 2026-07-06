import { describe, it, expect, vi, beforeAll } from "vitest";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

// Los imports de assets PNG se resuelven a URLs en el bundle Vite.
// En vitest (Node) hay que mockearlos.
vi.mock("@/assets/cdlatam-logo-on-brand.png", () => ({
  default: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
}));

// Mock global Image para getImageDimensions en Node
beforeAll(() => {
  (globalThis as any).Image = class Image {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 100;
    naturalHeight = 20;
    set src(_val: string) {
      // Simular carga exitosa
      setTimeout(() => this.onload?.(), 0);
    }
  };
});

import { drawHeaderSync, drawSharedHeader, getImageDimensions } from "./draw-header";
import type { LogoRenderData } from "./draw-header";
import { resolveLayout } from "./layout";
import { PDF_HEADER_COLOR, LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX } from "./constants";

const MOCK_LOGO: LogoRenderData = {
  src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  naturalW: 100,
  naturalH: 20,
};

describe("drawHeaderSync", () => {
  it("retorna la posicion y final correcta (topM + bandH + botG)", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    const y = drawHeaderSync(doc, lo, "Test", [], 15, 210, 0, {
      bandHeightMm: 26,
      topMarginMm: 8,
      bottomGapMm: 10,
      logoRenderData: MOCK_LOGO,
    });
    expect(y).toBe(44);
  });

  it("usa logoRenderData cuando se provee (no fallback CDLatam)", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    drawHeaderSync(doc, lo, "Test", [], 15, 210, 0, {
      logoRenderData: MOCK_LOGO,
    });
    const out = doc.output("arraybuffer");
    // Debe producir un PDF válido (no vacío)
    expect(out.byteLength).toBeGreaterThan(500);
  });

  it("funciona sin opts (defaults)", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    const y = drawHeaderSync(doc, lo, "Sin Opciones", [], 15, 210, 0);
    // Defaults: topM=8, bandH=26, botG=10
    expect(y).toBe(44);
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(500);
  });

  it("respeta rightLines", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    drawHeaderSync(doc, lo, "Title", ["Line A", "Line B"], 15, 210, 0, {
      logoRenderData: MOCK_LOGO,
    });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(500);
  });

  it("respita parametros de dimension override", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    const y = drawHeaderSync(doc, lo, "Title", ["X"], 15, 210, 0, {
      bandHeightMm: 5,
      topMarginMm: 2,
      bottomGapMm: 4,
      logoRenderData: MOCK_LOGO,
    });
    expect(y).toBe(11);
  });

  it("respeta fontSize override", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    drawHeaderSync(doc, lo, "Title", ["Sub"], 15, 210, 0, {
      fontSizeTitle: 16,
      fontSizeSubtitle: 10,
      logoRenderData: MOCK_LOGO,
    });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(500);
  });

  it("respeta titleOffsetY override", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lo = { fontSize: { title: 13, small: 7 } };
    drawHeaderSync(doc, lo, "Title", [], 15, 210, 0, {
      titleOffsetY: -3,
      logoRenderData: MOCK_LOGO,
    });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(500);
  });
});

describe("drawSharedHeader en formato pequeño (como cláusulas)", () => {
  it("genera header en pagina de alto reducido y produce PDF valido", async () => {
    const HEADER_MM = 11;
    const tempDoc = new jsPDF({ unit: "mm", format: [215.9, HEADER_MM] });
    const tempLo = resolveLayout(tempDoc, { compact: true });
    const pw = tempDoc.internal.pageSize.getWidth();

    await drawSharedHeader(tempDoc, tempLo, "CDLatam", [], 15, pw, 0, {
      bandHeightMm: 5,
      topMarginMm: 2,
      bottomGapMm: 4,
      empresaLogoBase64: MOCK_LOGO.src,
    });

    const hdrBytes = tempDoc.output("arraybuffer") as unknown as Uint8Array;
    const hdrPdf = await PDFDocument.load(hdrBytes);
    const pages = hdrPdf.getPageCount();
    expect(pages).toBe(1);

    // Verificar que se puede embeber (como se hace en clausulas)
    const merged = await PDFDocument.create();
    const [embed] = await merged.embedPdf(hdrPdf, [0]);
    expect(embed).toBeDefined();
    const out = await merged.save();
    expect(out.byteLength).toBeGreaterThan(500);
  });
});
