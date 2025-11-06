# MintableERC20 Contract Submission - Student 1963

## Overview
This submission contains a complete implementation of a MintableERC20 token contract deployed on Polkadot PAsset Hub testnet.

## Contract Address
- **Alpha Token**: `0x7520CD56FD81e6E3Ac32115941dfcb7BAfE11813`
- **Network**: PAsset Hub Testnet (Chain ID: 420420422)
- **Explorer**: https://blockscout-passet-hub.parity-testnet.parity.io/address/0x7520CD56FD81e6E3Ac32115941dfcb7BAfE11813

## Project Structure

```
1963/
├── contracts/
│   └── MintableERC20.sol          # Main ERC20 token contract
├── ignition/
│   └── modules/
│       └── MintableERC20.ts       # Hardhat Ignition deployment module
├── scripts/
│   └── deploy.ts                   # Deployment script
├── hardhat.config.ts              # Hardhat configuration
├── package.json                   # Project dependencies
├── parameters.json                # Deployment parameters
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## Contract Features

The MintableERC20 contract includes:

1. **Standard ERC20 Functionality**
   - Transfer tokens
   - Check balances
   - Approve spending

2. **Minting Features**
   - Public minting with cooldown (1 hour interval)
   - Owner-only minting function
   - Check if address can mint

3. **Owner Functions**
   - Owner can mint to any address
   - Owner can change minting interval

## Deployment

### Prerequisites
- Node.js installed
- Testnet tokens in wallet (from PAsset Hub faucet)
- `.env` file with `PRIVATE_KEY` set

### Deployment Commands

**Using Hardhat Ignition:**
```bash
npx hardhat ignition deploy ./ignition/modules/MintableERC20.ts --network passetHub --parameters parameters.json
```

**Using Deployment Script:**
```bash
# Deploy Beta (default)
npx hardhat run scripts/deploy.ts --network passetHub

# Deploy with custom name/symbol
TOKEN_NAME=Gamma TOKEN_SYMBOL=GAMMA npx hardhat run scripts/deploy.ts --network passetHub
```

## Network Configuration

The project is configured for:
- **PAsset Hub Testnet**: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- **Chain ID**: `420420422`
- **Compiler**: Solidity 0.8.20 (compatible with resolc 0.8.26)

## Installation

After cloning, install dependencies:
```bash
npm install
# or
pnpm install
```

## Screenshots

Please see the screenshots folder for:
- Deployment transaction confirmation
- Contract verification on explorer
- Successful deployment output

## Notes

- The contract uses OpenZeppelin's ERC20 implementation
- Compiler version is set to 0.8.20 to match resolc (Polkadot Solidity compiler) compatibility
- Gas limit is set to 500 million to handle Substrate storage deposits

