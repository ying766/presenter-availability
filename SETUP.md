# Setup Guide — Presenter Availability System

## What you have
- `index.html` — Presenter-facing page
- `admin.html` — Admin dashboard (calendar + presenter + brand management)
- `data.js` — All 97 presenters + 22 brands pre-loaded
- `config.js` — Your settings (URL + password)
- `Code.gs` — Google Apps Script backend
- `vercel.json` — Vercel routing

---

## Step 1 — Try it first (Demo mode)

Open `index.html` in your browser. It works immediately using your browser's
local storage — great for testing. Data won't persist across devices in this mode.

---

## Step 2 — Set up Google Sheets (for real data)

### 2a. Create the Spreadsheet
1. Go to sheets.google.com → New blank spreadsheet
2. Name it "Presenter Availability"

### 2b. Add the Apps Script
1. In your spreadsheet: Extensions → Apps Script
2. Delete all existing code in the editor
3. Copy the entire contents of `Code.gs` and paste it
4. Click Save (Ctrl+S)

### 2c. Deploy as Web App
1. Click "Deploy" → "New deployment"
2. Click the gear icon next to "Type" → select "Web app"
3. Set:
   - Description: Presenter Availability API
   - Execute as: **Me**
   - Who has access: **Anyone** (this is required so presenters can submit)
4. Click Deploy → Authorize when prompted
5. Copy the Web App URL (looks like: https://script.google.com/macros/s/ABC.../exec)

### 2d. Seed your data
1. In the Apps Script editor, find the function dropdown (top of page)
2. Select "initData" — but first you need to call it with data.
3. Instead, open your browser console on any page with data.js loaded and run:
   ```
   fetch('YOUR_WEB_APP_URL?action=initData', {
     method: 'POST',
     body: JSON.stringify({ action: 'initData', presenters: INITIAL_PRESENTERS })
   })
   ```
   Or just let presenters log in — the app will use localStorage until you connect Sheets.

### 2e. Update config.js
```js
window.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
window.ADMIN_PASSWORD = 'choose-a-strong-password';
```

---

## Step 3 — Deploy to Vercel

1. Go to vercel.com → sign up free
2. Click "Add New Project"
3. Choose "Browse" or drag this entire folder
4. Click Deploy — done! You'll get a URL like `yourapp.vercel.app`

Share with presenters: `yourapp.vercel.app`
Admin dashboard: `yourapp.vercel.app/admin`

---

## Presenters missing PINs (7 people)
These presenters had no phone number in your data — you'll need to set their PINs manually in the Admin → Presenters tab:

- Louis Wilson
- Robert (no last name)
- Carla (no last name)
- Deborah Brown
- Emily Cochrane
- Gabrielle Richens
- Katherine Gibbons

---

## Notes
- "Nala's Baby" and "Nalas Baby" have been merged into "Nala's Baby"
- Total: 97 presenters, 22 brands
- Presenters can update their availability any time — it overwrites previous entries
