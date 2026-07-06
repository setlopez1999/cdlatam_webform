import { describe, it, expect, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("@/assets/cdlatam-logo-on-brand.png", () => ({
  default: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
}));

// Mock global Image para getImageDimensions
(globalThis as any).Image = class Image {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 100;
  naturalHeight = 20;
  set src(_val: string) {
    setTimeout(() => this.onload?.(), 0);
  }
};

import { buildFeaturesUnoPdfBytes, buildFeaturesResumidoPdfBytes } from "./features-resumido";

const MOCK_ITEMS = [
  { key: "f1", label: "Feature 1", descripcion: "Descripción 1", estado: true },
  { key: "f2", label: "Feature 2", descripcion: "Descripción 2", estado: false },
];

describe("buildFeaturesUnoPdfBytes", () => {
  it("genera un PDF valido", async () => {
    const bytes = await buildFeaturesUnoPdfBytes(MOCK_ITEMS, "Cliente Test");
    expect(bytes.byteLength).toBeGreaterThan(500);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("genera PDF con multiples paginas cuando hay muchos items", async () => {
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      key: `f${i}`,
      label: `Feature ${i}`,
      descripcion: `Desc ${i}`,
      estado: i % 2 === 0,
    }));
    const bytes = await buildFeaturesUnoPdfBytes(manyItems, "Cliente Test");
    expect(bytes.byteLength).toBeGreaterThan(500);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it("acepta empresaLogoBase64 sin errores", async () => {
    const bytes = await buildFeaturesUnoPdfBytes(
      MOCK_ITEMS,
      "Cliente Test",
      undefined,
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    );
    expect(bytes.byteLength).toBeGreaterThan(500);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("usa buildFeaturesResumidoPdfBytes (wrapper compat)", async () => {
    const items = MOCK_ITEMS.map(i => ({ ...i, descripcion: i.descripcion as string | undefined }));
    const bytes = await buildFeaturesResumidoPdfBytes(items, "Cliente Test");
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
