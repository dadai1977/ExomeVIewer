export type SearchRow = Record<string, string>;

export type MetaResponse = {
  columns: string[];
  categories: Record<string, string[]>;
  defaultCategory: string;
  defaultColumns: string[];
  defaultCheckedByCategory: Record<string, string[]>;
  geneNames: string[];
  csvPath: string;
  encoding: string;
  delimiter: string;
};

export type SearchResponse = {
  rows: SearchRow[];
  total: number;
  page: number;
  page_size: number;
};

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.port === "5173" ? "http://127.0.0.1:8000" : "");

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchMeta(): Promise<MetaResponse> {
  return request<MetaResponse>("/api/meta");
}

export function fetchSearch(geneName: string, page: number, pageSize: number): Promise<SearchResponse> {
  const params = new URLSearchParams({
    gene_name: geneName,
    page: String(page),
    page_size: String(pageSize),
  });
  return request<SearchResponse>(`/api/search?${params.toString()}`);
}
