require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");
require("./tasks/polkavm-evm");
require("dotenv").config();

// Helper to load private keys from env, treating empty strings as "not provided"
const DEFAULT_LOCAL_PRIV_KEY = "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133";
const getPrivKey = (envName, fallback = null) => {
  const v = process.env[envName];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
};

// Read keys once and reuse
const LOCAL_KEY = getPrivKey("LOCAL_PRIV_KEY", DEFAULT_LOCAL_PRIV_KEY);
const AH_KEY = getPrivKey("AH_PRIV_KEY", null);

const usePolkaNode = process.env.POLKA_NODE === "true";
const useREVM = process.env.REVM === "true";

// resolc version fallback: prefer env override, else match solidity version
const RESOLC_VERSION = process.env.RESOLC_VERSION || "0.8.28";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",

  // resolc config: explicit version avoids "latest" download issues
  ...(useREVM
    ? {}
    : {
        resolc: {
          version: RESOLC_VERSION,
          compilerSource: "local",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200,
            },
          },
        },
      }),

  paths: {
    ...(useREVM && usePolkaNode ? { artifacts: "./artifacts" } : {})
  },

  mocha: {
    timeout: 100000000,
  },

  networks: {
    // Alias expected by README/scripts
    localNode: {
      url: "http://127.0.0.1:8545",
      accounts: [LOCAL_KEY],
    },

    // Hardhat node configured to spawn Polka node + adapter when POLKA_NODE=true
    hardhat: usePolkaNode && !useREVM
      ? {
          polkavm: true,
          nodeConfig: {
            nodeBinaryPath:
              "/Users/annabellelee/AL-Homework5/polkadot-sdk/target/release/substrate-node",
            rpcPort: 8000,
            dev: true,
          },
          adapterConfig: {
            adapterBinaryPath:
              "/Users/annabellelee/AL-Homework5/polkadot-sdk/target/release/eth-rpc",
            dev: true,
          },
        }
      : {},

    pvmevm: {
      url: "http://127.0.0.1:8545",
      accounts: [LOCAL_KEY],
      timeout: 60000,
      gas: "auto",
      gasPrice: "auto"
    },

    local: {
      url: "http://127.0.0.1:8545",
      accounts: [LOCAL_KEY, ...(AH_KEY ? [AH_KEY] : [])].filter(Boolean),
    },

    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [AH_KEY, LOCAL_KEY].filter(Boolean),
    },
  },
};
