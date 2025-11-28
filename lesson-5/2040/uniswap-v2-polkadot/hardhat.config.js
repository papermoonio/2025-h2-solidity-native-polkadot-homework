require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");
require("./tasks/polkavm-evm"); // Load custom EVM mode tasks

require("dotenv").config();

const usePolkaNode = process.env.POLKA_NODE === "true";
const useREVM = process.env.REVM === "true";

// Generate proper private keys for testing
const generateTestPrivateKey = (index) => {
  // Create a proper 32-byte private key for testing
  const prefix = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  return prefix.substring(0, 64) + (index % 10).toString().repeat(2);
};

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
      polkavm: true,
      polkadotUrl: "http://127.0.0.1:9944",
      url: "http://127.0.0.1:8545",
      accounts: [
        process.env.LOCAL_PRIV_KEY ?? generateTestPrivateKey(0),
        process.env.AH_PRIV_KEY ?? generateTestPrivateKey(1),
      ],
    },
    pvmevm: {
      // EVM mode: connect to PVM node via ETH RPC
      url: "http://127.0.0.1:8545",
      accounts: [
        process.env.LOCAL_PRIV_KEY ?? generateTestPrivateKey(0),
      ],
      timeout: 60000,
      gas: "auto",
      gasPrice: "auto"
    },
    local: {
      polkavm: true,
      polkadotUrl: "http://127.0.0.1:9944",
      url: `http://127.0.0.1:8545`,
      accounts: [
        process.env.LOCAL_PRIV_KEY ?? generateTestPrivateKey(0),
        process.env.AH_PRIV_KEY ?? generateTestPrivateKey(1),
      ],
    },
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [
        process.env.AH_PRIV_KEY ?? generateTestPrivateKey(1),
        process.env.LOCAL_PRIV_KEY ?? generateTestPrivateKey(0),
      ],
    },
  },
};