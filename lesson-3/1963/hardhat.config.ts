import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@parity/hardhat-polkadot';
import { config as dotConfig } from "dotenv";
dotConfig();

// PRIVATE_KEY is only required for passetHub network, not for local/hardhat networks
// Only throw error if PRIVATE_KEY is missing when actually needed

const config: HardhatUserConfig = {
    solidity: '0.8.20',
    resolc: {
        compilerSource: 'npm',
    },
    networks: {
        hardhat: {
            polkavm: true,
            forking: {
                url: 'wss://westend-asset-hub-rpc.polkadot.io',
            },
            adapterConfig: {
                adapterBinaryPath: './bin/eth-rpc',
                dev: true,
            },
        },
        passetHub: {
            polkavm: true,
            url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        local: {
            polkavm: true,
            url: "http://localhost:8545",
            accounts: [
                // Alith - Pre-funded dev account from Substrate dev node (default Account::default())
                // Private key: 0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133
                // Address: 0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac
                process.env.LOCAL_PRIV_KEY || "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
                ...(process.env.LOCAL_PRIV_KEY_2 ? [process.env.LOCAL_PRIV_KEY_2] : []),
            ],
            // Increased gas limit to handle storage deposits required by Substrate
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 1,
            // Configure adapter for local Substrate node
            adapterConfig: {
                adapterBinaryPath: './bin/eth-rpc',
                dev: true,
            },
        },
    }
};

export default config;
