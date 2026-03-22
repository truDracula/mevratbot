const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const User = require("./models/User");
const registerApiRoutes = require("./routes/api");
const {
  getConnection,
  parseTreasuryKeypair,
  getTreasuryStatus,
  solanaWeb3,
} = require("./utils/solana");

dotenv.config({ path: path.join(__dirname, ".env") });

async function startServer() {
  const app = express();
  const frontendDir = path.join(__dirname, "..", "frontend");

  app.use(express.json());
  app.use(express.static(frontendDir));

  await connectDB(process.env.MONGO_URI);

  const connection = getConnection(process.env.SOLANA_RPC_URL);
  const treasuryKeypair = parseTreasuryKeypair(process.env.TREASURY_PRIVATE_KEY);

  registerApiRoutes(app, {
    User,
    connection,
    treasuryKeypair,
    solanaWeb3,
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      treasury: getTreasuryStatus(treasuryKeypair),
    });
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
