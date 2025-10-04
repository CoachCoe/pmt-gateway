import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying PMTEscrow contract with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Get deployment parameters from environment
  const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || "250"); // 2.5% default
  const platformAddress = process.env.PLATFORM_ADDRESS || deployer.address;

  console.log("\nDeployment Parameters:");
  console.log("- Platform Fee:", platformFeeBps / 100, "%");
  console.log("- Platform Address:", platformAddress);

  // Deploy contract
  console.log("\nDeploying contract...");
  const PMTEscrow = await ethers.getContractFactory("PMTEscrow");
  const escrow = await PMTEscrow.deploy(platformFeeBps, platformAddress);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("\n✅ PMTEscrow deployed to:", address);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const deployedFeeBps = await escrow.platformFeeBps();
  const deployedPlatformAddress = await escrow.platformAddress();
  const deployedOwner = await escrow.owner();

  console.log("- Platform Fee BPS:", deployedFeeBps.toString());
  console.log("- Platform Address:", deployedPlatformAddress);
  console.log("- Contract Owner:", deployedOwner);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    contractAddress: address,
    platformFeeBps: deployedFeeBps.toString(),
    platformAddress: deployedPlatformAddress,
    owner: deployedOwner,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: escrow.deploymentTransaction()?.hash,
  };

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for verification
  console.log("\n📝 To verify contract on block explorer, run:");
  console.log(`npx hardhat verify --network ${deploymentInfo.network} ${address} ${platformFeeBps} ${platformAddress}`);

  // Save to file
  const fs = require('fs');
  const path = require('path');
  const deploymentsDir = path.join(__dirname, '..', 'deployments');

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = path.join(deploymentsDir, `${deploymentInfo.network}-${Date.now()}.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n💾 Deployment info saved to: ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
