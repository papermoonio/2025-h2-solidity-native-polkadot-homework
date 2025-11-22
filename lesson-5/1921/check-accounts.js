const hre = require("hardhat");

async function main() {
  console.log("\n=== Checking Available Accounts ===\n");
  console.log("Network:", hre.network.name);
  console.log("PolkaVM mode:", hre.network.config.polkavm ? "YES" : "NO");
  console.log("");

  const signers = await hre.ethers.getSigners();
  
  console.log(`Total accounts available: ${signers.length}\n`);
  
  for (let i = 0; i < Math.min(signers.length, 5); i++) {
    const signer = signers[i];
    const address = await signer.getAddress();
    const balance = await hre.ethers.provider.getBalance(address);
    console.log(`Account #${i}:`);
    console.log(`  Address: ${address}`);
    console.log(`  Balance: ${hre.ethers.formatEther(balance)} ETH`);
    console.log("");
  }
  
  if (signers.length > 5) {
    console.log(`... and ${signers.length - 5} more accounts\n`);
  }
  
  // Test what happens when we try to get "other"
  console.log("=== Testing [wallet, other] = await ethers.getSigners() ===\n");
  const [wallet, other] = signers;
  
  console.log("wallet:", wallet ? "✅ EXISTS" : "❌ UNDEFINED");
  console.log("other:", other ? "✅ EXISTS" : "❌ UNDEFINED");
  
  if (other) {
    console.log("\n✅ Second account is available - tests will pass!");
  } else {
    console.log("\n❌ Second account is NOT available - tests will fail!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
