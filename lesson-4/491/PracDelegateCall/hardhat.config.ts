import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import ethersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  // plugins: [hardhatToolboxViemPlugin, ethersPlugin],
  plugins: [ethersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
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

    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      accounts: [configVariable("LOCALHOST_PRIVATE_KEY")],
      chainId: 420420420,
      ignition: {
        maxFeePerGasLimit: 50_000_000_000n, // 50 gwei
        //maxFeePerGas: 20_000_000_000n, // 20 gwei
        maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
        gasPrice: 50_000_000_000n, // 50 gwei
        disableFeeBumping: false,
        //explorerUrl: "https://sepolia.etherscan.io",
      },
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
