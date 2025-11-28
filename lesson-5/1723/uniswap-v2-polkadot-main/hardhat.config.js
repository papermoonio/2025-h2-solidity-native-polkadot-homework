require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");
require("./tasks/polkavm-evm"); // Load custom EVM mode tasks

require("dotenv").config();

const usePolkaNode = process.env.POLKA_NODE === "true";
const useREVM = process.env.REVM === "true";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  ...(useREVM ? {} : {
    resolc: {
      compilerSource: "binary",
      resolPath: "resolc-0.3.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    }
  }),
  paths: {
    ...(useREVM && usePolkaNode ? {
      artifacts: "./artifacts"
    } : {})
  },
  mocha: {
    timeout: 100000000,
  },
  networks: {
    hardhat: usePolkaNode && !useREVM
      ? {
        polkavm: true,
        nodeConfig: {
          nodeBinaryPath: "./bin/revive-dev-node",
          rpcPort: 8000,
          dev: true,
        },
        adapterConfig: {
          adapterBinaryPath: "./bin/eth-rpc",
          dev: true,
        },
      }
      : {},
    pvmevm: {
      // EVM mode: connect to PVM node via ETH RPC
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      ],
      timeout: 60000,
      gas: "auto",
      gasPrice: "auto"
    },
    local: {
      // polkavm: true,
      url: `http://127.0.0.1:8545`,
      accounts: [
        "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      ],
    },
    localNode: {
      polkadot: {
        target: 'evm',
      },
      url: `http://127.0.0.1:8545`,
    },
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [
        "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      ],
    },
  },
};