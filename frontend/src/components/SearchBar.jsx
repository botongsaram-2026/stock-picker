import { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const ticker = input.trim();
    if (!ticker) {
      setError("종목명 또는 티커를 입력해주세요.");
      return;
    }
    setError("");
    onSearch(ticker);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          placeholder="종목명 또는 티커 입력  예) AAPL · 005930 · TSLA"
          className="flex-1 px-5 py-3 rounded-xl bg-slate-800 border border-slate-600
                     text-white placeholder-slate-400 text-sm outline-none
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-white font-semibold text-sm transition flex items-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              조회 중
            </>
          ) : "검색"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-400 pl-1">{error}</p>
      )}
    </div>
  );
}
