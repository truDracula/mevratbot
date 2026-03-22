# Mevrat Project

This project runs as a single Node web service. The backend serves the frontend from the same app.

## Local Run

1. Start MongoDB locally.
2. Generate a treasury wallet:
   - `cd scripts`
   - `node keygen.js`
3. Put the generated private key into `backend/.env` as `TREASURY_PRIVATE_KEY`.
4. Put the generated public key into `frontend/app.js` as `TREASURY_PUBKEY`.
5. Fund the treasury wallet with enough SOL to cover withdrawals.
6. Start the app:
   - `cd backend`
   - `npm start`
7. Open `http://localhost:3000`

## Render Hosting

1. Push this folder to GitHub.
2. In Render, create a new Blueprint using `render.yaml`.
3. Set these environment variables:
   - `MONGO_URI`
   - `TREASURY_PRIVATE_KEY`
4. Deploy.

## Real Deposit and Withdrawal

- Deposit:
  - User connects Phantom in the browser.
  - Frontend sends SOL to the treasury wallet.
  - Backend verifies the on-chain transfer and credits `totalBalance`.

- Withdrawal:
  - User requests withdrawal.
  - Backend sends SOL from the treasury wallet.
  - A transparent 1% fee is deducted and returned in the API response.

## Important

- `TREASURY_PRIVATE_KEY` must stay secret.
- The treasury wallet must hold enough SOL for withdrawals.
- The current backend expects a working MongoDB database.
