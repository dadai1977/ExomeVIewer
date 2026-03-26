import { useEffect, useMemo, useState } from "react";
import { fetchMeta, fetchSearch, type MetaResponse, type SearchRow } from "./api";
import { DEFAULT_RESULT_COLUMNS, getColumnDescription } from "./columnDescriptions";

const PAGE_SIZE = 100;

type SortDirection = "asc" | "desc" | null;

function cycleSort(direction: SortDirection): SortDirection {
  if (direction === null) {
    return "asc";
  }
  if (direction === "asc") {
    return "desc";
  }
  return null;
}

function compareValues(left: string, right: string): number {
  const leftNumber = Number(left.replaceAll(",", ""));
  const rightNumber = Number(right.replaceAll(",", ""));
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && left !== "" && right !== "") {
    return leftNumber - rightNumber;
  }
  return left.localeCompare(right, "ja");
}

function buildCsv(columns: string[], rows: SearchRow[]): string {
  const escapeValue = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const header = columns.map(escapeValue).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeValue(row[column] ?? "")).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("基本変異情報");
  const [checkedByCategory, setCheckedByCategory] = useState<Record<string, string[]>>({});
  const [geneInput, setGeneInput] = useState("");
  const [searchRows, setSearchRows] = useState<SearchRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<{ column: string | null; direction: SortDirection }>({
    column: null,
    direction: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMeta() {
      try {
        const response = await fetchMeta();
        setMeta(response);
        setSelectedCategory(response.defaultCategory);
        setCheckedByCategory(response.defaultCheckedByCategory);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "メタ情報の取得に失敗しました。");
      }
    }

    void loadMeta();
  }, []);

  useEffect(() => {
    if (!meta) {
      return;
    }

    const exactMatched = meta.geneNames.includes(geneInput.trim());
    if (!exactMatched) {
      setSearchRows([]);
      setTotalRows(0);
      return;
    }

    async function loadSearch() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchSearch(geneInput.trim(), page, PAGE_SIZE);
        setSearchRows(response.rows);
        setTotalRows(response.total);
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : "検索に失敗しました。");
      } finally {
        setLoading(false);
      }
    }

    void loadSearch();
  }, [geneInput, meta, page]);

  const visibleColumns = useMemo(() => {
    if (!meta) {
      return DEFAULT_RESULT_COLUMNS;
    }
    const selected = new Set<string>();
    Object.values(checkedByCategory).forEach((columns) => {
      columns.forEach((column) => selected.add(column));
    });

    const ordered = meta.columns.filter((column) => selected.has(column));
    return ordered.length > 0 ? ordered : DEFAULT_RESULT_COLUMNS;
  }, [checkedByCategory, meta]);

  const currentCategoryColumns = useMemo(
    () => (meta ? meta.categories[selectedCategory] ?? [] : []),
    [meta, selectedCategory],
  );

  const displayedRows = useMemo(() => {
    const filteredRows = searchRows.filter((row) =>
      visibleColumns.every((column) => {
        const filterValue = (filters[column] ?? "").trim().toLowerCase();
        if (!filterValue) {
          return true;
        }
        return (row[column] ?? "").toLowerCase().includes(filterValue);
      }),
    );

    if (!sortState.column || !sortState.direction) {
      return filteredRows;
    }

    const sorted = [...filteredRows].sort((left, right) => {
      const result = compareValues(left[sortState.column!] ?? "", right[sortState.column!] ?? "");
      return sortState.direction === "asc" ? result : -result;
    });
    return sorted;
  }, [filters, searchRows, sortState, visibleColumns]);

  const exactMatched = meta ? meta.geneNames.includes(geneInput.trim()) : false;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const autocompleteOptions = useMemo(() => {
    if (!meta || !geneInput.trim()) {
      return [];
    }
    const keyword = geneInput.trim().toLowerCase();
    return meta.geneNames.filter((gene) => gene.toLowerCase().includes(keyword)).slice(0, 12);
  }, [geneInput, meta]);

  function toggleColumn(category: string, column: string) {
    setCheckedByCategory((current) => {
      const existing = current[category] ?? [];
      const next = existing.includes(column)
        ? existing.filter((value) => value !== column)
        : [...existing, column];
      return { ...current, [category]: next };
    });
  }

  function resetColumns() {
    if (!meta) {
      return;
    }
    setCheckedByCategory(meta.defaultCheckedByCategory);
  }

  function handleSort(column: string) {
    setSortState((current) => ({
      column,
      direction: current.column === column ? cycleSort(current.direction) : "asc",
    }));
  }

  function handleExport() {
    const csv = buildCsv(visibleColumns, displayedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${geneInput.trim() || "results"}_displayed.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Local Exome Annotation Viewer</p>
          <h1>遺伝子変異アノテーション閲覧</h1>
          <p className="subtle">
            遺伝子名の完全一致で検索し、表示列を調整しながら現在の表示結果だけを CSV 出力できます。
          </p>
        </div>
        {meta ? (
          <dl className="meta-card">
            <div>
              <dt>入力ファイル</dt>
              <dd>{meta.csvPath}</dd>
            </div>
            <div>
              <dt>文字コード</dt>
              <dd>{meta.encoding}</dd>
            </div>
            <div>
              <dt>区切り</dt>
              <dd>{meta.delimiter}</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <main className="layout">
        <section className="panel controls-panel">
          <div className="section-header">
            <h2>検索</h2>
          </div>

          <label className="field">
            <span>Gene_Name</span>
            <input
              list="gene-suggestions"
              value={geneInput}
              onChange={(event) => {
                setGeneInput(event.target.value);
                setPage(1);
              }}
              placeholder="例: DDX11L1"
            />
            <datalist id="gene-suggestions">
              {autocompleteOptions.map((gene) => (
                <option key={gene} value={gene} />
              ))}
            </datalist>
          </label>

          <p className="hint">
            {geneInput.trim()
              ? exactMatched
                ? "完全一致した遺伝子名で結果を表示しています。"
                : "完全一致のみ対応しています。候補から選択するか、正確な遺伝子名を入力してください。"
              : "遺伝子名を入力すると自動で検索します。"}
          </p>

          <div className="section-header">
            <h2>表示列</h2>
            <button className="secondary-button" onClick={resetColumns} type="button">
              初期表示に戻す
            </button>
          </div>

          <label className="field">
            <span>カテゴリ</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {meta
                ? Object.keys(meta.categories).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))
                : null}
            </select>
          </label>

          <div className="checkbox-grid">
            {currentCategoryColumns.map((column) => {
              const checked = (checkedByCategory[selectedCategory] ?? []).includes(column);
              return (
                <label key={column} className="checkbox-item" title={getColumnDescription(column)}>
                  <input
                    checked={checked}
                    onChange={() => toggleColumn(selectedCategory, column)}
                    type="checkbox"
                  />
                  <span>{column}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="panel results-panel">
          <div className="section-header">
            <div>
              <h2>結果</h2>
              <p className="subtle">
                {exactMatched ? `${totalRows.toLocaleString()} 件中 ${displayedRows.length.toLocaleString()} 件を表示` : "0 件"}
              </p>
            </div>
            <button className="primary-button" disabled={displayedRows.length === 0} onClick={handleExport} type="button">
              CSV 出力
            </button>
          </div>

          {error ? <div className="message error">{error}</div> : null}
          {loading ? <div className="message">検索中...</div> : null}
          {!loading && !exactMatched && geneInput.trim() ? (
            <div className="message">一致する `Gene_Name` がありません。</div>
          ) : null}
          {!loading && !geneInput.trim() ? <div className="message">遺伝子名を入力してください。</div> : null}

          <div className="table-toolbar">
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                前へ
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages || totalRows === 0}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                次へ
              </button>
            </div>
            <p className="subtle">フィルタとソートは現在ページの結果に対して適用されます。</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column}>
                      <button className="sort-button" onClick={() => handleSort(column)} type="button">
                        <span>{column}</span>
                        <span className="sort-indicator">
                          {sortState.column === column
                            ? sortState.direction === "asc"
                              ? "▲"
                              : sortState.direction === "desc"
                                ? "▼"
                                : "•"
                            : "•"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={`${column}-filter`}>
                      <input
                        className="filter-input"
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            [column]: event.target.value,
                          }))
                        }
                        placeholder="フィルタ"
                        value={filters[column] ?? ""}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedRows.length > 0 ? (
                  displayedRows.map((row, rowIndex) => (
                    <tr key={`${rowIndex}-${row.CHROM ?? ""}-${row.POS ?? ""}`}>
                      {visibleColumns.map((column) => (
                        <td key={`${rowIndex}-${column}`}>{row[column] ?? ""}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-cell" colSpan={visibleColumns.length}>
                      表示できる結果がありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
