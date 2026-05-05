const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function get(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const fetchStockData    = (ticker) => get(`/api/stock/${ticker}`);
export const fetchSectorAverage = (ticker) => get(`/api/stock/${ticker}/sector-average`);
export const fetchHistory      = (ticker) => get(`/api/stock/${ticker}/history`);
export const fetchNews         = (ticker) => get(`/api/stock/${ticker}/news`);

export const fetchAIComment    = (body)   => post("/api/ai/comment", body);
export const fetchNewsSummary  = (body)   => post("/api/ai/news-summary", body);
