import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  console.log("hre:", typeof hre);
  console.log("hre keys:", Object.keys(hre));
  console.log("hre.ethers:", typeof hre.ethers);
  console.log("Direct ethers version:", ethers.version);

  // Create a provider for hardhat network
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  try {
    const network = await provider.getNetwork();
    console.log("Connected to network:", network.name, "chainId:", network.chainId);
    
    // Get test accounts
    const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    console.log("Test account address:", signer.address);
    
    const balance = await provider.getBalance(signer.address);
    console.log("Test account balance:", ethers.formatEther(balance), "ETH");
    
  } catch (error) {
    console.log("Network connection failed:", error.message);
    console.log("Make sure to start hardhat node with: npx hardhat node");
  }

  // Try accessing hre.ethers one more time after requiring network
  if (hre.ethers) {
    console.log("hre.ethers is now available!");
    const signers = await hre.ethers.getSigners();
    console.log("Number of signers from hre:", signers.length);
  } else {
    console.log("hre.ethers is still not available, but direct ethers works fine");
  }
}

main().catch(console.error);
