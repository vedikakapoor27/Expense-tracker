// ─── State ────────────────────────────────────────────────────────────────────
let currentUser  = null;
let expenses     = [];
let budgets      = { income: 0, limit: 0 };
let expenseChart = null;
let chartType    = "doughnut";

// ─── DOM ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const incomeValueEl    = $("incomeValue");
const budgetValueEl    = $("budgetValue");
const spentValueEl     = $("spentValue");
const remainingValueEl = $("remainingValue");
const expenseTableBody = $("expenseTableBody");
const formMsg          = $("formMsg");
const bannerMessage    = $("bannerMessage");
const filterMonth      = $("filterMonth");
const searchInput      = $("searchInput");
const exportCsvBtn     = $("exportCsv");
const exportPdfBtn     = $("exportPdf");
const toggleChartBtn   = $("toggleChart");
const budgetAlertBox   = $("budgetAlertBox");
const budgetAlertMsg   = $("budgetAlertMsg");
const budgetRingEl     = $("budgetRing");
const expenseCountEl   = $("expenseCount");

const budgetForm    = $("budgetForm");
const incomeInput   = $("incomeInput");
const budgetInput   = $("budgetInput");
const expenseForm   = $("expenseForm");
const titleInput    = $("titleInput");
const amountInput   = $("amountInput");
const categoryInput = $("categoryInput");
const dateInput     = $("dateInput");

const userEmailEl           = $("userEmail");
const logoutBtn             = $("logoutBtn");
const verificationBanner    = $("verificationBanner");
const resendVerificationBtn = $("resendVerificationBtn");
const refreshAuthBtn        = $("refreshAuthBtn");

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_COLORS = {
  Food:          "#f97316",
  Transport:     "#3b82f6",
  Shopping:      "#ec4899",
  Bills:         "#8b5cf6",
  Entertainment: "#f59e0b",
  Other:         "#6b7280",
};

// ─── Currency (uses theme.js) ─────────────────────────────────────────────────
// formatMoney() is defined in theme.js — use it everywhere instead of fmt
const fmt = v => (typeof formatMoney === "function") ? formatMoney(Number(v || 0)) : "₹" + Number(v || 0).toLocaleString("en-IN");

// ─── Theme toggle wiring ──────────────────────────────────────────────────────
const themeToggleBtn = document.getElementById("themeToggle");
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    if (typeof toggleTheme === "function") toggleTheme();
  });
}

// ─── Nav avatar loader ────────────────────────────────────────────────────────
function loadNavAvatar(user) {
  const el = document.getElementById("navAvatar");
  if (!el || !user) return;
  db.collection("users").doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    if (d.avatar) {
      el.innerHTML = `<img src="${d.avatar}" alt="avatar"/>`;
    } else {
      const initials = (d.name || user.email || "?").trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
      const colors   = ["#6366f1","#22d3ee","#a78bfa","#10b981","#f59e0b","#ec4899"];
      let hash = 0;
      for (let i = 0; i < user.uid.length; i++) hash = user.uid.charCodeAt(i) + ((hash << 5) - hash);
      el.style.background = colors[Math.abs(hash) % colors.length];
      el.textContent = initials;
    }
  });
}

function showBanner(type, msg) {
  if (!bannerMessage) return;
  bannerMessage.innerHTML = `<div class="${type === "ok" ? "msg-ok" : "msg-err"}">${msg}</div>`;
  setTimeout(() => (bannerMessage.innerHTML = ""), 3500);
}

// ─── Month options ────────────────────────────────────────────────────────────
function initMonthOptions() {
  if (!filterMonth) return;
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    const opt = document.createElement("option");
    opt.value = val; opt.textContent = lbl;
    filterMonth.appendChild(opt);
  }
  filterMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
initMonthOptions();

// ─── Budget ring ──────────────────────────────────────────────────────────────
function updateBudgetRing(pct) {
  if (!budgetRingEl) return;
  const circ   = 106.8; // 2π × 17
  const offset = circ - Math.min(pct / 100, 1) * circ;
  budgetRingEl.style.strokeDashoffset = offset;
}

// ─── Budget alert ─────────────────────────────────────────────────────────────
function checkBudgetAlert(totalSpent) {
  if (!budgetAlertBox) return;
  if (!budgets.limit) { budgetAlertBox.style.display = "none"; return; }
  const pct = (totalSpent / budgets.limit) * 100;
  if (pct >= 100) {
    budgetAlertBox.style.display = "flex";
    budgetAlertBox.className = "alert-banner alert-danger";
    budgetAlertMsg.textContent =
      `⛔ Budget exceeded! Spent ${fmt(totalSpent)} of ${fmt(budgets.limit)} limit.`;
  } else if (pct >= 80) {
    budgetAlertBox.style.display = "flex";
    budgetAlertBox.className = "alert-banner alert-warn";
    budgetAlertMsg.textContent =
      `⚠️ ${pct.toFixed(0)}% of budget used — ${fmt(totalSpent)} / ${fmt(budgets.limit)}.`;
  } else {
    budgetAlertBox.style.display = "none";
  }
}

// ─── Main render ──────────────────────────────────────────────────────────────
function reRenderAll() {
  const sel        = filterMonth ? filterMonth.value : "";
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const filtered = expenses.filter(e => {
    const ym = `${e.dateObj.getFullYear()}-${String(e.dateObj.getMonth() + 1).padStart(2, "0")}`;
    return ym === sel &&
      (!searchTerm || e.title.toLowerCase().includes(searchTerm) || e.category.toLowerCase().includes(searchTerm));
  });

  const totalSpent = filtered.reduce((s, e) => s + e.amount, 0);
  const remaining  = Math.max(budgets.limit - totalSpent, 0);
  const pct        = budgets.limit ? (totalSpent / budgets.limit) * 100 : 0;

  if (incomeValueEl)    incomeValueEl.textContent    = fmt(budgets.income);
  if (budgetValueEl)    budgetValueEl.textContent    = fmt(budgets.limit);
  if (spentValueEl)     spentValueEl.textContent     = fmt(totalSpent);
  if (remainingValueEl) {
    remainingValueEl.textContent = fmt(remaining);
    remainingValueEl.className   = "scard-val " + (budgets.limit && totalSpent > budgets.limit ? "neg" : "pos");
  }

  updateBudgetRing(pct);
  checkBudgetAlert(totalSpent);
  renderTable(filtered);
  renderChart(filtered);
}

// ─── Table ────────────────────────────────────────────────────────────────────
function renderTable(list) {
  if (!expenseTableBody) return;
  expenseTableBody.innerHTML = "";
  const sorted = [...list].sort((a, b) => b.dateObj - a.dateObj);

  if (expenseCountEl) expenseCountEl.textContent = `${sorted.length} entr${sorted.length === 1 ? "y" : "ies"}`;

  if (sorted.length === 0) {
    expenseTableBody.innerHTML =
      `<tr class="empty-row"><td colspan="5" style="text-align:center;padding:36px;color:var(--text-3)">No expenses found for this period.</td></tr>`;
    return;
  }

  sorted.forEach(e => {
    const c  = CAT_COLORS[e.category] || "#6b7280";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-title">${e.title}</td>
      <td><span class="cat-pill" style="--c:${c}"><span class="cdot"></span>${e.category}</span></td>
      <td class="td-amt">${fmt(e.amount)}</td>
      <td class="td-date">${e.dateObj.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td>
      <td>
        <div class="row-acts">
          <button class="rbtn rbtn-edit" onclick="openEditRow('${e.id}',this)">Edit</button>
          <button class="rbtn rbtn-del"  onclick="deleteExpense('${e.id}')">Delete</button>
        </div>
      </td>`;
    expenseTableBody.appendChild(tr);
  });
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function renderChart(list) {
  const map = {};
  list.forEach(e => (map[e.category] = (map[e.category] || 0) + e.amount));
  const labels = Object.keys(map);
  const data   = Object.values(map);
  const colors = labels.map(l => CAT_COLORS[l] || "#6b7280");

  if (expenseChart) expenseChart.destroy();
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  expenseChart = new Chart(canvas.getContext("2d"), {
    type: chartType,
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + "bb"),
        borderColor:     colors,
        borderWidth: 2,
        borderRadius: chartType === "bar" ? 8 : 0,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#94a3b8", font: { family: "'Outfit', sans-serif", size: 12 } },
        },
        tooltip: {
          backgroundColor: "rgba(10,16,28,0.95)",
          borderColor: "rgba(99,102,241,0.3)",
          borderWidth: 1,
          titleColor: "#f0f4ff",
          bodyColor: "#94a3b8",
          callbacks: { label: ctx => `  ${fmt(ctx.parsed.y ?? ctx.parsed)}` },
        },
      },
      scales: chartType === "bar" ? {
        x: { ticks: { color: "#475569" }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#475569", callback: v => "₹" + v }, grid: { color: "rgba(255,255,255,0.04)" } },
      } : {},
    },
  });
}

if (toggleChartBtn) {
  toggleChartBtn.addEventListener("click", () => {
    chartType = chartType === "doughnut" ? "bar" : "doughnut";
    toggleChartBtn.textContent = chartType === "doughnut" ? "Switch to Bar" : "Switch to Donut";
    reRenderAll();
  });
}

// ─── Inline Edit ──────────────────────────────────────────────────────────────
function openEditRow(id, btn) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;
  const row    = btn.closest("tr");
  const editTr = document.createElement("tr");
  const td     = document.createElement("td");
  td.colSpan   = 5;
  td.innerHTML = `
    <div class="edit-row">
      <input  id="ei-title" value="${expense.title}"   style="width:24%"/>
      <select id="ei-cat"   style="width:16%">
        ${["Food","Transport","Shopping","Bills","Entertainment","Other"]
          .map(c => `<option${c === expense.category ? " selected" : ""}>${c}</option>`).join("")}
      </select>
      <input  id="ei-amt"  type="number" value="${expense.amount}" style="width:15%"/>
      <input  id="ei-date" type="date"   value="${expense.date}"   style="width:18%"/>
      <button class="edit-save"   id="ei-save">Save</button>
      <button class="edit-cancel" id="ei-cancel">Cancel</button>
    </div>`;
  editTr.appendChild(td);
  row.replaceWith(editTr);
  $("ei-cancel").onclick = () => reRenderAll();
  $("ei-save").onclick   = async () => {
    const newTitle = $("ei-title").value.trim();
    const newCat   = $("ei-cat").value;
    const newAmt   = Number($("ei-amt").value);
    const newDate  = $("ei-date").value;
    if (!newTitle || !newAmt) { showBanner("err", "Title and amount are required."); return; }
    try {
      await db.collection("users").doc(currentUser.uid)
        .collection("expenses").doc(id)
        .update({ title: newTitle, category: newCat, amount: newAmt, date: newDate });
      showBanner("ok", "Expense updated ✓");
    } catch (err) { showBanner("err", err.message); }
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  try {
    await db.collection("users").doc(currentUser.uid).collection("expenses").doc(id).delete();
    showBanner("ok", "Expense deleted ✓");
  } catch (err) { showBanner("err", err.message); }
}

// ─── Add Expense ──────────────────────────────────────────────────────────────
if (expenseForm) {
  expenseForm.addEventListener("submit", async e => {
    e.preventDefault();
    const title    = titleInput.value.trim();
    const amount   = Number(amountInput.value);
    const category = categoryInput.value;
    const dateVal  = dateInput.value || new Date().toISOString().split("T")[0];
    if (!title || !amount) {
      if (formMsg) { formMsg.textContent = "Please enter title and amount."; formMsg.style.color = "var(--red)"; }
      return;
    }
    try {
      await db.collection("users").doc(currentUser.uid).collection("expenses").add({
        title, amount, category, date: dateVal,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      expenseForm.reset();
      if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
      if (formMsg) { formMsg.textContent = "Added ✓"; formMsg.style.color = "var(--green)"; setTimeout(() => (formMsg.textContent = ""), 1800); }
    } catch (err) {
      if (formMsg) { formMsg.textContent = err.message; formMsg.style.color = "var(--red)"; }
    }
  });
}

// ─── Save Budget ──────────────────────────────────────────────────────────────
if (budgetForm) {
  budgetForm.addEventListener("submit", async e => {
    e.preventDefault();
    budgets.income = Number(incomeInput.value || 0);
    budgets.limit  = Number(budgetInput.value || 0);
    try {
      await db.collection("users").doc(currentUser.uid)
        .set({ income: budgets.income, limit: budgets.limit }, { merge: true });
      showBanner("ok", "Budget saved ✓");
      reRenderAll();
    } catch (err) { showBanner("err", err.message); }
  });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    const sel      = filterMonth ? filterMonth.value : "";
    const filtered = expenses.filter(e => {
      const ym = `${e.dateObj.getFullYear()}-${String(e.dateObj.getMonth()+1).padStart(2,"0")}`;
      return ym === sel;
    });
    if (!filtered.length) { showBanner("err", "No data to export."); return; }
    const rows = [["Title","Category","Amount","Date"],
      ...filtered.map(r => [r.title, r.category, r.amount, r.date])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a   = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
      download: `expenses-${sel}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  });
}

// ─── Export PDF ───────────────────────────────────────────────────────────────
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", () => {
    const sel      = filterMonth ? filterMonth.value : "";
    const filtered = expenses.filter(e => {
      const ym = `${e.dateObj.getFullYear()}-${String(e.dateObj.getMonth()+1).padStart(2,"0")}`;
      return ym === sel;
    });
    if (!filtered.length) { showBanner("err", "No data to export."); return; }
    const totalSpent = filtered.reduce((s, e) => s + e.amount, 0);
    const rows = filtered.sort((a,b) => b.dateObj - a.dateObj)
      .map(e => `<tr><td>${e.title}</td><td>${e.category}</td><td>${fmt(e.amount)}</td><td>${e.date}</td></tr>`)
      .join("");
    const w = window.open("", "_blank");
    w.document.write(`<!doctype html><html><head><title>FinTrack — ${sel}</title>
    <style>body{font-family:sans-serif;padding:28px;color:#111}h1{font-size:1.3rem;margin-bottom:4px}
    p{color:#666;font-size:0.86rem;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:0.86rem}
    th{background:#1e293b;color:#fff;padding:8px 10px;text-align:left}
    td{padding:7px 10px;border-bottom:1px solid #e5e7eb}tr:nth-child(even)td{background:#f9fafb}
    .total{font-weight:700;margin-top:14px;font-size:0.95rem}</style></head>
    <body><h1>FinTrack — Expense Report</h1>
    <p>Month: ${sel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString("en-IN")}</p>
    <table><thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="total">Total Spent: ${fmt(totalSpent)}</p></body></html>`);
    w.document.close(); w.print();
  });
}

// ─── Search + filter ──────────────────────────────────────────────────────────
if (searchInput) searchInput.addEventListener("input", () => reRenderAll());
if (filterMonth) filterMonth.addEventListener("change", () => reRenderAll());

// ─── Auth ─────────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (!user) { location.href = "login.html"; return; }
  currentUser = user;
  loadNavAvatar(user);

  // Re-render when currency changes (user may switch in profile tab)
  window.addEventListener("storage", e => { if (e.key === "ft_currency") reRenderAll(); });
  if (userEmailEl) userEmailEl.textContent = user.email;
  if (verificationBanner) verificationBanner.style.display = user.emailVerified ? "none" : "flex";

  const doc = await db.collection("users").doc(user.uid).get();
  if (doc.exists) {
    const d = doc.data();
    budgets.income = d.income || 0;
    budgets.limit  = d.limit  || 0;
    if (incomeInput) incomeInput.value = budgets.income || "";
    if (budgetInput) budgetInput.value = budgets.limit  || "";
  }

  db.collection("users").doc(user.uid).collection("expenses")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      expenses = snapshot.docs.map(doc => {
        const d = doc.data();
        const rawDate = d.date ||
          (d.createdAt ? d.createdAt.toDate().toISOString().split("T")[0]
                       : new Date().toISOString().split("T")[0]);
        return { id: doc.id, title: d.title||"", amount: d.amount||0, category: d.category||"Other", date: rawDate, dateObj: new Date(rawDate) };
      });
      reRenderAll();
    }, err => showBanner("err", err.message));
});

if (resendVerificationBtn) {
  resendVerificationBtn.addEventListener("click", async () => {
    try { await auth.currentUser.sendEmailVerification(); showBanner("ok", "Verification email resent."); }
    catch (err) { showBanner("err", err.message); }
  });
}
if (refreshAuthBtn) {
  refreshAuthBtn.addEventListener("click", async () => {
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) { verificationBanner.style.display = "none"; showBanner("ok", "Email verified ✓"); }
      else showBanner("err", "Email still not verified.");
    } catch (err) { showBanner("err", err.message); }
  });
}

if (logoutBtn) logoutBtn.addEventListener("click", () => auth.signOut().then(() => (location.href = "login.html")));
if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];