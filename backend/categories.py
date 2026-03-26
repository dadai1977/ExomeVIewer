from __future__ import annotations

from collections import OrderedDict

DEFAULT_CATEGORY = "基本変異情報"

DEFAULT_RESULT_COLUMNS = [
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
]


def _ordered_unique(values: list[str]) -> list[str]:
    return list(OrderedDict.fromkeys(values))


CATEGORY_RULES: list[tuple[str, callable]] = [
    (
        "基本変異情報",
        lambda column: column
        in {
            "CHROM",
            "POS",
            "REF",
            "ALT",
            "DP",
            "AD",
            "QUAL",
            "MQ",
            "Zygosity",
            "FILTER",
            "Effect",
            "Putative_Impact",
            "Gene_Name",
        },
    ),
    (
        "トランスクリプト/表記",
        lambda column: column
        in {
            "Feature_Type",
            "Feature_ID",
            "Transcript_BioType",
            "Rank/Total",
            "HGVS.c",
            "HGVS.p",
            "REF_AA",
            "ALT_AA",
            "cDNA_pos",
            "cDNA_length",
            "CDS_pos",
            "CDS_length",
            "AA_pos",
            "AA_length",
            "Distance",
            "hg19_chr",
            "hg19_pos(1-based)",
            "cds_strand",
            "refcodon",
            "codonpos",
            "codon_degeneracy",
            "REF_AA_dbnsfp",
            "ALT_AA_dbnsfp",
        },
    ),
    (
        "ID/外部DB",
        lambda column: column.startswith("dbSNP") or column == "Interpro_domain",
    ),
    (
        "集団頻度",
        lambda column: column.startswith("p3_1000G_")
        or column.startswith("ESP6500_")
        or column.startswith("gnomAD_"),
    ),
    (
        "ClinVar/疾患",
        lambda column: column.startswith("CLINVAR_")
        or column == "ACMG_SF_v3.2"
        or column.startswith("MIM_")
        or column == "Disease_description"
        or column == "Trait_association(GWAS)",
    ),
    (
        "病的予測",
        lambda column: column.startswith("SIFT_")
        or column.startswith("LRT_")
        or column.startswith("MutationTaster_")
        or column.startswith("MutationAssessor_")
        or column.startswith("FATHMM_")
        or column.startswith("PROVEAN_")
        or column.startswith("MetaSVM_")
        or column.startswith("MetaLR_")
        or column.startswith("M-CAP_")
        or column.startswith("MutPred_")
        or column.startswith("fathmm-MKL_")
        or column.startswith("Eigen")
        or column.startswith("integrated_")
        or column.startswith("GERP++_")
        or column == "Reliability_index",
    ),
    (
        "遺伝子/機能",
        lambda column: column.startswith("GTEx_")
        or column.startswith("Gene_")
        or column.startswith("Pathway")
        or column.startswith("Function_")
        or column.startswith("GO_")
        or column.startswith("Tissue_")
        or column.startswith("Expression(")
        or column.startswith("Interactions(")
        or column in {"P(HI)", "P(rec)", "Known_rec_info", "RVIS_EVS", "RVIS_percentile_EVS", "LoF-FDR_ExAC", "RVIS_ExAC", "RVIS_percentile_ExAC", "GHIS", "GDI", "GDI-Phred"}
        or column.startswith("Gene_damage_prediction"),
    ),
]


def build_categories(columns: list[str]) -> dict[str, list[str]]:
    categories: OrderedDict[str, list[str]] = OrderedDict((name, []) for name, _ in CATEGORY_RULES)
    categories["その他"] = []

    for column in columns:
        assigned = False
        for name, matcher in CATEGORY_RULES:
            if matcher(column):
                categories[name].append(column)
                assigned = True
                break
        if not assigned:
            categories["その他"].append(column)

    return {name: _ordered_unique(items) for name, items in categories.items() if items}


def build_default_checked_by_category(categories: dict[str, list[str]]) -> dict[str, list[str]]:
    defaults: dict[str, list[str]] = {}
    default_set = set(DEFAULT_RESULT_COLUMNS)
    for category, columns in categories.items():
        defaults[category] = [column for column in columns if column in default_set]
    return defaults
