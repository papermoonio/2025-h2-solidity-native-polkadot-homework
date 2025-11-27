require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Hardhat 本地网络（用于快速测试）
    hardhat: {
      blockGasLimit: 30000000, // 增加区块 gas 限制（默认约 30M，这里明确设置）
      chainId: 1337
    },
    // Polkadot Asset Hub 测试网
    passetHub: {
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420422,  // Polkadot Asset Hub Chain ID
      timeout: 60000,
    },
    // Sepolia 测试网 (备选方案)
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      timeout: 60000,
    },
  },
  mocha: {
    timeout: 100000
  }
};
