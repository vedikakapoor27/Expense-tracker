# 💰 FinTrack — Personal Finance Tracker

> A full-featured, Firebase-powered Progressive Web App for tracking expenses, managing budgets, setting savings goals, and never missing a bill payment.

![FinTrack Dashboard](screenshots/dashboard.png)

---

## ✨ Features

### 📊 Dashboard
- Real-time expense tracking with Firebase Firestore
- Monthly income & budget setup with animated progress ring
- Live search and month filter
- Export to **CSV** and **PDF**
- Inline expense editing (no page reloads)
- Category-coloured pills with spending breakdown

### 📈 Analytics
- **Monthly trend line chart** — 12-month spending overview
- **Category donut chart** — spending breakdown by category
- **Year-over-year bar chart** — compare any two years side by side
- **Month-by-month table** — with % change indicators (🟢 down / 🔴 up)
- **Category budget limits** — set per-category caps with live progress bars
- Smart insights: biggest expense, most active month, YoY summary

### 🎯 Savings Goals
- Create goals with custom emoji icons & accent colours
- **Animated SVG progress rings** that fill smoothly
- Deposit money incrementally — ring updates instantly
- Deadline tracking with days-left countdown & overdue alerts
- 🎉 Completion celebration on reaching target
- Summary stats: total saved vs total target

### 🔔 Bill Reminders
- Add bills with due dates, categories, amounts, and notes
- **Recurrence support** — one-time, weekly, monthly, yearly
- Smart status pills: Overdue / Due Today / In Xd / Paid
- **Auto-schedule next occurrence** when marking a recurring bill as paid
- **Next 7 Days** timeline sidebar
- **Browser push notifications** for bills due today, tomorrow, and in 3 days
- Filter by All / Overdue / Upcoming / Paid

### 👤 Profile
- Upload a custom avatar (stored in Firestore)
- Auto-generated coloured initials if no photo
- Edit display name, phone, bio
- **Multi-currency support** — INR, USD, EUR, GBP, JPY, AED
- **Dark / Light mode** toggle, persisted across sessions
- Change password
- Danger zone: delete all expenses, sign out

### 📱 Progressive Web App (PWA)
- Installable on Android & iOS via browser
- Offline support via Service Worker
- App shortcuts: Add Expense, Analytics, Goals
- Home screen icon & splash screen
- Deployable to Play Store via PWABuilder

---

## 🏗️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Vanilla HTML, CSS, JavaScript       |
| Fonts      | Outfit + JetBrains Mono (Google)    |
| Charts     | Chart.js                            |
| Backend    | Firebase Firestore (NoSQL database) |
| Auth       | Firebase Authentication             |
| Hosting    | Firebase Hosting                    |
| PWA        | Web App Manifest + Service Worker   |

---

## 📁 Project Structure

```
fintrack/
├── index.html          # Dashboard (entry point)
├── dashboard.html      # Dashboard (duplicate entry)
├── analytics.html      # Analytics & trends page
├── goals.html          # Savings goals tracker
├── reminders.html      # Bill reminders
├── profile.html        # User profile & settings
├── login.html          # Auth (sign in / sign up / Google)
├── home.html           # Landing page
├── offline.html        # Shown when offline
├── app.js              # Dashboard logic
├── theme.js            # Shared theme + currency utility
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── firebase.json       # Firebase Hosting config
├── .firebaserc         # Firebase project binding
└── icons/              # App icons (72 → 512px)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## 🚀 Getting Started Locally

### Prerequisites
- [VS Code](https://code.visualstudio.com/) with the **Live Server** extension
- A Firebase project (free Spark plan is enough)

### 1. Clone / Download
```bash
git clone https://github.com/YOUR_USERNAME/fintrack.git
cd fintrack
```

### 2. Set up Firebase
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Authentication** → Email/Password + Google
4. Enable **Firestore Database** → Start in production mode
5. Copy your Firebase config from **Project Settings → Your Apps**
6. Replace the `firebase.initializeApp({...})` config in every HTML file

### 3. Add Firebase Auth Domain
In Firebase Console → **Authentication → Settings → Authorized domains**, add:
```
localhost
127.0.0.1
```

### 4. Set Firestore Security Rules
In Firebase Console → **Firestore → Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Run locally
Open the project folder in VS Code → click **Go Live** (bottom-right status bar)

---

## ☁️ Deploy to Firebase Hosting

### Step 1 — Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2 — Login
```bash
firebase login
```

### Step 3 — Init (if not already done)
```bash
firebase init hosting
# Select your project
# Public directory: .  (just a dot — current folder)
# Single-page app: No
# Overwrite index.html: No
```

### Step 4 — Deploy
```bash
firebase deploy
```

Your app will be live at:
```
https://expense---tracker-9957e.web.app
```

---

## 📱 Publish to Play Store (via PWABuilder)

1. **Deploy to Firebase Hosting** (step above)
2. Go to [pwabuilder.com](https://www.pwabuilder.com)
3. Enter your Firebase Hosting URL
4. PWABuilder will analyse your PWA score
5. Click **Package for Stores → Android**
6. Download the `.aab` (Android App Bundle)
7. Go to [play.google.com/console](https://play.google.com/console)
8. Create a new app → Upload the `.aab`
9. Fill in store listing details, screenshots, and submit for review

> **Note:** You need a Google Play Developer account ($25 one-time fee).

### Generate App Icons
Use [realfavicongenerator.net](https://realfavicongenerator.net) or [maskable.app](https://maskable.app) to generate all icon sizes from a single 512×512 source image. Place them in the `/icons/` folder.

---

## 🗂️ Firestore Data Structure

```
users/
  {userId}/
    income:     number
    limit:      number
    name:       string
    phone:      string
    bio:        string
    avatar:     string (base64)
    catBudgets: { Food: number, Transport: number, ... }

    expenses/
      {expenseId}/
        title:     string
        amount:    number
        category:  string
        date:      string (YYYY-MM-DD)
        createdAt: timestamp

    goals/
      {goalId}/
        name:      string
        target:    number
        saved:     number
        deadline:  string (YYYY-MM-DD)
        emoji:     string
        color:     string (hex)
        completed: boolean
        createdAt: timestamp

    reminders/
      {reminderId}/
        name:       string
        amount:     number
        dueDate:    string (YYYY-MM-DD)
        category:   string
        recurrence: string (once|weekly|monthly|yearly)
        note:       string
        paid:       boolean
        createdAt:  timestamp
```

---

## 🛡️ Security Notes

- All Firestore reads/writes are scoped to the authenticated user's UID
- Email verification is enforced before dashboard access
- Passwords are handled entirely by Firebase Auth (never stored in Firestore)
- Avatar images are stored as base64 strings in Firestore (max ~1.5MB)
- Firebase config keys in HTML are safe to expose — they are restricted by Firebase Security Rules and Authorized Domains

---

## 📸 Screenshots

| Dashboard | Analytics | Goals | Reminders |
|-----------|-----------|-------|-----------|
| ![](screenshots/dashboard.png) | ![](screenshots/analytics.png) | ![](screenshots/goals.png) | ![](screenshots/reminders.png) |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Acknowledgements

- [Firebase](https://firebase.google.com) — backend & auth
- [Chart.js](https://www.chartjs.org) — beautiful charts
- [Google Fonts](https://fonts.google.com) — Outfit & JetBrains Mono
- [PWABuilder](https://www.pwabuilder.com) — Play Store packaging

---

*Built with ❤️ using vanilla HTML, CSS, JS + Firebase*