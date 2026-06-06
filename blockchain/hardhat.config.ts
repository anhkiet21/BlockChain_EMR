import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  networks: {
    localhost: {
      url: process.env.BLOCKCHAIN_RPC_URL ?? "http://127.0.0.1:8545",
    },
  },
};

export default config;
