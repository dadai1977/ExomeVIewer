export const DEFAULT_RESULT_COLUMNS = [
  "CHROM",
  "POS",
  "REF",
  "ALT",
  "Gene_Name",
  "Effect",
  "Putative_Impact",
  "HGVS.c",
  "HGVS.p",
  "gnomAD_exomes_AF",
];

export const COLUMN_DESCRIPTIONS: Record<string, string> = {
  CHROM: "染色体",
  POS: "座位",
  REF: "参照塩基",
  ALT: "変異塩基",
  Gene_Name: "遺伝子名",
  Effect: "変異影響",
  Putative_Impact: "影響度推定",
  "HGVS.c": "cDNA 表記",
  "HGVS.p": "タンパク表記",
  gnomAD_exomes_AF: "gnomAD Exomes 頻度",
  CLINVAR_CLNSIG: "ClinVar 臨床的意義",
};

export function getColumnDescription(column: string): string {
  return COLUMN_DESCRIPTIONS[column] ?? column;
}
