import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys MintableERC20 with configurable name, symbol and mint interval (seconds)
export default buildModule("MintableERC20Module", (m) => {
  const name = m.getParameter("name", "LKZToken");
  const symbol = m.getParameter("symbol", "LKZ");
  const interval = m.getParameter("interval", 60n); // default 1 hour

  const token = m.contract("MintableERC20", [name, symbol]);

  // Deployer is owner; set custom interval if desired
  m.call(token, "setInterval", [interval]);

  return { token };
});
