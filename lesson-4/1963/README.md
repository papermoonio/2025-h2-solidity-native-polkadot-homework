# EIP-1967 Proxy Implementation

## Overview
This submission implements an EIP-1967 compliant upgradeable proxy pattern with:
- Proxy contract using delegatecall
- Upgrade functionality with admin control
- State persistence across upgrades
- Access control protection

## Project Structure
```
src/
  - ERC1967Proxy.sol    # Main proxy contract
  - LogicV1.sol         # Initial implementation
  - LogicV2.sol          # Upgraded implementation

test/
  - ProxyUpgradeTest.t.sol  # Comprehensive test suite

script/
  - DeployProxy.s.sol   # Deployment script
```

## Test Results
All tests pass successfully:
- ✅ test_initial_delegatecall_behavior
- ✅ test_upgrade_to_v2_and_persist_state  
- ✅ test_admin_change_and_protection

Run tests with: `forge test -vv`

## Key Features
1. **EIP-1967 Compliance**: Uses standard storage slots for implementation and admin
2. **Upgrade Mechanism**: Admin-controlled implementation upgrades
3. **State Persistence**: Storage preserved across upgrades
4. **Access Control**: Only admin can upgrade or change admin

## Screenshots
See `screenshots/` folder for test results and execution traces.

## Deployment
Deployment script available in `script/DeployProxy.s.sol`

```bash
forge script script/DeployProxy.s.sol:DeployProxy --rpc-url <RPC_URL> --broadcast --private-key <PRIVATE_KEY>
```

