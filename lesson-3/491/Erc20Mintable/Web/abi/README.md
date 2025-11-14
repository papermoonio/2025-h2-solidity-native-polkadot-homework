# ABI Files

This directory should contain the compiled contract ABI JSON files from the Contracts project.

After compiling the contracts in the `../Contracts` directory, copy the ABI file here:

```bash
cp ../Contracts/artifacts/contracts/MintableERC20.sol/MintableERC20.json ./abi/MintableERC20.json
```

The ABI file structure should be:
```json
{
  "abi": [...],
  ...
}
```

