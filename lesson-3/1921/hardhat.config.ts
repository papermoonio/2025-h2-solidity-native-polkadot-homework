import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

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
    // Sepolia测试网配置
    sepolia: {
      url: 'https://rpc.sepolia.org',
      accounts: vars.has("PRIVATE_KEY") ? [vars.get("PRIVATE_KEY")] : [],
      chainId: 11155111, // Sepolia测试网Chain ID
      gasPrice: 20000000000, // 20 gwei
    },
    // BSC测试网配置
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
      accounts: vars.has("PRIVATE_KEY") ? [vars.get("PRIVATE_KEY")] : [],
      chainId: 97, // BSC测试网Chain ID
    },
    // 本地开发网络
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  // Gas报告配置
  gasReporter: {
    enabled: true,
    currency: 'USD',
  }
};

export default config;
