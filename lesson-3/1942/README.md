## MintableERC20 - End-to-End (lesson-3/1942)

This is an end-to-end implementation of a mintable ERC20 token using Hardhat + TypeScript and OpenZeppelin.

### Features
- Standard ERC20 with 18 decimals
- Owner-only minting via `mint(address to, uint256 amount)`
- Constructor accepts name, symbol, initialSupply, initialReceiver

### Project Structure
- `contracts/MintableERC20.sol` — ERC20 implementation
- `test/MintableERC20.ts` — unit tests (mocha + chai)
- `scripts/deploy.ts` — deployment script
- `scripts/mint.ts` — mint tokens as owner
- `scripts/transfer.ts` — transfer tokens
- `hardhat.config.ts` — Hardhat configuration

### Prerequisites
- Node.js >= 18
- pnpm / npm / yarn

### Install
```bash
cd lesson-3/1942
pnpm install # or npm install / yarn
```

### Compile
```bash
pnpm compile
```

### Test
```bash
pnpm test
```

### Local Deploy (Hardhat network)
```bash
pnpm deploy
```
Optional environment variables:
- `TOKEN_NAME` (default: "Mintable Token")
- `TOKEN_SYMBOL` (default: "MINT")
- `TOKEN_DECIMALS` (default: 18)
- `INIT_SUPPLY` (default: "1000") — human units, e.g. "1000"
- `INIT_RECEIVER` (default: deployer)

### Testnet Deploy (example: Sepolia)
Create `.env`:
```
PRIVATE_KEY=0xabc...    # deployer private key
RPC_URL=https://sepolia.infura.io/v3/<your-key>
```
Then:
```bash
pnpm hardhat run scripts/deploy.ts --network sepolia
```

### Mint
```bash
TOKEN_ADDRESS=0xYourToken TO=0xRecipient AMOUNT=25 TOKEN_DECIMALS=18 pnpm mint
```

### Transfer
```bash
TOKEN_ADDRESS=0xYourToken TO=0xRecipient AMOUNT=10 TOKEN_DECIMALS=18 pnpm transfer
```

### Notes
- OpenZeppelin v5 `Ownable` is used (`Ownable(msg.sender)` in constructor).
- For non-18 decimals, adjust `TOKEN_DECIMALS` in env and human amounts will be parsed accordingly.


