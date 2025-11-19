import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

const MintableERC20Module = buildModule("MintableERC20Module", (m) => {
  const name = m.getParameter("name", "name")

  const symbol = m.getParameter("symbol", "symbol")

  console.log(name, symbol)

  // For Substrate/PolkaVM deployments, the adapter should handle storage deposits
  // automatically. If you get "StorageDepositNotEnoughFunds" error, it may be an
  // adapter issue. Try deploying with a very high gas limit as a workaround.
  const token = m.contract("MintableERC20", [name, symbol], {
    // Set a very high gas limit (in gas units)
    // The adapter should use this to calculate storage deposit limits
    gasLimit: 500_000_000, // 500 million gas units
  })

  return { token }
})

export default MintableERC20Module
