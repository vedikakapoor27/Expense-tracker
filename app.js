// ─── State ────────────────────────────────────────────────────────────────────
let currentUser = null;
let expenses    = [];
let budgets     = { income: 0, limit: 0 };
let expenseChart = null;
let chartType   = "doughnut"; // toggled by user

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const incomeValueEl    = document.getElementById("incomeValue");
const budgetValueEl    = document.getElementById("budgetValue");
const spentValueEl     = document.getElementById("spentValue");
const remainingValueEl = document.getElementById("remainingValue");
const expenseTableBody = document.getElementById("expenseTableBody");
const formMsg          = document.getElementById("formMsg");
const bannerMessage    = document.getElementById("bannerMessage");
const filterMonth      = document.getElementById("filterMonth");
const searchInput      = document.getElementById("searchInput");
const exportCsvBtn     = document.getElementById("exportCsv");
const exportPdfBtn     = document.getElementById("exportPdf");
const toggleChartBtn   = document.getElementById("toggleChart");
const budgetAlertBox   = document.getElementById("budgetAlertBox");
const budgetAlertMsg   = document.getElementById("budgetAlertMsg");

const budgetForm   = document.getElementById("budgetForm");
const incomeInput  = document.getElementById("incomeInput");
const budgetInput  = document.getElementById("budgetInput");
const expenseForm  = document.getElementById("expenseForm");
const titleInput   = document.getElementById("titleInput");
const amountInput  = document.getElementById("amountInput");
const categoryInput= document.getElementById("categoryInput");
const dateInput    = document.getElementById("dateInput");

const userEmailEl         = document.getElementById("userEmail");
const logoutBtn           = document.getElementById("logoutBtn");
const verificationBanner  = document.getElementById("verificationBanner");
const resendVerificationBtn = document.getElementById("resendVerificationBtn");
const refreshAuthBtn      = document.getElementById("refreshAuthBtn");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(v) {
  return "₹" + Number(v || 0).toLocaleString("en-IN");
}

function showBanner(type, msg) {
  bannerMessage.innerHTML = `<div class="${type === "ok" ? "msg-success" : "msg-error"}">${msg}</div>`;
  setTimeout(() => (bannerMessage.innerHTML = ""), 3500);
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Month filter options ─────────────────────────────────────────────────────
function initMonthOptions() {
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = lbl;
    filterMonth.appendChild(opt);
  }
  filterMonth.value = currentMonthValue();
}
initMonthOptions();

// ─── Budget alert ─────────────────────────────────────────────────────────────
function checkBudgetAlert(totalSpent) {
  if (!budgets.limit) return;
  const pct = (totalSpent / budgets.limit) * 100;

  if (pct >= 100) {
    budgetAlertBox.style.display = "flex";
    budgetAlertBox.className = "budget-alert alert-danger";
    budgetAlertMsg.textContent =
      `⛔ Budget exceeded! You've spent ${formatCurrency(totalSpent)} of your ${formatCurrency(budgets.limit)} limit.`;
  } else if (pct >= 80) {
    budgetAlertBox.style.display = "flex";
    budgetAlertBox.className = "budget-alert alert-warning";
    budgetAlertMsg.textContent =
      `⚠️ Heads up! You've used ${pct.toFixed(0)}% of your budget (${formatCurrency(totalSpent)} / ${formatCurrency(budgets.limit)}).`;
  } else {
    budgetAlertBox.style.display = "none";
  }
}

// ─── Main render ──────────────────────────────────────────────────────────────
function reRenderAll() {
  const selectedMonth = filterMonth.value;
  const searchTerm    = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Filter by month + search
  let filtered = expenses.filter(e => {
    const ym = `${e.dateObj.getFullYear()}-${String(e.dateObj.getMonth() + 1).padStart(2, "0")}`;
    const matchMonth  = ym === selectedMonth;
    const matchSearch = !searchTerm ||
      e.title.toLowerCase().includes(searchTerm) ||
      e.category.toLowerCase().includes(searchTerm);
    return matchMonth && matchSearch;
  });

  const totalSpent = filtered.reduce((s, e) => s + e.amount, 0);
  const remaining  = Math.max(budgets.limit - totalSpent, 0);

  // Summary cards
  incomeValueEl.textContent    = formatCurrency(budgets.income);
  budgetValueEl.textContent    = formatCurrency(budgets.limit);
  spentValueEl.textContent     = formatCurrency(totalSpent);
  remainingValueEl.textContent = formatCurrency(remaining);

  // Color remaining card
  const remCard = remainingValueEl.closest(".summary-card");
  if (remCard) {
    remainingValueEl.className = "summary-value" +
      (budgets.limit && totalSpent > budgets.limit ? " negative" : " positive");
  }

  checkBudgetAlert(totalSpent);
  renderTable(filtered);
  renderChart(filtered);
}

// ─── Table ────────────────────────────────────────────────────────────────────
function renderTable(list) {
  expenseTableBody.innerHTML = "";
  const sorted = [...list].sort((a, b) => b.dateObj - a.dateObj);

  if (sorted.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.cssText = "color:var(--text-soft);text-align:center;padding:1.2rem";
    td.textContent = "No expenses found.";
    tr.appendChild(td);
    expenseTableBody.appendChild(tr);
    return;
  }

  sorted.forEach(e => {
    const tr = document.createElement("tr");

    // Category badge colour
    const catColor = CAT_COLORS[e.category] || "#6b7280";

    tr.innerHTML = `
      <td>${e.title}</td>
      <td><span class="cat-badge" style="--c:${catColor}">${e.category}</span></td>
      <td style="font-weight:600">${formatCurrency(e.amount)}</td>
      <td>${e.dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
      <td>
        <button class="table-btn table-btn-edit"   onclick="openEditRow('${e.id}', this)">Edit</button>
        <button class="table-btn table-btn-delete" onclick="deleteExpense('${e.id}')">Delete</button>
      </td>`;
    expenseTableBody.appendChild(tr);
  });
}

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_COLORS = {
  Food:          "#f97316",
  Transport:     "#3b82f6",
  Shopping:      "#ec4899",
  Bills:         "#8b5cf6",
  Entertainment: "#f59e0b",
  Other:         "#6b7280",
};

// ─── Chart ────────────────────────────────────────────────────────────────────
function renderChart(list) {
  const map = {};
  list.forEach(e => (map[e.category] = (map[e.category] || 0) + e.amount));
  const labels = Object.keys(map);
  const data   = Object.values(map);
  const colors = labels.map(l => CAT_COLORS[l] || "#6b7280");

  if (expenseChart) expenseChart.destroy();

  const ctx = document.getElementById("expenseChart").getContext("2d");
  expenseChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + "cc"),
        borderColor:     colors,
        borderWidth: 2,
        borderRadius: chartType === "bar" ? 8 : 0,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#e5e7eb", font: { family: "Poppins", size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatCurrency(ctx.parsed.y ?? ctx.parsed)}`,
          },
        },
      },
      scales: chartType === "bar" ? {
        x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#9ca3af", callback: v => "₹" + v }, grid: { color: "rgba(255,255,255,0.05)" } },
      } : {},
    },
  });
}

// Toggle chart type
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

  const row = btn.closest("tr");
  const editRow = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 5;

  td.innerHTML = `
    <div class="edit-row">
      <input  id="ei-title" value="${expense.title}"    style="width:25%" />
      <select id="ei-cat"   style="width:18%">
        ${["Food","Transport","Shopping","Bills","Entertainment","Other"]
          .map(c => `<option${c===expense.category?" selected":""}>${c}</option>`).join("")}
      </select>
      <input  id="ei-amt"  type="number" value="${expense.amount}" style="width:17%" />
      <input  id="ei-date" type="date"   value="${expense.date}"   style="width:19%" />
      <button class="action-btn edit-btn"   id="ei-save">Save</button>
      <button class="action-btn"            id="ei-cancel" style="background:rgba(255,255,255,0.06);color:#fff">Cancel</button>
    </div>`;

  editRow.appendChild(td);
  row.replaceWith(editRow);

  document.getElementById("ei-cancel").onclick = () => reRenderAll();
  document.getElementById("ei-save").onclick   = async () => {
    const newTitle = document.getElementById("ei-title").value.trim();
    const newCat   = document.getElementById("ei-cat").value;
    const newAmt   = Number(document.getElementById("ei-amt").value);
    const newDate  = document.getElementById("ei-date").value;
    if (!newTitle || !newAmt) { showBanner("err", "Title and amount required."); return; }
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
expenseForm.addEventListener("submit", async e => {
  e.preventDefault();
  const title    = titleInput.value.trim();
  const amount   = Number(amountInput.value);
  const category = categoryInput.value;
  const dateVal  = dateInput.value || new Date().toISOString().split("T")[0];

  if (!title || !amount) {
    formMsg.textContent  = "Please enter title and amount.";
    formMsg.style.color  = "var(--danger)";
    return;
  }
  try {
    await db.collection("users").doc(currentUser.uid).collection("expenses").add({
      title, amount, category, date: dateVal,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    expenseForm.reset();
    dateInput.value     = new Date().toISOString().split("T")[0];
    formMsg.textContent = "Added ✓";
    formMsg.style.color = "var(--success)";
    setTimeout(() => (formMsg.textContent = ""), 1800);
  } catch (err) {
    formMsg.textContent = err.message;
    formMsg.style.color = "var(--danger)";
  }
});

// ─── Save Budget ──────────────────────────────────────────────────────────────
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

// ─── Export CSV ───────────────────────────────────────────────────────────────
exportCsvBtn.addEventListener("click", () => {
  const selectedMonth = filterMonth.value;
  const filtered = expenses.filter(e => {
    const ym = `${e.dateObj.getFullYear()}-${String(e.dateObj.getMonth()+1).padStart(2,"0")}`;
    return ym === selectedMonth;
  });
  if (!filtered.length) { showBanner("err", "No data to export."); return; }

  const rows = [["Title","Category","Amount","Date"],
    ...filtered.map(r => [r.title, r.category, r.amount, r.date])];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `expenses-${filterMonth.value}.csv`; a.click();
  URL.revokeObjectURL(url);
});

// ─── Export PDF ───────────────────────────────────────────────────────────────
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", () => {
    const selectedMonth = filterMonth.value;
    const filtered = expenses.filter(e => {
      const ym = `${e.dateObj.getFullYear()}-${String(e.dateObj.getMonth()+1).padStart(2,"0")}`;
      return ym === selectedMonth;
    });
    if (!filtered.length) { showBanner("err", "No data to export."); return; }

    const totalSpent = filtered.reduce((s,e) => s + e.amount, 0);
    const rows = filtered
      .sort((a,b) => b.dateObj - a.dateObj)
      .map(e => `<tr><td>${e.title}</td><td>${e.category}</td><td>${formatCurrency(e.amount)}</td><td>${e.date}</td></tr>`)
      .join("");

    const html = `
      <html><head><title>FinTrack — ${selectedMonth}</title>
      <style>
        body { font-family: sans-serif; padding: 30px; color: #111; }
        h1   { font-size: 1.4rem; margin-bottom: 4px; }
        p    { color: #555; margin-bottom: 20px; font-size: 0.9rem; }
        table { width:100%; border-collapse:collapse; font-size:0.88rem; }
        th   { background:#1e293b; color:#fff; padding:8px 10px; text-align:left; }
        td   { padding:7px 10px; border-bottom:1px solid #e5e7eb; }
        tr:nth-child(even) td { background:#f9fafb; }
        .total { font-weight:700; font-size:1rem; margin-top:16px; }
      </style></head>
      <body>
        <h1>FinTrack — Expense Report</h1>
        <p>Month: ${selectedMonth} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="total">Total Spent: ${formatCurrency(totalSpent)}</p>
      </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────
if (searchInput) {
  searchInput.addEventListener("input", () => reRenderAll());
}
filterMonth.addEventListener("change", () => reRenderAll());

// ─── Auth ─────────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (!user) { location.href = "login.html"; return; }
  currentUser     = user;
  userEmailEl.textContent = user.email;

  verificationBanner.style.display = user.emailVerified ? "none" : "flex";

  // Load budgets
  const userDoc = await db.collection("users").doc(user.uid).get();
  if (userDoc.exists) {
    const d = userDoc.data();
    budgets.income     = d.income || 0;
    budgets.limit      = d.limit  || 0;
    incomeInput.value  = budgets.income || "";
    budgetInput.value  = budgets.limit  || "";
  }

  // Realtime expenses
  db.collection("users").doc(user.uid).collection("expenses")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      expenses = snapshot.docs.map(doc => {
        const d = doc.data();
        const rawDate = d.date || (d.createdAt ? d.createdAt.toDate().toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
        return {
          id:      doc.id,
          title:   d.title    || "",
          amount:  d.amount   || 0,
          category: d.category || "Other",
          date:    rawDate,
          dateObj: new Date(rawDate),
        };
      });
      reRenderAll();
    }, err => showBanner("err", err.message));
});

resendVerificationBtn.addEventListener("click", async () => {
  try {
    await auth.currentUser.sendEmailVerification();
    showBanner("ok", "Verification email resent. Check your inbox.");
  } catch (err) { showBanner("err", err.message); }
});

refreshAuthBtn.addEventListener("click", async () => {
  try {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      verificationBanner.style.display = "none";
      showBanner("ok", "Email verified — full access granted ✓");
    } else {
      showBanner("err", "Email still not verified.");
    }
  } catch (err) { showBanner("err", err.message); }
});

logoutBtn.addEventListener("click", () => auth.signOut().then(() => (location.href = "login.html")));

// Default date
dateInput.value = new Date().toISOString().split("T")[0];