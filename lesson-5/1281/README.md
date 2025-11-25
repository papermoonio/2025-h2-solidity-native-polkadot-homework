# Uniswap V2 - Polkadot Hub

## Prerequisites

Ensure that you have substrate-node, eth-rpc and local resolc binaries on your local machine. If not, follow these instructions to install them:

```bash
git clone https://github.com/paritytech/polkadot-sdk
cd polkadot-sdk
git checkout c40b36c3a7c208f9a6837b80812473af3d9ba7f7
cargo build --bin substrate-node --release
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release
```

Once the build is complete, you will find both binaries in the `./target/release` directory. Copy and paste them into the `./bin` directory of this repository.

## How to Initialize

```bash
git clone git@github.com:papermoonio/uniswap-v2-polkadot.git
cd uniswap-v2-polkadot
pnpm install
```

Open the `hardhat.config.js` file and update the following fields under networks -> hardhat:

```
nodeBinaryPath: Set this to the local path of your substrate-node binary.
adapterBinaryPath: Set this to the local path of your eth-rpc binary.
```

## How to Test

```bash
# For Local node
POLKA_NODE=true npx hardhat test --network localNode

# For Westend Hub
POLKA_NODE=true npx hardhat test --network passetHub
```

## Compatibility with EVM

```
# test polkavm on polka node
POLKA_NODE=true npx hardhat test

# test on EVM
npx hardhat test

# test evm on polka node
POLKA_NODE=true REVM=true npx hardhat test
```


1. 使用本地hardhat环境运行测试报错:
2025-h2-solidity-native-polkadot-homework/lesson-5/1281$ npx hardhat test
[dotenv@17.2.1] injecting env (0) from .env -- tip: ⚙️  enable debug logging with { debug: true }
Error HH8: There's one or more errors in your config file:

  * Invalid account: #1 for network: local - private key too short, expected 32 bytes
  * Invalid account: #0 for network: passetHub - private key too short, expected 32 bytes

To learn more about Hardhat's configuration, please go to https://v2.hardhat.org/config/

For more info go to https://v2.hardhat.org/HH8 or run Hardhat with --show-stack-traces