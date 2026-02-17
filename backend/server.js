require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pool = require("./db");

const app = express();

/* ----------------------------
   Middleware
---------------------------- */

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});
app.use(limiter);

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.CORS_ORIGIN
    : true,
  methods: ["GET", "POST"],
}));

/* ----------------------------
   Config
---------------------------- */

const PORT = process.env.PORT || 4321;

const HELIUS_URL =
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

const COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS;

/* ----------------------------
   Health Check
---------------------------- */

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ----------------------------
   TEMP: Setup Database
---------------------------- */

app.get("/api/setup-db", async (req, res) => {
  try {
    console.log("Setting up database...");

    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        photo TEXT,
        points INT DEFAULT 0,
        wins INT DEFAULT 0,
        losses INT DEFAULT 0,
        blade_strike_level INT DEFAULT 1,
        energy_burst_level INT DEFAULT 0,
        meteor_rain_level INT DEFAULT 0,
        defense_level INT DEFAULT 0,
        healing_level INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_wallet TEXT REFERENCES players(wallet),
        result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database setup complete");
    res.json({ status: "Database initialized" });

  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ error: "Setup failed" });
  }
});

/* ----------------------------
   Login / Create Player
---------------------------- */

app.post("/api/login", async (req, res) => {
  console.log("Login request received");

  try {
    const { wallet, username, photo } = req.body;

    console.log("Wallet:", wallet);

    if (!wallet) {
      return res.status(400).json({ error: "Wallet required" });
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    const existing = await pool.query(
      "SELECT * FROM players WHERE wallet = $1",
      [wallet]
    );

    console.log("Existing query done");

    if (existing.rows.length === 0) {
      await pool.query(
        "INSERT INTO players (wallet, username, photo) VALUES ($1, $2, $3)",
        [wallet, username || "Warrior", photo || null]
      );
      console.log("Insert done");
    }

    const player = await pool.query(
      "SELECT * FROM players WHERE wallet = $1",
      [wallet]
    );

    console.log("Final select done");

    res.json(player.rows[0]);

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ----------------------------
   NFT Scan
---------------------------- */

app.post("/api/scan", async (req, res) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const heliusRes = await fetch(HELIUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "wb-nft-scan",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 100,
          displayOptions: {
            showCollectionMetadata: true,
            showFungible: false,
            showUnverifiedCollections: false
          }
        }
      })
    });

    const data = await heliusRes.json();

    if (!data.result?.items) {
      return res.json({ nfts: [] });
    }

    const filtered = data.result.items.filter(item => {
      const grouping = item.grouping || [];
      return grouping.some(g =>
        g.group_key === "collection" &&
        g.group_value === COLLECTION_ADDRESS
      );
    });

    res.json({ nfts: filtered });

  } catch (err) {
    console.error("NFT Scan Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ----------------------------
   Start Server
---------------------------- */

app.listen(PORT, () => {
  console.log(`WorldBinder API running on port ${PORT}`);
});
