import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    "kusama-testnet": {
      url: process.env.KUSAMA_TESTNET_RPC || "https://kusama-testnet-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10001, // Update with actual Kusama testnet chain ID
    },
    kusama: {
      url: process.env.KUSAMA_RPC || "https://kusama-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10000, // Update with actual Kusama chain ID
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      "kusama-testnet": process.env.ETHERSCAN_API_KEY || "",
      kusama: process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "kusama-testnet",
        chainId: 10001,
        urls: {
          apiURL: "https://kusama-testnet-explorer.polkadot.io/api",
          browserURL: "https://kusama-testnet-explorer.polkadot.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
