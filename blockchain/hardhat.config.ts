import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: process.env.BLOCKCHAIN_RPC_URL ?? "http://127.0.0.1:8545",
    },
  },
};

export default config;

