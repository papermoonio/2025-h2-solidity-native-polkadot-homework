# Screenshots

This folder contains screenshots of test results and deployment outputs.

## Suggested Screenshots

### Local Testing
1. **Test Results Summary**
   - Run: `forge test -vv`
   - Capture: Full test output showing all passing tests

2. **Detailed Test Traces**
   - Run: `forge test -vvvv`
   - Capture: Detailed execution traces for each test

3. **Individual Test Results**
   - Run: `forge test --match-test test_admin_change_and_protection -vvvv`
   - Capture: Specific test execution details

4. **Gas Report**
   - Run: `forge test --gas-report`
   - Capture: Gas usage for each test

### Deployment (if successful)
1. **Deployment Script Output**
   - Run: `forge script script/DeployProxy.s.sol:DeployProxy --rpc-url paseo --broadcast -vvvv`
   - Capture: Deployment addresses and transaction hashes

2. **Contract Addresses**
   - LogicV1 address
   - Proxy address
   - Admin address

## How to Take Screenshots

### On macOS:
- Press `Cmd + Shift + 4` to capture a selection
- Press `Cmd + Shift + 3` to capture full screen
- Press `Cmd + Shift + 4` then `Space` to capture a window

### Save Format:
- Save screenshots with descriptive names:
  - `test-results-summary.png`
  - `test-detailed-traces.png`
  - `deployment-output.png`
  - etc.

