# MintableERC20 Frontend Application

This is the frontend interface for interacting with the MintableERC20 smart contract on the Polkadot Asset Hub TestNet.

## Setup Instructions

1. First, deploy your MintableERC20 contract to the Polkadot Asset Hub TestNet using Hardhat:
   ```
   npx hardhat ignition deploy ./ignition/modules/Counter.ts --network assethub
   ```

2. Once deployed, copy the contract address from the deployment output.

3. Update the contract address in [ethereum/addresses.json](file:///c:/project/mine/web3/polkadot/remote/2025-h2-solidity-native-polkadot-homework/lesson-3/2040/front/my-app/ethereum/addresses.json):
   ```json
   {
     "alpha": "YOUR_ACTUAL_DEPLOYED_CONTRACT_ADDRESS"
   }
   ```

4. Install dependencies:
   ```
   npm install
   ```

5. Run the development server:
   ```
   npm run dev
   ```

## Features

- Connect with MetaMask wallet
- View token balances
- Mint tokens (100 tokens per hour)
- Add tokens to MetaMask

## Contract Functions

The interface interacts with these functions from the MintableERC20 contract:

- `mintToken()` - Mints 100 tokens to the caller (once per hour)
- `canMint(address)` - Checks if an address can mint tokens
- `balanceOf(address)` - Gets token balance of an address
- `symbol()` - Gets token symbol
- `decimals()` - Gets token decimals

## Troubleshooting

If you encounter issues:

1. Make sure you're connected to the correct network (Polkadot Asset Hub TestNet)
2. Verify that the contract address in [addresses.json](file:///c:/project/mine/web3/polkadot/remote/2025-h2-solidity-native-polkadot-homework/lesson-3/2040/front/my-app/ethereum/addresses.json) is correct
3. Check browser console for any error messages
4. Ensure MetaMask is installed and unlocked