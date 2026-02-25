# 🎫 Gate Pass Scanner

A web app for event check-in that reads registrations from Google Sheets and lets you scan/mark attendees at the gate.

![Stack](https://img.shields.io/badge/React-Node.js-blue) ![Sheets](https://img.shields.io/badge/Google%20Sheets-API-green)

---

## Features

- 🔍 **Search** by Registration Number
- ✅ **Mark as Checked In** with one click
- 🕐 **Timestamp** recorded for each scan
- 🚫 **Duplicate check-in prevention**
- 📊 **Live stats** — total, checked-in, remaining
- 📱 **Mobile-friendly** responsive design

---

## Setup

### 1. Google Sheets Preparation

Your Google Sheet should have these columns:

| A (Name) | B (Registration No.) | C (Status) | D (Scanned At) |
|-----------|---------------------|-------------|-----------------|
| John Doe  | REG001              |             |                 |
| Jane Smith| REG002              |             |                 |

> Columns C and D will be filled automatically by the app.

### 2. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Google Sheets API** for the project
4. Go to **Credentials** → **Create Credentials** → **Service Account**
5. Create the service account and download the JSON key file
6. From the JSON file, copy:
   - `client_email` → this is your **Service Account Email**
   - `private_key` → this is your **Private Key**
7. **Share your Google Sheet** with the service account email (give **Editor** access)

### 3. Configure Environment

```bash
cd server
# Copy the example env file
cp .env.example .env
```

Edit `server/.env` with your values:

```env
GOOGLE_SHEET_ID=your_spreadsheet_id_from_the_url
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_NAME=Sheet1
PORT=5000
```

> **Tip:** The Sheet ID is the long string in the Google Sheets URL:
> `https://docs.google.com/spreadsheets/d/`**THIS_IS_THE_ID**`/edit`

### 4. Install & Run

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Run both (from root folder)
cd ..
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run client
```

The app will open at **http://localhost:3000**

---

## Usage

1. Enter a registration number in the search box
2. The app fetches the person's details from your Google Sheet
3. Click **"Mark as Checked In"** to record the check-in
4. The Status column updates to "Scanned" and a timestamp is added
5. If someone tries to check in again, they'll see a duplicate warning

---

## Project Structure

```
gate-pass-app/
├── server/
│   ├── index.js          # Express backend + Google Sheets API
│   ├── .env              # Your secrets (not committed)
│   └── .env.example      # Template for env vars
├── client/
│   ├── src/
│   │   ├── App.js        # Main app component
│   │   ├── App.css       # All styles
│   │   └── components/
│   │       ├── SearchPanel.js   # Search input
│   │       ├── ResultCard.js    # Person details + check-in button
│   │       └── StatsBar.js      # Live statistics
│   └── public/
│       └── index.html
├── package.json          # Root scripts
└── README.md
```

---

## API Endpoints

| Method | Endpoint         | Description                      |
|--------|-----------------|----------------------------------|
| GET    | `/api/search`   | Search by `?regNo=XXX`          |
| POST   | `/api/checkin`  | Check in `{ regNo: "XXX" }`     |
| GET    | `/api/stats`    | Get total/scanned/remaining     |
