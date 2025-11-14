require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      polkadot: true,
      forking: {
        url: "https://testnet-passet-hub.polkadot.io",
      },
      adapterConfig: {
        adapterBinaryPath: "./bin/eth-rpc",
        dev: true,
      },
    },
    localNode: {
      polkavm: true,
      url: `http://127.0.0.1:8545`,
      accounts: [vars.get("PRIVATE_KEY")],
    },
  },
};
