// 添加WebSocket polyfill
const WebSocket = require('ws');
global.WebSocket = WebSocket;

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
            nodeBinaryPath: "./bin/substrate-node",
            rpcPort: 8000,
            dev: true,
          },
          adapterConfig: {
            adapterBinaryPath: "./bin/eth-rpc",
            dev: true,
          },
        }
      : {},
    localNode: {
        url: "http://127.0.0.1:8545",
        polkavm: process.env.REVM !== 'true',
        polkadotUrl: process.env.REVM !== 'true' ? "ws://127.0.0.1:9944" : undefined,
        accounts: [process.env.LOCAL_PRIV_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
        nodeConfig: process.env.REVM !== 'true' ? {
          nodeBinaryPath: "./bin/substrate-node",
          rpcPort: 9933,
          wsPort: 9944,
          dev: true,
        } : undefined,
        adapterConfig: process.env.REVM !== 'true' ? {
          adapterBinaryPath: "./bin/eth-rpc",
          dev: true,
          port: 8545,
        } : undefined,
        gas: 12000000,
        gasPrice: 8000000000,
        blockGasLimit: 12000000
      },
    pvmevm: {
      // EVM mode: connect to PVM node via ETH RPC
      url: "http://127.0.0.1:8545",
      accounts: [
        process.env.LOCAL_PRIV_KEY ??
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
        process.env.LOCAL_PRIV_KEY ??
          "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      ],
    },
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [
        process.env.LOCAL_PRIV_KEY ??
          "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      ],
    },
  },
};