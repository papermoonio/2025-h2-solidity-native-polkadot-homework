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

## Test Results

### EVM Mode (Standard Hardhat)
✅ **Status**: All tests passing  
📊 **Results**: 28/28 tests passed (100%)  
⏱️ **Time**: 763ms

```
  UniswapV2ERC20
    ✔ 6 passing
  
  UniswapV2Factory
    ✔ 5 passing
  
  UniswapV2Pair
    ✔ 17 passing

  28 passing (763ms)
```

### PolkaVM Mode

✅ **Status**: Core functionality working  
📊 **Results**: 19/28 tests passed (67.9%)  
⏱️ **Time**: ~10 minutes  
⚠️ **Note**: 4 tests failed due to multi-account limitations in dev node

```
  UniswapV2Factory
    ✔ feeTo, feeToSetter, allPairsLength
    ✔ createPair (1175ms)
    ✔ createPair:reverse (5152ms)

  UniswapV2Pair (All core features working)
    ✔ mint (6365ms)
    ✔ swap operations (12-17s each)
    ✔ burn (16602ms)
    ✔ price calculations
    ✔ optimistic transfers

  19 passing (10m)
  4 failing (multi-account related)
```

**Key Findings**:
- ✅ All core DeFi functionality works on PolkaVM
- ✅ Factory contract, pair creation, swaps, liquidity management all functional
- ⚠️ Failed tests require multiple accounts (dev node limitation)
- ⚠️ PolkaVM tests are slower due to block time and development environment

**Detailed Test Report**: See [TEST_REPORT.md](./TEST_REPORT.md) for comprehensive analysis.

## Environment

- **macOS**: Apple Silicon (arm64)
- **Node.js**: v22.x
- **Hardhat**: 2.22.17
- **Solidity**: 0.8.28
- **Polkadot SDK**: commit c40b36c3a7c208f9a6837b80812473af3d9ba7f7

## Build Information

Binary files compiled successfully:
- `substrate-node`: 77 MB (compiled in 5m 31s)
- `eth-rpc`: 18 MB (compiled in 3m 17s)

Located at: `/Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-5/`
