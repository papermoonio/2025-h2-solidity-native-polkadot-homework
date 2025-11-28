import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 部署MintableERC20合约的Ignition模块
export default buildModule("MintableERC20Module", (m) => {
  // 代币基本信息
  const name = m.getParameter("name", "Student1921Token");
  const symbol = m.getParameter("symbol", "S1921");
  
  // 部署合约
  const mintableERC20 = m.contract("MintableERC20", [name, symbol]);
  
  // 设置铸造间隔为60秒（1分钟）
  m.call(mintableERC20, "setInterval", [60]);
  
  return {
    mintableERC20
  };
});
