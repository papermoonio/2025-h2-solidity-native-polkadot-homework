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
## 单元测试执行情况
修改了hardhat.config.js中local的配置，在启动本地substrate-node和eth-rpc后，可以执行’POLKA_NODE=true npx hardhat test --network local‘进行本地单元测试验证
# PVM 执行结果
```
 UniswapV2ERC20
    1) "before each" hook for "name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH"

  UniswapV2Factory
    ✔ feeTo, feeToSetter, allPairsLength
    ✔ createPair (5239ms)
    ✔ createPair:reverse (5238ms)
    2) setFeeTo
    3) setFeeToSetter

  UniswapV2Pair
    ✔ mint (7475ms)
    ✔ getInputPrice:0 (17717ms)
    ✔ getInputPrice:1 (17740ms)
    ✔ getInputPrice:2 (17720ms)
    ✔ getInputPrice:3 (16710ms)
    ✔ getInputPrice:4 (17741ms)
    ✔ getInputPrice:5 (13735ms)
    ✔ getInputPrice:6 (17734ms)
    ✔ optimistic:0 (12717ms)
    ✔ optimistic:1 (12717ms)
    ✔ optimistic:2 (17737ms)
    ✔ optimistic:3 (17725ms)
    ✔ swap:token0 (17718ms)
    ✔ swap:token1 (13691ms)
    ✔ burn (16740ms)
    ✔ feeTo:off (23967ms)
    4) feeTo:on

  19 passing (11m)
  4 failing
```
# EVM 执行结果

```
 UniswapV2ERC20
    ✔ name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH
    ✔ approve
    ✔ transfer
    ✔ transfer:fail
    ✔ transferFrom
    ✔ transferFrom:max

  UniswapV2Factory
    ✔ feeTo, feeToSetter, allPairsLength
    ✔ createPair
    ✔ createPair:reverse
    ✔ setFeeTo
    ✔ setFeeToSetter

  UniswapV2Pair
    ✔ mint
    ✔ getInputPrice:0
    ✔ getInputPrice:1
    ✔ getInputPrice:2
    ✔ getInputPrice:3
    ✔ getInputPrice:4
    ✔ getInputPrice:5
    ✔ getInputPrice:6
    ✔ optimistic:0
    ✔ optimistic:1
    ✔ optimistic:2
    ✔ optimistic:3
    ✔ swap:token0
    ✔ swap:token1
    ✔ burn
    ✔ feeTo:off
    ✔ feeTo:on

```
