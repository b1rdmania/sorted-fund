import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
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
      chainId: 31337,
    },
    sonic: {
      url: process.env.SONIC_RPC_URL || "https://rpc.testnet.soniclabs.com",
      chainId: 14601,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sonic: process.env.SONIC_EXPLORER_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "sonic",
        chainId: 14601,
        urls: {
          apiURL: "https://api.testnet.soniclabs.com/api",
          browserURL: "https://testnet.soniclabs.com",
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
