import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MintableERC20Module", (m) => {
  // 部署参数，与前端定义保持一致
  const tokenName = "Alpha";
  const tokenSymbol = "ALPHA";

  // 部署MintableERC20合约
  const mintableERC20 = m.contract("MintableERC20", [tokenName, tokenSymbol]);

  return { mintableERC20 };
});