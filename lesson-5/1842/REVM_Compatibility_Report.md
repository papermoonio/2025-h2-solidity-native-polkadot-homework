# REVM Compatibility Solution Report

## 1. REVM and PolkaVM Invocation/Switching Mechanism in Revive-Dev-Node

### 1.1 Execution Environment Architecture

Revive-Dev-Node supports two virtual machine execution environments:

- **PolkaVM**: Polkadot native virtual machine, executes RISC-V bytecode
- **REVM**: Rust EVM implementation, compatible with Ethereum EVM bytecode

### 1.2 Runtime Detection Mechanism

Revive-Dev-Node internally determines which virtual machine to use through:

**Bytecode Format Detection**: Checking the deployed contract bytecode format
- EVM bytecode: Starts with 0x60 (PUSH1 instruction)
- RISC-V bytecode: Specific RISC-V instruction sequences

## 2. Current Challenges in hardhat-polkadot REVM Compatibility

### 2.1 Core Problem

The current configuration presents a key contradiction:

- **Setting `polkavm: true`**: 
  - ✅ Starts Revive node
  - ❌ Defaults to uploading PolkaVM bytecode (RISC-V)
  
- **Not setting `polkavm: true`**:
  - ✅ Generates EVM bytecode
  - ❌ Does not start Revive node

### 2.2 Technical Challenges Analysis

1. **Compiler Configuration Conflict**
   ```javascript
   // When REVM=true, need to disable resolc
   ...(useREVM ? {} : {
     resolc: {
       compilerSource: "binary",
       // ...
     }
   })
   ```

2. **Network Configuration Complexity**
   - Need to manage both node startup and connection methods
   - pvmevm network requires manual URL and account configuration

3. **Bytecode Upload Path**
   - hardhat-polkadot plugin defaults to uploading PolkaVM bytecode
   - Lacks direct interface for uploading EVM bytecode to REVM

### 2.3 Solution

#### Solution 1: Custom Tasks (Implemented)

Implemented through `tasks/polkavm-evm.js`:

```javascript
// 1. Manually start PVM node (supporting REVM)
task("start-pvm-node", "Start PVM node for EVM bytecode testing")

// 2. Auto-switch network configuration
if (hre.network.name === "hardhat") {
  // Switch to pvmevm network
  Object.assign(hre.network.config, hre.config.networks.pvmevm);
  hre.network.name = "pvmevm";
}

// 3. Deploy using standard EVM bytecode
// Since resolc is disabled, Hardhat will use standard solc compiler
```

#### Solution 2: Plugin Improvement Suggestions

Suggest adding the following features to hardhat-polkadot plugin:

```javascript
networks: {
  hardhat: {
    polkavm: true,
    vmMode: "revm", // New: specify VM mode
    compilerMode: "evm", // New: specify compiler mode
  }
}
```

## 3. How to Run Different Modes

### 3.1 Running on EVM (Standard Hardhat)

```bash
# Don't set any environment variables
npx hardhat test
```

### 3.2 Running on PolkaVM

```bash
# Set POLKA_NODE=true, don't set REVM
POLKA_NODE=true npx hardhat test

# Or use .env file configuration
echo "POLKA_NODE=true" >> .env
npx hardhat test
```

### 3.3 Running on REVM

```bash
# Method: Auto-start (via custom task)
POLKA_NODE=true REVM=true npx hardhat test
```

## 4. Issues Running on REVM

### 4.1 Current Error

The following error occurs when running tests:

```
ProviderError: Client error: Execution failed: Execution aborted due to trap: 
wasm trap: wasm `unreachable` instruction executed

WASM backtrace:
    0: __rustc::rust_begin_unwind
    1: core::panicking::panic_fmt
    2: core::panicking::panic_explicit
    3: <pallet_revive::vm::evm::EVMInputs as revm_interpreter::interpreter_types::InputsTr>::target_address::panic_cold_explicit
    4: pallet_revive::vm::evm::instructions::host::sstore
    5: pallet_revive::vm::evm::call
    ...
```

### 4.2 Error Analysis

#### Root Cause
The error occurs when executing the `sstore` instruction, specifically triggering a panic when getting the target address.

#### Investigation Findings
**Conclusion**: REVM implementation is incomplete.

1. **Root Problem Location**
   - Critical issue found in the `InputsTr` trait implementation of `pallet_revive::vm::evm::EVMInputs`
   - The `target_address()` method is hardcoded to directly call `panic!()` (source line 332)
   - This is an unimplemented placeholder, not an actual functional implementation

2. **Error Trigger Chain**
   - EVM bytecode executes `sstore` instruction in PVM environment
   - `sstore` instruction needs to get target contract address
   - Calls `target_address()` method to get address
   - This method triggers `panic!()`, causing WASM `unreachable` instruction to be executed
   - Finally produces the WASM trap error we see