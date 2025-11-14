import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

export default buildModule("MintableERC20", (m) => {
  const token = m.contract("MintableERC20", ["Alpha", "ALPHA"]);

  return { token };
});


