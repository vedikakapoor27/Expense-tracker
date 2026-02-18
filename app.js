let currentUser = null;
let expenses = [];

// DOM
const incomeValueEl = document.getElementById("incomeValue");
const budgetValueEl = document.getElementById("budgetValue");
const spentValueEl = document.getElementById("spentValue");
const remainingValueEl = document.getElementById("remainingValue");
const expenseForm = document.getElementById("expenseForm");
const expenseTableBody = document.getElementById("expenseTableBody");

// UTIL
function formatCurrency(v) {
  return "₹" + Number(v).toLocaleString("en-IN");
}

// 🔐 GET LOGGED IN USER
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  currentUser = user;
  await loadExpenses();
  render();
});

// 📥 LOAD EXPENSES FROM FIRESTORE
async function loadExpenses() {
  expenses = [];
  const snap = await db
    .collection("users")
    .doc(currentUser.uid)
    .collection("expenses")
    .orderBy("createdAt", "desc")
    .get();

  snap.forEach(doc => {
    expenses.push({ id: doc.id, ...doc.data() });
  });
}

// ➕ ADD EXPENSE
expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!title || !amount || !date) return;

  await db
    .collection("users")
    .doc(currentUser.uid)
    .collection("expenses")
    .add({
      title,
      amount,
      category,
      date,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  expenseForm.reset();
  await loadExpenses();
  render();
});

// 🧮 RENDER UI
function render() {
  expenseTableBody.innerHTML = "";
  let total = 0;

  expenses.forEach(e => {
    total += e.amount;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.title}</td>
      <td>${e.category}</td>
      <td>${formatCurrency(e.amount)}</td>
      <td>${e.date}</td>
      <td>
        <button onclick="editExpense('${e.id}')">Edit</button>
        <button onclick="deleteExpense('${e.id}')">Delete</button>
      </td>
    `;
    expenseTableBody.appendChild(tr);
  });

  spentValueEl.textContent = formatCurrency(total);
}
// 🗑 DELETE
async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  await db
    .collection("users")
    .doc(currentUser.uid)
    .collection("expenses")
    .doc(id)
    .delete();

  await loadExpenses();
  render();
}

// ✏️ EDIT
async function editExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  const newTitle = prompt("Edit title:", exp.title);
  const newAmount = Number(prompt("Edit amount:", exp.amount));
  const newCategory = prompt("Edit category:", exp.category);
  const newDate = prompt("Edit date (YYYY-MM-DD):", exp.date);

  if (!newTitle || !newAmount || !newDate) return;

  await db
    .collection("users")
    .doc(currentUser.uid)
    .collection("expenses")
    .doc(id)
    .update({
      title: newTitle,
      amount: newAmount,
      category: newCategory,
      date: newDate
    });

  await loadExpenses();
  render();
}
