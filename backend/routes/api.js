const WITHDRAW_FEE_RATE = 0.01;
const LAMPORTS_PER_SOL = 1_000_000_000;

function registerApiRoutes(app, deps = {}) {
  if (!app) {
    throw new Error("App instance is required.");
  }

  const { User, connection, treasuryKeypair, solanaWeb3 } = deps;

  app.post("/api/confirm-deposit", async (req, res) => {
    try {
      if (!User || !connection || !treasuryKeypair || !solanaWeb3) {
        return res.status(500).json({ error: "Server dependencies not configured" });
      }

      const { wallet, amount, sig } = req.body ?? {};
      if (!wallet || !amount || !sig) {
        return res
          .status(400)
          .json({ error: "wallet, amount, and sig are required" });
      }

      const tx = await connection.getParsedTransaction(sig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return res.status(400).json({ error: "Transaction not confirmed yet" });
      }

      const expectedLamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
      const matches = tx.transaction.message.instructions.some(
        (instruction) =>
          instruction.program === "system" &&
          instruction.parsed?.type === "transfer" &&
          instruction.parsed?.info?.source === wallet &&
          instruction.parsed?.info?.destination ===
            treasuryKeypair.publicKey.toBase58() &&
          Number(instruction.parsed?.info?.lamports) === expectedLamports
      );

      if (!matches) {
        return res.status(400).json({ error: "Deposit transaction mismatch" });
      }

      const existingUser = await User.findOne({
        walletAddress: wallet,
        "deposits.signature": sig,
      });
      if (existingUser) {
        return res.json({
          success: true,
          duplicate: true,
          balance: existingUser.totalBalance,
        });
      }

      const user = await User.findOneAndUpdate(
        { walletAddress: wallet },
        {
          $inc: { totalBalance: Number(amount) },
          $push: {
            deposits: {
              signature: sig,
              amount: Number(amount),
            },
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.json({
        success: true,
        balance: user.totalBalance,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to confirm deposit",
        details: error.message,
      });
    }
  });

  app.get("/api/balance/:walletAddress", async (req, res) => {
    try {
      if (!User) {
        return res.status(500).json({ error: "Server dependencies not configured" });
      }

      const user = await User.findOne({
        walletAddress: req.params.walletAddress,
      });

      return res.json({
        walletAddress: req.params.walletAddress,
        totalBalance: user?.totalBalance ?? 0,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to load balance",
        details: error.message,
      });
    }
  });

  app.post("/api/withdraw", async (req, res) => {
    try {
      if (!User || !connection || !treasuryKeypair || !solanaWeb3) {
        return res.status(500).json({ error: "Server dependencies not configured" });
      }

      const { walletAddress } = req.body ?? {};
      if (!walletAddress) {
        return res.status(400).json({ error: "walletAddress is required" });
      }

      const user = await User.findOne({ walletAddress });
      if (!user || Number(user.totalBalance) <= 0) {
        return res.status(400).json({ error: "No balance" });
      }

      const totalBalance = Number(user.totalBalance);
      const feeAmount = totalBalance * WITHDRAW_FEE_RATE;
      const payoutAmount = totalBalance - feeAmount;
      const lamports = Math.floor(payoutAmount * LAMPORTS_PER_SOL);

      const tx = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: treasuryKeypair.publicKey,
          toPubkey: new solanaWeb3.PublicKey(walletAddress),
          lamports,
        })
      );

      const signature = await solanaWeb3.sendAndConfirmTransaction(
        connection,
        tx,
        [treasuryKeypair]
      );

      user.totalBalance = 0;
      await user.save();

      return res.json({
        success: true,
        tx: signature,
        totalBalance,
        payoutAmount,
        feeAmount,
        feeRate: WITHDRAW_FEE_RATE,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to send SOL",
        details: error.message,
      });
    }
  });
}

module.exports = registerApiRoutes;
