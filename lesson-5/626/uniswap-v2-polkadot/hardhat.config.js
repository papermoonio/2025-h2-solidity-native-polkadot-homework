require("@nomicfoundation/hardhat-toolbox")
require("@parity/hardhat-polkadot")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            evmVersion: "istanbul",
            optimizer: { enabled: true, runs: 200 }
        }
    },
    networks: {
        hardhat: {
            polkadot: {
                target: "evm",
            },
            nodeConfig: {
                nodeBinaryPath: "./bin/substrate-node",
                rpcPort: 8000,
                dev: true,
            },
            adapterConfig: {
                adapterBinaryPath: "./bin/eth-rpc",
                dev: true,
            },
        },
        localNode: {
            polkadot: {
                target: "evm",
            },
            url: `http://127.0.0.1:8545`,
            accounts: [vars.get("PRIVATE_KEY"), "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"],
        },
        polkadotHubTestnet: {
            polkadot: {
                target: "evm",
            },
            url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
            accounts: [vars.get("PRIVATE_KEY")],
        },
    },
}