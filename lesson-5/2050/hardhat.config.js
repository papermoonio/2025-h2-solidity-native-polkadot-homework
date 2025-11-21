// 修复 @polkadot-api/ws-provider 的 WebSocket 问题
// 必须在加载任何 Polkadot 相关模块之前设置
const { WebSocket } = require('ws');
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = WebSocket;
}

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
            nodeBinaryPath: "../revive-dev-node-darwin-arm64",
            rpcPort: 8000,
            dev: true,
          },
          adapterConfig: {
            adapterBinaryPath: "../eth-rpc-darwin-arm64",
            dev: true,
          },
        }
      : {},
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
      ].filter(key => key && key.length === 66), // 过滤掉无效的私钥
    },
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [
        process.env.LOCAL_PRIV_KEY ??
          "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      ].filter(key => key && key.length === 66), // 过滤掉无效的私钥
    },
  },
};