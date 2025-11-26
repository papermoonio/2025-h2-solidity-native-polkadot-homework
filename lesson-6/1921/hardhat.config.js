require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      blockGasLimit: 30000000, // 增加区块 gas 限制（默认约 30M，这里明确设置）
    },
  },
};
