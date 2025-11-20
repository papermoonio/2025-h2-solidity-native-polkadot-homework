import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyToken", function () {
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  const initialSupply = 1000000n;
  const tokenName = "MyDemoToken";
  const tokenSymbol = "MDT";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    token = await ethers.deployContract("MyToken", [
      tokenName,
      tokenSymbol,
      initialSupply,
    ]);
  });

  describe("Deployment", function () {
    it("Should set the right name", async function () {
      expect(await token.name()).to.equal(tokenName);
    });

    it("Should set the right symbol", async function () {
      expect(await token.symbol()).to.equal(tokenSymbol);
    });

    it("Should set the right decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      const totalSupply = await token.totalSupply();
      expect(ownerBalance).to.equal(totalSupply);
      expect(totalSupply).to.equal(initialSupply * 10n ** 18n);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = 1000n * 10n ** 18n;
      
      await token.transfer(addr1.address, transferAmount);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount);

      await token.connect(addr1).transfer(addr2.address, transferAmount);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const transferAmount = initialOwnerBalance + 1n;

      await expect(
        token.transfer(addr1.address, transferAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should fail if transfer to zero address", async function () {
      await expect(
        token.transfer(ethers.ZeroAddress, 1000n)
      ).to.be.revertedWith("Transfer to zero address");
    });

    it("Should update balances after transfers", async function () {
      const transferAmount1 = 1000n * 10n ** 18n;
      const transferAmount2 = 500n * 10n ** 18n;

      const initialOwnerBalance = await token.balanceOf(owner.address);

      await token.transfer(addr1.address, transferAmount1);
      await token.transfer(addr2.address, transferAmount2);

      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance - transferAmount1 - transferAmount2
      );

      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount1);

      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(transferAmount2);
    });

    it("Should emit Transfer event", async function () {
      const transferAmount = 1000n * 10n ** 18n;
      
      await expect(token.transfer(addr1.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);
    });
  });

  describe("Approval", function () {
    it("Should allow spender to spend tokens", async function () {
      const approveAmount = 5000n * 10n ** 18n;
      
      await token.approve(addr1.address, approveAmount);
      const allowance = await token.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(approveAmount);
    });

    it("Should emit Approval event", async function () {
      const approveAmount = 5000n * 10n ** 18n;
      
      await expect(token.approve(addr1.address, approveAmount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, approveAmount);
    });

    it("Should fail if approve to zero address", async function () {
      await expect(
        token.approve(ethers.ZeroAddress, 1000n)
      ).to.be.revertedWith("Approve to zero address");
    });
  });

  describe("transferFrom", function () {
    it("Should transfer tokens using transferFrom", async function () {
      const approveAmount = 5000n * 10n ** 18n;
      const transferAmount = 3000n * 10n ** 18n;

      await token.approve(addr1.address, approveAmount);
      await token.connect(addr1).transferFrom(
        owner.address,
        addr2.address,
        transferAmount
      );

      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(transferAmount);

      const allowance = await token.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(approveAmount - transferAmount);
    });

    it("Should fail if insufficient balance for transferFrom", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      const approveAmount = ownerBalance + 1n;

      await token.approve(addr1.address, approveAmount);
      
      await expect(
        token.connect(addr1).transferFrom(
          owner.address,
          addr2.address,
          approveAmount
        )
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should fail if insufficient allowance for transferFrom", async function () {
      const approveAmount = 1000n * 10n ** 18n;
      const transferAmount = 2000n * 10n ** 18n;

      await token.approve(addr1.address, approveAmount);
      
      await expect(
        token.connect(addr1).transferFrom(
          owner.address,
          addr2.address,
          transferAmount
        )
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("Should emit Transfer event for transferFrom", async function () {
      const approveAmount = 5000n * 10n ** 18n;
      const transferAmount = 3000n * 10n ** 18n;

      await token.approve(addr1.address, approveAmount);
      
      await expect(
        token.connect(addr1).transferFrom(
          owner.address,
          addr2.address,
          transferAmount
        )
      )
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr2.address, transferAmount);
    });
  });
});
