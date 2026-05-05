import { useState, useEffect } from "react";

const KEY = "stocklens_favorites";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (ticker) =>
    setFavorites((prev) => (prev.includes(ticker) ? prev : [...prev, ticker]));

  const removeFavorite = (ticker) =>
    setFavorites((prev) => prev.filter((t) => t !== ticker));

  const isFavorite = (ticker) => favorites.includes(ticker);

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
