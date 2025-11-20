import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyTokenModule", (m) => {
  const myToken = m.contract("MyToken", [
    "MyDemoToken",
    "MDT",
    1000000n, // Initial supply: 1,000,000 tokens
  ]);

  return { myToken };
});
