function loadDependency(moduleName, fallbackPath) {
  try {
    return require(moduleName);
  } catch (_error) {
    return require(fallbackPath);
  }
}

const { Keypair } = loadDependency(
  "@solana/web3.js",
  "../backend/node_modules/@solana/web3.js"
);
const bs58Module = loadDependency("bs58", "../backend/node_modules/bs58");

const bs58 = bs58Module.default || bs58Module;
const wallet = Keypair.generate();

console.log("--- SAVE THIS SECURELY ---");
console.log("PUBLIC KEY (RECEIVE SOL HERE):", wallet.publicKey.toBase58());
console.log(
  "PRIVATE KEY (FOR .ENV FILE):",
  JSON.stringify(Array.from(wallet.secretKey))
);
console.log(
  "BASE58 PRIVATE KEY (FOR PHANTOM):",
  bs58.encode(wallet.secretKey)
);
