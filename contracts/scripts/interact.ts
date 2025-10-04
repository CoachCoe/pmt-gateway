import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Script to interact with deployed PMTEscrow contract
 * Usage: npx hardhat run scripts/interact.ts --network kusama-testnet
 */

const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || "";

async function main() {
  if (!ESCROW_ADDRESS) {
    throw new Error("ESCROW_CONTRACT_ADDRESS not set in .env");
  }

  const [signer] = await ethers.getSigners();
  console.log("Interacting with contract using account:", signer.address);

  // Get contract instance
  const escrow = await ethers.getContractAt("PMTEscrow", ESCROW_ADDRESS);

  console.log("\n=== Contract Info ===");
  console.log("Address:", await escrow.getAddress());
  console.log("Owner:", await escrow.owner());
  console.log("Platform Fee:", (await escrow.platformFeeBps()).toString(), "bps");
  console.log("Platform Address:", await escrow.platformAddress());
  console.log("Next Payment ID:", (await escrow.nextPaymentId()).toString());

  // Example: Create a payment
  console.log("\n=== Example: Create Payment ===");
  const merchantAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual merchant
  const amount = ethers.parseEther("0.1");
  const expirationSeconds = 24 * 60 * 60; // 24 hours
  const externalId = "payment-intent-" + Date.now();

  console.log("Merchant:", merchantAddress);
  console.log("Amount:", ethers.formatEther(amount), "ETH");
  console.log("Expiration:", expirationSeconds / 3600, "hours");
  console.log("External ID:", externalId);

  // Uncomment to execute:
  /*
  const tx = await escrow.createPayment(
    merchantAddress,
    expirationSeconds,
    externalId,
    { value: amount }
  );
  console.log("Transaction hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Payment created! Gas used:", receipt?.gasUsed.toString());

  // Get payment ID from event
  const event = receipt?.logs.find(log => log.topics[0] === escrow.interface.getEvent("PaymentCreated").topicHash);
  if (event) {
    const paymentId = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], event.topics[1])[0];
    console.log("Payment ID:", paymentId.toString());
  }
  */

  // Example: Get payment details
  console.log("\n=== Example: Get Payment ===");
  const paymentId = 1; // Replace with actual payment ID

  try {
    const payment = await escrow.getPayment(paymentId);
    console.log("Payment", paymentId, ":");
    console.log("  Buyer:", payment.buyer);
    console.log("  Merchant:", payment.merchant);
    console.log("  Amount:", ethers.formatEther(payment.amount), "ETH");
    console.log("  Platform Fee:", ethers.formatEther(payment.platformFee), "ETH");
    console.log("  Merchant Amount:", ethers.formatEther(payment.merchantAmount), "ETH");
    console.log("  Status:", ["Pending", "Completed", "Refunded", "Disputed"][payment.status]);
    console.log("  Created:", new Date(Number(payment.createdAt) * 1000).toISOString());
    console.log("  Expires:", new Date(Number(payment.expiresAt) * 1000).toISOString());
    console.log("  External ID:", payment.externalId);
  } catch (error) {
    console.log("Payment not found or error:", error);
  }

  // Example: Get merchant's payments
  console.log("\n=== Example: Get Merchant Payments ===");
  const merchantPayments = await escrow.getMerchantPayments(signer.address);
  console.log("Merchant", signer.address, "has", merchantPayments.length, "payments");
  console.log("Payment IDs:", merchantPayments.map(id => id.toString()).join(", "));

  // Example: Check if payment is expired
  if (paymentId) {
    const isExpired = await escrow.isPaymentExpired(paymentId);
    console.log("\n=== Payment Expiration ===");
    console.log("Payment", paymentId, "expired:", isExpired);
  }

  // Example: Calculate platform fee
  console.log("\n=== Fee Calculator ===");
  const testAmount = ethers.parseEther("1.0");
  const fee = await escrow.calculatePlatformFee(testAmount);
  console.log("Platform fee for 1 ETH:", ethers.formatEther(fee), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
