export interface ClausulaParaPdf {
  id: number;
  valor: string;
  filePath: string;
  fileName: string;
  tipo?: string;
  ordenGlobal?: number;
}

export type SectionFlags = {
  formasPago?: boolean;
  consideraciones?: boolean;
  clausulasLegales?: boolean;
};

export type ActaPdfExportOpts = {
  onClausulaError?: (c: ClausulaParaPdf, err: unknown) => void;
  expedienteUuid?: string;
  featuresResumidoBytes?: Uint8Array;
  fontSizeScale?: number;
  compact?: boolean;
  singlePage?: boolean;
  sections?: SectionFlags;
};

export interface PdfLayout {
  scale: number;
  margin: number;
  contentWidth: number;
  pageWidth: number;
  pageHeight: number;
  fontSize: {
    title: number;
    subtitle: number;
    sectionTitle: number;
    body: number;
    small: number;
    tiny: number;
  };
  lineHeight: number;
  spacing: number;
  sectionGap: number;
  cellPadding: number;
  compact: boolean;
  singlePage: boolean;
  noPageBreaks: boolean;
  sections: Required<SectionFlags>;
}

export interface FieldDef {
  label: string;
  value: string | number | undefined | null;
}

export type DocEntry =
  | { kind: "static"; clausula: ClausulaParaPdf }
  | { kind: "dynamic_features_resumido" };

export type CellPrep = { label: string; lines: string[] };
