require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

/* ----------------------------
   Middleware
---------------------------- */

app.use(express.json());

/* Rate Limiting (Protect Helius quota) */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* CORS Configuration */
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.CORS_ORIGIN
    : true,
  methods: ["GET", "POST"],
}));

/* ----------------------------
   Config
---------------------------- */

const PORT = process.env.PORT || 10000;

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
   NFT Scan API
---------------------------- */

app.post("/api/scan", async (req, res) => {
  try {
    const { wallet } = req.body;

    /* Validate wallet presence */
    if (!wallet) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    /* Validate Solana address format */
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
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

    /* Filter by verified collection */
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
