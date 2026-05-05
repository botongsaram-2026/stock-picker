const BASE_URL = "http://localhost:8000";

async function get(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const fetchStockData    = (ticker) => get(`/api/stock/${ticker}`);
export const fetchSectorAverage = (ticker) => get(`/api/stock/${ticker}/sector-average`);
export const fetchHistory      = (ticker) => get(`/api/stock/${ticker}/history`);
export const fetchNews         = (ticker) => get(`/api/stock/${ticker}/news`);
