# AGENTS.md

## Purpose
- This repository contains a local-only exome annotation CSV viewer.
- The app is designed for large annotation CSV/TSV files loaded at backend startup.
- The current product goal is fast gene-based browsing, column selection, table filtering/sorting, and CSV export of the currently displayed rows.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: FastAPI
- CSV processing: `polars` first, `pyarrow` available as support

## Project Layout
- `backend/`
  - FastAPI app and CSV loading/search/export logic
- `frontend/`
  - React UI
- `sample.csv`
  - Example input with the expected column format

## Current Product Behavior

### CSV loading
- CSV path is passed when starting the backend.
- Supported encodings: `utf-8`, `utf-8-sig`, `cp932`
- Supported delimiters: comma and tab
- Data is loaded fully into memory on startup.
- `Gene_Name` is required. Missing it is a hard error.

### Search
- The UI has no search button.
- When the gene name input changes or an autocomplete suggestion is chosen, the results update automatically.
- The active UI behavior is exact match search.

### Category and column selection
- Category selection is a dropdown.
- Default selected category is `基本変異情報`.
- Do not reintroduce `無選択` into the category dropdown unless explicitly requested.
- Column checkboxes update the result table immediately.
- Checkbox state is stored per category.
- The reset button means "return to default checked columns", not "clear everything".

### Default checked/displayed columns
- Default list columns are the source of truth for which checkboxes start checked.
- These default columns must remain checked after reset.
- Current default result columns are:
  - `CHROM`
  - `POS`
  - `REF`
  - `ALT`
  - `Gene_Name`
  - `Effect`
  - `Putative_Impact`
  - `HGVS.c`
  - `HGVS.p`
  - `gnomAD_exomes_AF`
- `CLINVAR_CLNSIG` is intentionally not in the default table columns.

### Result table
- There is no right-side detail pane.
- The result table is horizontally scrollable.
- The table supports:
  - sticky headers
  - per-column text filters
  - per-column sort toggle in the header
- Frontend table filters/sorts operate on the currently loaded page of results.

### Export
- There is one CSV export button.
- Export downloads only the rows currently displayed in the result table.
- Current table filters and sorts must be respected for visible export behavior.

## Files To Check Before Major UI Changes
- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `frontend/src/api.ts`
- `frontend/src/columnDescriptions.ts`
- `backend/main.py`
- `backend/categories.py`

## Editing Guidelines
- Preserve the current Japanese UI labels unless the user asks for copy changes.
- Keep the UI simple and research/medical-tool appropriate.
- Avoid adding extra workflow steps when the current UX intentionally uses immediate reflection.
- If changing default columns, keep backend and frontend initialization in sync.
- If changing export behavior, make sure it still matches the table users are looking at.

## Validation
- Frontend build:
  - `cd frontend && npm run build`
- Backend run example:
  - `python3 backend/main.py --csv /Users/du/Desktop/exome/sample.csv`

## Common Gotchas
- The backend owns CSV parsing and server-side search/pagination.
- The frontend owns the currently displayed table filtering/sorting.
- Reset behavior is product-sensitive. It currently restores defaults, not an empty state.
- Category dropdown default and checkbox default state are intentional and should not drift apart.
