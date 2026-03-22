const solanaWeb3 = require("@solana/web3.js");
const bs58Module = require("bs58");

const bs58 = bs58Module.default || bs58Module;
const { Connection, Keypair, PublicKey } = solanaWeb3;

function getConnection(rpcUrl) {
  if (!rpcUrl) {
    throw new Error("SOLANA_RPC_URL is required.");
  }

  return new Connection(rpcUrl, "confirmed");
}

function parseTreasuryKeypair(secret) {
  if (!secret) {
    throw new Error("TREASURY_PRIVATE_KEY is required.");
  }

  let secretBytes;

  if (secret.trim().startsWith("[")) {
    secretBytes = Uint8Array.from(JSON.parse(secret));
  } else {
    secretBytes = bs58.decode(secret);
  }

  return Keypair.fromSecretKey(secretBytes);
}

function getTreasuryStatus(treasuryKeypair) {
  return {
    ready: Boolean(treasuryKeypair),
    publicKey: treasuryKeypair?.publicKey?.toBase58?.() ?? null,
  };
}

module.exports = {
  solanaWeb3,
  PublicKey,
  getConnection,
  parseTreasuryKeypair,
  getTreasuryStatus,
};
