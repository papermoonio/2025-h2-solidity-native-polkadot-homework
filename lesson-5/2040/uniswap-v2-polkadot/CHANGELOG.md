# Changelog

## Context

All tests have passed EVM testing.

```
❯ npx hardhat test
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


  28 passing (2s)
```

## Modification Record

| Change Type                     | Description & Cause                                                                                            | Files Affected                                                                                       |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Solidity Version Upgrade**    | Solidity version upgraded from 0.5.x to 0.8.x                                                                  | contracts/UniswapV2Factory.sol, <br>contracts/UniswapV2Pair.sol                                      |
| **Test Workflow**               | 1. Test framework migrates from Waffle to Hardhat, <br>2. ethersv5 upgrade to ethersv6                         | test/shared/\*, <br> test/UniswapV2ERC20.js, <br>test/UniswapV2Factory.js, <br>test/UniswapV2Pair.js |
| **Contract Logic Modification** | Core changes to smart contract logic due to a fundamental incompatibility between the EVM and PolkaVM runtime. |                                                                                                      |

---

## Issue Reporting

Issues found when migrating uniswap v2-core.

### 1. [uniswap-v2-polkadot] Stack Space OVerflow

> issue link: https://github.com/paritytech/contract-issues/issues/54

### Issue Description

When testing UniswapV2Pair.transfer(), a ContractTrapped error occurs. The error appears to be related to invalid memory access when writing to address 0xfffdbea0.

#### Status track

✅ Solved

#### PoC env

Repository: hardhat-revive-uniswap-v2-core (contracttrapped branch)
Test File: test/UniswapV2Pair.js
Toolchain: resolc-0.1.0-dev.13

##### Reproduction Steps

Clone and checkout the repository:

git clone https://github.com/sekisamu/hardhat-revive-uniswap-v2-core/
cd hardhat-revive-uniswap-v2-core
git checkout contracttrapped
Test using either method:

**Method 1: Local Node**
start a local node (under the substrate folder)

```
./target/release/substrate-node --dev --log=debug
```

test under hardhat-revive-uniswap-v2-core folder

```
npx hardhat test ./test/UniswapV2Pair.js --network polkavm --grep "transfer"
```

**Method 2: Revive Runner**
First, install revive-runner
use https://github.com/sekisamu/revive-runner/tree/0.1.0-dev.13-debug, build with command: `cargo build -p revive-runner`

then switch back to hardhat-revive-uniswap-v2-core, run:

```
npx hardhat compile --network polkavm && RUST_LOG=debug  <PATH_TO_REVIVE_RUNNER> $(cat ./artifacts-pvm/contracts/UniswapV2Pair.sol/UniswapV2Pair.json | jq -r '.bytecode' | cut -c 3-) a9059cbb000000000000000000000000f24ff3a9cf04c71dbc94d0b566f7a27b94566cac0000000000000000000000000000000000000000000000000000000000000000
```

Error logs

```
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter] Compiling block:
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [101]: 6715: charge_gas
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [102]: 6715: a0 = sp + 0xffffffffffffffe0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [103]: 6718: a0 = a0 & 0xffffffffffffffe0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [104]: 6721: sp = a0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [105]: 6723: u64 [a0 + 24] = 0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [106]: 6726: u64 [a0 + 16] = 0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [107]: 6729: u64 [a0 + 8] = 0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [108]: 6732: u64 [s1 + 0x2f8] = a0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [109]: 6736: u64 [a0 + 0] = 0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [110]: 6738: a0 = s1 + 0x3000
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [111]: 6742: i32 a0 = a0 + 0x180
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [112]: 6746: a1 = 0
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [113]: 6748: ecalli 3
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter]   [114]: 6750: fallthrough
[2025-04-22T08:34:34Z DEBUG polkavm::interpreter] Store of 8 bytes to 0xfffdbff8 failed! (pc = 6723, cycle = 97)
[2025-04-22T08:34:34Z DEBUG polkavm::api]   At #6723:
[2025-04-22T08:34:34Z DEBUG polkavm::api]     (no location available)
thread 'main' panicked at crates/runner/src/main.rs:170:9:
assertion `left == right` failed: contract execution result mismatch: Exec { result: ContractResult { gas_consumed: Weight { ref_time: 290629432, proof_size: 178588 }, gas_required: Weight { ref_time: 290629432, proof_size: 178588 }, storage_deposit: StorageDeposit::Charge(0), result: Err(Module(ModuleError { index: 3, error: [10, 0, 0, 0], message: Some("ContractTrapped") })) }, wall_time: 3.094292ms }
```

#### Analysis

Suspected Root Cause:

The error appears to be caused by stack space overflow when multiple methods interact
Invalid memory access during write operations (0xfffdbff8 appears to be an invalid stack address)
Potential compiler-level issue in resolc (Solidity compiler) code generation

### 2. [uniswap-v2-polkadot] fail to use `combined-json` in hardhat config

#### Description

When using combined-json in `hardhat.config.js` and run `npx hardhat test`, it will show:

```
Error: write EPIPE
    at WriteWrap.onWriteComplete [as oncomplete] (node:internal/stream_base_commons:87:19)
```

### Status track

✅ Solved

### 3. [uniswap-v2-polkadot] Gas Usage Varies for Same Operation

> issue link: https://github.com/paritytech/contract-issues/issues/49

#### Description

When executing the same method with identical storage modifications (e.g., `erc20.transfer(some_address, 0)`), the `gasUsed` value shows minor inconsistencies across repeated executions under PolkaVM. Ideally, identical operations under the same conditions should consume the exact same amount of gas, but PolkaVM currently produces slightly varying results.

#### Status track

ℹ️ Investigation Complete, no need to solve.

#### Steps to reproduce

Clone and set up the test repository:

```
git clone https://github.com/sekisamu/hardhat-revive-erc20
cd hardhat-revive-erc20
git checkout gasused
```

Run test:

```
npx hardhat test --network local
```

**Observed Results:**
The test outputs gas values that differ slightly for identical transactions:

```
gas used in tx1 1841319244556000n
gas used in tx2 1841622671680000n
gas used in tx3 1841622667910000n
gas used in tx4 1841622664141000n
gas used in tx5 1841622660372000n
gas used in tx6 1841622656603000n
```

**Expected Behavior**
The `gasUsed` value should remain consistent across multiple executions of the same transaction, assuming no changes to the contract state or network conditions.

#### Analysis

After investigation, it was determined that PolkaVM's gas calculation mechanism differs from the EVM's. Instead of being based purely on opcodes, it adheres to Substrate's **weight** design principles. This can cause minor variations in gas costs even for identical operations. Therefore, testing gas consumption on PolkaVM requires a different approach or methodology compared to the EVM.

### 4. [uniswap-v2-polkadot] Deploy large contract Error `CodeSizeLimit`

#### Description

When deploying large contracts to PolkaVM using Hardhat, an error occurs indicating the contract size is too large: `Error: the initcode size of this transaction is too large: it is 177558 while the max is 49152`.

The 48KB contract size limit was introduced by EIP-3860 and is enforced by Hardhat locally, not by the chain itself. This issue is common when using `resolc`, which typically produces larger bytecode than `solc`.

#### Status track

✅ Solved

#### Steps to reproduce

Clone the repository with the specific branch for this issue:

```
git clone --branch code-size-limit https://github.com/sekisamu/hardhat-revive-uniswap-v2-core
pnpm install
```

**Failing Test (Standard Hardhat Deployment):**
Run test with:

```
npx hardhat test ./test/UniswapV2Factory.js --network localNode
```

**Result:** Throws a `CodeSizeLimit` error.

#### Analysis

The investigation revealed that the code size check is exclusively part of Hardhat's deployment wrapper logic. By bypassing this layer, we can successfully deploy large contracts.

The solution is to modify the deployment logic for the large contract (`UniswapV2Pair`) by replacing Hardhat's default `LocalAccountsProvider` with a standard `JsonRpcProvider`. This change allows the deployment transaction to be sent directly without triggering Hardhat's internal size validation.

### 5. [uniswap-v2-polkadot] Storage read dismatch

> related issue: https://github.com/paritytech/contract-issues/issues/50

#### Description

encountering this strange issue where reading contract storage sometimes fails or returns incorrect results—but this does not happen for all storage values.

#### How to reproduce

```
git clone https://github.com/sekisamu/hardhat-revive-uniswap-v2-core/
cd hardhat-revive-uniswap-v2-core
git checkout fix-codesize
npx hardhat test ./test/UniswapV2Factory.js --network ah --grep "setFeeTo"
```

❌ Actual Behavior
You will see an error like this:

```
UniswapV2Factory
factory address 0x118611a53Aeb40887f01118b13110F37A02d7c6C
feeTo 0x0000000000000000000000000000000000000000
    1) setFeeTo

  0 passing (13s)
  1 failing

   1) UniswapV2Factory
       setFeeTo:

      AssertionError: expected '0x0000000000000000000000000000000000000000' to equal '0x8bB0D0937335aa50131747234446d0c5e344207b'.
      + expected - actual

      -0x0000000000000000000000000000000000000000
      +0x8bB0D0937335aa50131747234446d0c5e344207b
The feeTo() value is not updated as expected in the test context.
```

✅ But... Manual Check Works
When calling feeTo() manually on the same deployed contract (on AssetHub):
Contract address: `0x118611a53Aeb40887f01118b13110F37A02d7c6C`
It returns: `0x8bB0D0937335aa50131747234446d0c5e344207b`
This suggests that the value is being written, but not being read properly in certain execution contexts (such as local chain).

#### Analysis

This is a secondary issue that arose from the workaround for the `CodeSizeLimit` error.

To bypass Hardhat’s built-in `codeSizeLimit` check, the provider was switched from Hardhat's default `LocalAccountsProvider` to a standard `JsonRpcProvider`. The two providers, however, implement `sendTransaction` differently:

- **`LocalAccountsProvider` (Hardhat Default):** Submits a transaction and **waits** for it to be mined before returning the result. This is a synchronous-like behavior.
- **`JsonRpcProvider` (Custom):** Simply broadcasts the transaction to the network and returns **immediately**, without waiting for confirmation. This is asynchronous behavior.

This difference in behavior explains the race condition. With `JsonRpcProvider`, the test script would proceed to the read operation (`feeTo()`) immediately after broadcasting the `setFeeTo()` transaction, often before the transaction was actually included in a block and mined on-chain.

The solution is to manually wait for the transaction to be mined by calling `.wait()` on the transaction response object before proceeding with any state-dependent operations.
