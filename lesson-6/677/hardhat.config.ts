import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@parity/hardhat-polkadot";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    // Local Polkadot (local node)
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 1281,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    
    // PassetHub (Polkadot Asset Hub)
    passethub: {
      url: "https://polkadot-asset-hub-rpc.polkadot.io",
      chainId: 1000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    
    // Moonbase Alpha (Polkadot testnet)
    moonbase: {
      url: "https://rpc.api.moonbase.moonbeam.network",
      chainId: 1287,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  
  // Polkadot 配置
  polkadot: {
    networks: {
      local: {
        url: "ws://127.0.0.1:9944",
        types: {},
      },
      passethub: {
        url: "wss://polkadot-asset-hub-rpc.polkadot.io",
        types: {},
      },
    },
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  
  mocha: {
    timeout: 60000,
  },
};

export default config;