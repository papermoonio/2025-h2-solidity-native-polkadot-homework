import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 部署模块：用于部署 SimpleERC20 合约
// - 可传入三个参数：
//   name:  代币名称（默认 "My Token"）
//   symbol: 代币符号（默认 "MTK"）
//   initialSupply: 初始供应量（最小单位，默认 1_000_000 ether）
// - 返回：token 合约实例，包含部署地址等信息
export default buildModule("SimpleERC20Module", (m) => {
  // 读取或设置部署参数
  const name = m.getParameter("name", "My Token");
  const symbol = m.getParameter("symbol", "MTK");
  const initialSupply = m.getParameter("initialSupply", 1_000_000n * 10n ** 18n);

  // 部署合约并传入构造参数
  const token = m.contract("SimpleERC20", [name, symbol, initialSupply]);

  // 导出部署产物，便于后续脚本使用
  return { token };
});


