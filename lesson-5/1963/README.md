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

### Test Environment
- **Node Version**: v22.19.0
- **Hardhat Version**: 2.27.0
- **Solidity Version**: 0.8.28
- **Polkadot SDK Commit**: c40b36c3a7c208f9a6837b80812473af3d9ba7f7
- **Test Date**: November 2024

### Test Results Summary

#### EVM Mode (Standard Hardhat)
- **Status**: ❌ **Failed - Configuration Error**
- **Tests Passing**: 0/3
- **Error**: `Invalid account: #1 for network: local - Expected string, received object`
- **Root Cause**: The `local` network configuration includes `AH_KEY` which can be `null`, causing Hardhat to receive an object instead of a string in the accounts array.

#### LocalNode Mode (PolkaVM)
- **Status**: ❌ **Failed - Configuration Error**
- **Tests Passing**: 0/3
- **Error**: `Invalid account: #1 for network: local - Expected string, received object`
- **Root Cause**: Same as EVM mode - null values in accounts array.

#### PassetHub Mode (Remote Testnet)
- **Status**: ❌ **Failed - Configuration Error**
- **Tests Passing**: 0/3
- **Error**: `Invalid account: #0 for network: passetHub - Expected string, received object`
- **Root Cause**: The `passetHub` network has `AH_KEY` as the first account, which is `null` when not set in environment variables.

### Failure Analysis

#### Issue 1: Account Configuration Error
**Error Type**: Configuration Validation Error (HH8)

**Error Message**:
```
Invalid account: #1 for network: local - Expected string, received object
Invalid account: #0 for network: passetHub - Expected string, received object
```

**Root Cause**:
The `hardhat.config.js` file includes `null` values in the accounts arrays for networks that use `AH_KEY`. When `AH_KEY` is not set in environment variables, it returns `null`, and Hardhat expects all account entries to be strings (private keys).

**Affected Networks**:
- `local`: `accounts: [LOCAL_KEY, AH_KEY]` - AH_KEY can be null
- `passetHub`: `accounts: [AH_KEY, LOCAL_KEY]` - AH_KEY can be null

**Solution**:
Filter out `null` values from accounts arrays. Update the network configurations to:
```javascript
local: {
  url: "http://127.0.0.1:8545",
  accounts: [LOCAL_KEY, ...(AH_KEY ? [AH_KEY] : [])].filter(Boolean),
},

passetHub: {
  polkavm: true,
  url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
  accounts: [AH_KEY, LOCAL_KEY].filter(Boolean),
},
```

#### Issue 2: Previous CodeRejected Errors (Resolved)
**Error Type**: Contract Deployment Error

**Previous Error Message**:
```
ProviderError: Failed to instantiate contract: Module(ModuleError { index: 80, error: [27, 0, 0, 0], message: Some("CodeRejected") })
```

**Root Cause (Previously)**:
- Contract bytecode was being rejected by the PolkaVM runtime
- Possible causes: bytecode size limits, compiler compatibility issues, or missing resolc configuration

**Resolution**:
- Fixed resolc configuration by specifying explicit version (`0.8.28`) instead of `"latest"`
- Configured correct binary paths for substrate-node and eth-rpc
- Set `compilerSource: "local"` to use npm-installed resolc

**Current Status**: Configuration errors prevent tests from running, so CodeRejected errors cannot be verified as resolved.

### Test Cases

The test suite includes the following test files:
1. **UniswapV2ERC20.js** - Tests for ERC20 token functionality
2. **UniswapV2Factory.js** - Tests for factory contract (feeTo, feeToSetter, allPairsLength)
3. **UniswapV2Pair.js** - Tests for pair contract (mint functionality)

### Next Steps

1. **Fix Account Configuration**: Update `hardhat.config.js` to filter out null values from accounts arrays
2. **Re-run Tests**: Execute all test modes after configuration fix
3. **Verify CodeRejected Resolution**: Confirm that contract deployment works after configuration fix
4. **Document Successful Tests**: Update this section with passing test results

### Known Issues

1. ✅ **Resolved**: Resolc version configuration - Fixed by specifying explicit version
2. ✅ **Resolved**: Binary path configuration - Fixed by correcting username and path
3. ⚠️ **Pending**: Account configuration - Needs null value filtering
4. ⚠️ **Pending**: Test execution - Cannot verify until configuration is fixed

### Additional Notes

- The project successfully clones and initializes
- All dependencies install correctly
- Hardhat configuration is mostly correct, except for account array handling
- Binary paths are correctly configured for macOS x86_64
- Resolc is configured to use local npm package instead of downloading binaries
