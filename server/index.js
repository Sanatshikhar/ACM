const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ─── Google Sheets Auth ────────────────────────────────────────
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";

// ─── Helper: Read all rows ────────────────────────────────────
async function getAllRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:D`, // Name, Registration No., Status, Scanned At
  });
  return res.data.values || [];
}

// ─── Helper: Normalize reg number for comparison ─────────────
function normalizeRegNo(val) {
  return val.toString().trim().toLowerCase().replace(/[\s\-_]/g, "");
}

// ─── Helper: Find row index by Registration No ───────────────
async function findRowByRegNo(regNo) {
  const rows = await getAllRows();
  const searchVal = normalizeRegNo(regNo);
  // Row 0 is the header
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] && normalizeRegNo(rows[i][1]) === searchVal) {
      return { rowIndex: i, rowData: rows[i], headers: rows[0] };
    }
    // Also check if the barcode value contains the reg no or vice versa
    if (rows[i][1] && (normalizeRegNo(rows[i][1]).includes(searchVal) || searchVal.includes(normalizeRegNo(rows[i][1])))) {
      return { rowIndex: i, rowData: rows[i], headers: rows[0] };
    }
  }
  return null;
}

// ─── GET /api/search?regNo=XXX ────────────────────────────────
app.get("/api/search", async (req, res) => {
  try {
    const { regNo } = req.query;
    if (!regNo) {
      return res.status(400).json({ error: "Registration number is required" });
    }

    const result = await findRowByRegNo(regNo);
    if (!result) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const { rowData } = result;
    return res.json({
      name: rowData[0] || "",
      registrationNo: rowData[1] || "",
      status: rowData[2] || "Not Scanned",
      scannedAt: rowData[3] || null,
    });
  } catch (err) {
    console.error("Search error:", err.message, err.stack);
    return res.status(500).json({ error: "Failed to search: " + err.message });
  }
});

// ─── POST /api/checkin ────────────────────────────────────────
app.post("/api/checkin", async (req, res) => {
  try {
    const { regNo } = req.body;
    if (!regNo) {
      return res.status(400).json({ error: "Registration number is required" });
    }

    const result = await findRowByRegNo(regNo);
    if (!result) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const { rowIndex, rowData } = result;

    // Prevent duplicate check-ins
    if (rowData[2] && rowData[2].toLowerCase() === "scanned") {
      return res.status(409).json({
        error: "Already checked in",
        name: rowData[0],
        registrationNo: rowData[1],
        scannedAt: rowData[3] || "Unknown",
      });
    }

    // Update Status (col C) and Scanned At (col D)
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const sheetRow = rowIndex + 1; // Sheets is 1-indexed

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!C${sheetRow}:D${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["Scanned", now]],
      },
    });

    return res.json({
      success: true,
      message: "Check-in successful!",
      name: rowData[0],
      registrationNo: rowData[1],
      status: "Scanned",
      scannedAt: now,
    });
  } catch (err) {
    console.error("Check-in error:", err.message, err.stack);
    return res.status(500).json({ error: "Failed to check in: " + err.message });
  }
});

// ─── GET /api/stats ───────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const rows = await getAllRows();
    const total = Math.max(0, rows.length - 1); // exclude header
    let scanned = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][2] && rows[i][2].toLowerCase() === "scanned") {
        scanned++;
      }
    }
    return res.json({ total, scanned, remaining: total - scanned });
  } catch (err) {
    console.error("Stats error:", err.message, err.stack);
    return res.status(500).json({ error: "Failed to get stats: " + err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Gate Pass Server running on http://localhost:${PORT}`);
});
