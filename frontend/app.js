let TREASURY_PUBKEY = "Ey48QkBMBKaZ4Mg2pmQJZvU8NbtSj8vshgvu2b3sVzhe";
let RPC_URL = "https://api.mainnet-beta.solana.com";

function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.style.color = isError ? "#7a1f1f" : "#1f6f3d";
}

function updateBalance(balance) {
  const balanceElement = document.getElementById("balance");
  if (balanceElement) {
    balanceElement.textContent = `Tracked balance: ${balance} SOL`;
  }
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (data.rpcUrl) {
      RPC_URL = data.rpcUrl;
    }
    if (data.treasuryPubkey) {
      TREASURY_PUBKEY = data.treasuryPubkey;
    }
  } catch (_error) {
    // Keep local defaults if the config route is unavailable.
  }
}

async function deposit() {
  try {
    const provider = window.phantom?.solana;
    if (!provider?.isPhantom) {
      setStatus("Please install Phantom.", true);
      return;
    }

    if (TREASURY_PUBKEY === "PASTE_YOUR_PUBLIC_KEY_HERE") {
      setStatus("Set your treasury public key in app.js first.", true);
      return;
    }

    const amountInput = document.getElementById("sol-slider");
    const amount = Number.parseFloat(amountInput?.value ?? "0");

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("Enter a valid SOL amount.", true);
      return;
    }

    setStatus("Connecting wallet...");
    await provider.connect();

    const walletInput = document.getElementById("wallet-address");
    if (walletInput && !walletInput.value) {
      walletInput.value = provider.publicKey.toString();
    }

    const transaction = new window.solanaWeb3.Transaction().add(
      window.solanaWeb3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: new window.solanaWeb3.PublicKey(TREASURY_PUBKEY),
        lamports: Math.round(amount * window.solanaWeb3.LAMPORTS_PER_SOL),
      })
    );

    const connection = new window.solanaWeb3.Connection(RPC_URL, "confirmed");
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = provider.publicKey;

    setStatus("Awaiting wallet signature...");
    const { signature } = await provider.signAndSendTransaction(transaction);

    setStatus("Confirming deposit with backend...");
    const response = await fetch("/api/confirm-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: provider.publicKey.toString(),
        amount,
        sig: signature,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Deposit confirmation failed");
    }

    updateBalance(data.balance ?? 0);
    setStatus("Deposit confirmed.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadBalance() {
  try {
    const walletAddress = document.getElementById("wallet-address")?.value?.trim();
    if (!walletAddress) {
      setStatus("Enter a wallet address first.", true);
      return;
    }

    const response = await fetch(`/api/balance/${walletAddress}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load balance");
    }

    updateBalance(data.totalBalance ?? 0);
    setStatus("Balance loaded.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function withdrawBalance() {
  try {
    const walletAddress = document.getElementById("wallet-address")?.value?.trim();
    if (!walletAddress) {
      setStatus("Enter a wallet address first.", true);
      return;
    }

    const response = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Withdrawal failed");
    }

    updateBalance(0);
    setStatus(
      `Withdrawal sent with a 1% fee. Payout: ${data.payoutAmount} SOL, fee: ${data.feeAmount} SOL.`
    );
  } catch (error) {
    setStatus(error.message, true);
  }
}

window.deposit = deposit;
window.loadBalance = loadBalance;
window.withdrawBalance = withdrawBalance;
window.loadRuntimeConfig = loadRuntimeConfig;
