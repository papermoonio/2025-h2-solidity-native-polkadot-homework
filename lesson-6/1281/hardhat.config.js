require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
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
      blockGasLimit: 30000000,
      chainId: 1337
    }
  },
  mocha: {
    timeout: 100000
  }
};

