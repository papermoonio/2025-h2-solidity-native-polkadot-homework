import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

import type { HardhatUserConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        compilers: [
          {
            version: "0.4.26",
          },
          {
            version: "0.8.28",
          },
        ],
      },
      production: {
        compilers: [
          {
            version: "0.8.28",
            settings: {
              optimizer: {
                enabled: true,
                runs: 200,
              },
            },
          },
          {
            version: "0.4.26",
          },
        ],
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    local: {
      chainId: 420420420,
      type: "http",
      chainType: "l1",
      url: "http://localhost:8545",
      accounts: [configVariable("LOCALHOST_PRIVATE_KEY")],
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
