import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // 本地 hardhat 默认网络，用于跑测试，不需要特别配置
    // hardhat: {},

    // 如果你后面要连 sepolia，可以在项目根目录建一个 .env 文件
    // 写上 SEPOLIA_RPC_URL 和 SEPOLIA_PRIVATE_KEY
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
