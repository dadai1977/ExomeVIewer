from __future__ import annotations

import argparse
import csv
import io
from pathlib import Path
from typing import Any

import polars as pl
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from categories import (
    DEFAULT_CATEGORY,
    DEFAULT_RESULT_COLUMNS,
    build_categories,
    build_default_checked_by_category,
)

SUPPORTED_ENCODINGS = ["utf-8-sig", "utf-8", "cp932"]
SUPPORTED_DELIMITERS = [",", "\t"]


class SearchResponse(BaseModel):
    rows: list[dict[str, Any]]
    total: int
    page: int
    page_size: int


class DatasetState:
    def __init__(self, csv_path: Path) -> None:
        self.csv_path = csv_path
        self.encoding = self._detect_encoding(csv_path)
        self.delimiter = self._detect_delimiter(csv_path, self.encoding)
        self.frame = self._load_frame(csv_path, self.encoding, self.delimiter)

        if "Gene_Name" not in self.frame.columns:
            raise ValueError("Gene_Name column is required.")

        self.frame = self.frame.with_columns(pl.all().cast(pl.Utf8, strict=False).fill_null(""))
        self.columns = self.frame.columns
        self.categories = build_categories(self.columns)
        self.default_checked_by_category = build_default_checked_by_category(self.categories)
        self.gene_names = sorted(
            {
                gene
                for gene in self.frame.get_column("Gene_Name").to_list()
                if isinstance(gene, str) and gene.strip()
            }
        )

    def _detect_encoding(self, csv_path: Path) -> str:
        raw = csv_path.read_bytes()
        for encoding in SUPPORTED_ENCODINGS:
            try:
                raw.decode(encoding)
                return encoding
            except UnicodeDecodeError:
                continue
        raise ValueError(f"Unsupported encoding. Expected one of: {', '.join(SUPPORTED_ENCODINGS)}")

    def _detect_delimiter(self, csv_path: Path, encoding: str) -> str:
        sample = csv_path.read_bytes()[:16384].decode(encoding)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters="".join(SUPPORTED_DELIMITERS))
            if dialect.delimiter in SUPPORTED_DELIMITERS:
                return dialect.delimiter
        except csv.Error:
            pass
        return ","

    def _load_frame(self, csv_path: Path, encoding: str, delimiter: str) -> pl.DataFrame:
        text = csv_path.read_bytes().decode(encoding)
        reader = csv.reader(io.StringIO(text), delimiter=delimiter)
        try:
            header = next(reader)
        except StopIteration as exc:
            raise ValueError("CSV/TSV file is empty.") from exc

        schema_overrides = {column: pl.Utf8 for column in header}
        return pl.read_csv(
            io.StringIO(text),
            separator=delimiter,
            schema_overrides=schema_overrides,
            infer_schema_length=0,
            null_values=[],
            ignore_errors=False,
        )

    def search(self, gene_name: str, page: int, page_size: int) -> SearchResponse:
        normalized_gene = gene_name.strip()
        if not normalized_gene:
            return SearchResponse(rows=[], total=0, page=page, page_size=page_size)

        result = self.frame.filter(pl.col("Gene_Name") == normalized_gene)
        total = result.height
        start = (page - 1) * page_size
        rows = result.slice(start, page_size).to_dicts()
        return SearchResponse(rows=rows, total=total, page=page, page_size=page_size)


def create_app(state: DatasetState) -> FastAPI:
    app = FastAPI(title="Exome Annotation Viewer")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/meta")
    def get_meta() -> dict[str, Any]:
        return {
            "columns": state.columns,
            "categories": state.categories,
            "defaultCategory": DEFAULT_CATEGORY,
            "defaultColumns": DEFAULT_RESULT_COLUMNS,
            "defaultCheckedByCategory": state.default_checked_by_category,
            "geneNames": state.gene_names,
            "csvPath": str(state.csv_path),
            "encoding": state.encoding,
            "delimiter": "tab" if state.delimiter == "\t" else "comma",
        }

    @app.get("/api/search", response_model=SearchResponse)
    def search(
        gene_name: str = Query(default=""),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=100, ge=1, le=1000),
    ) -> SearchResponse:
        return state.search(gene_name=gene_name, page=page, page_size=page_size)

    frontend_dist = Path(__file__).resolve().parents[1] / "frontend" / "dist"
    assets_dir = frontend_dist / "assets"
    index_file = frontend_dist / "index.html"

    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", response_model=None)
    def root():
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "Frontend build not found. Run `cd frontend && npm install && npm run build`."}

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local exome annotation CSV viewer")
    parser.add_argument("--csv", required=True, help="Path to the CSV/TSV file")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    csv_path = Path(args.csv).expanduser().resolve()
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    try:
        state = DatasetState(csv_path)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    app = create_app(state)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
