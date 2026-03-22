const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    totalBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    deposits: [
      {
        signature: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        confirmedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
