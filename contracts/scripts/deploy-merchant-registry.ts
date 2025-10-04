import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PMTMerchantRegistry contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "DOT\n");

  // Deploy contract
  const PMTMerchantRegistry = await ethers.getContractFactory("PMTMerchantRegistry");
  const merchantRegistry = await PMTMerchantRegistry.deploy();

  await merchantRegistry.waitForDeployment();

  const address = await merchantRegistry.getAddress();

  console.log("✅ PMTMerchantRegistry deployed successfully!");
  console.log("Contract address:", address);
  console.log("\n📋 Next steps:");
  console.log("1. Add to .env file:");
  console.log(`   MERCHANT_REGISTRY_ADDRESS=${address}`);
  console.log("\n2. Verify contract on block explorer:");
  console.log(`   npx hardhat verify --network kusama-testnet ${address}`);
  console.log("\n3. Test the contract:");
  console.log("   npx hardhat run scripts/test-merchant-registry.ts --network kusama-testnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
