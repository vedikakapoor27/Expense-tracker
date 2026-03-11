// ─── theme.js — shared across all pages ──────────────────────────────────────
// Handles: dark/light mode, currency preference, avatar initials

// ── Currency config ───────────────────────────────────────────────────────────
const CURRENCIES = {
  INR: { symbol: "₹", code: "INR", name: "Indian Rupee",   locale: "en-IN" },
  USD: { symbol: "$", code: "USD", name: "US Dollar",       locale: "en-US" },
  EUR: { symbol: "€", code: "EUR", name: "Euro",            locale: "de-DE" },
  GBP: { symbol: "£", code: "GBP", name: "British Pound",   locale: "en-GB" },
  JPY: { symbol: "¥", code: "JPY", name: "Japanese Yen",    locale: "ja-JP" },
  AED: { symbol: "د.إ", code: "AED", name: "UAE Dirham",   locale: "ar-AE" },
};

// Approximate rates relative to INR (base)
const RATES_FROM_INR = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, JPY: 1.78, AED: 0.044 };

function getActiveCurrency() {
  return localStorage.getItem("ft_currency") || "INR";
}
function setActiveCurrency(code) {
  localStorage.setItem("ft_currency", code);
}
function formatMoney(amountInINR) {
  const code = getActiveCurrency();
  const cfg  = CURRENCIES[code] || CURRENCIES.INR;
  const rate = RATES_FROM_INR[code] || 1;
  const converted = amountInINR * rate;
  return cfg.symbol + Number(converted).toLocaleString(cfg.locale, {
    minimumFractionDigits: code === "JPY" ? 0 : 2,
    maximumFractionDigits: code === "JPY" ? 0 : 2,
  });
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function getTheme() { return localStorage.getItem("ft_theme") || "dark"; }
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ft_theme", theme);
  // update toggle icon if present
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
function toggleTheme() {
  applyTheme(getTheme() === "dark" ? "light" : "dark");
}

// Apply theme immediately on load (before paint) to avoid flash
applyTheme(getTheme());

// ── Avatar initials ───────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
function getAvatarColor(uid) {
  const colors = ["#6366f1","#22d3ee","#a78bfa","#10b981","#f59e0b","#ec4899","#f97316","#3b82f6"];
  if (!uid) return colors[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}