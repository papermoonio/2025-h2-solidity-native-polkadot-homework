const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyERC20", function () {
  let token;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  const initialSupply = ethers.parseUnits("1000000", 18); // 1,000,000 tokens with 18 decimals

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const MyERC20 = await ethers.getContractFactory("MyERC20");
    token = await MyERC20.deploy(
      "My Token",
      "MTK",
      18,
      initialSupply
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name", async function () {
      expect(await token.name()).to.equal("My Token");
    });

    it("Should set the right symbol", async function () {
      expect(await token.symbol()).to.equal("MTK");
    });

    it("Should set the right decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
      expect(ownerBalance).to.equal(initialSupply);
    });
  });

  describe("totalSupply", function () {
    it("Should return the total supply", async function () {
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("Should return the same total supply after transfers", async function () {
      await token.transfer(addr1.address, ethers.parseUnits("100", 18));
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });

  describe("balanceOf", function () {
    it("Should return the correct balance for owner", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("Should return zero balance for empty address", async function () {
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should return correct balance after transfer", async function () {
      const transferAmount = ethers.parseUnits("500", 18);
      await token.transfer(addr1.address, transferAmount);
      expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - transferAmount);
    });
  });

  describe("transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      await expect(token.transfer(addr1.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);

      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount);

      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply - transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const transferAmount = ethers.parseUnits("2000000", 18); // More than initial supply
      
      await expect(
        token.transfer(addr1.address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient balance");
    });

    it("Should fail when transferring to zero address", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      await expect(
        token.transfer(ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("Should update balances after multiple transfers", async function () {
      const transfer1 = ethers.parseUnits("100", 18);
      const transfer2 = ethers.parseUnits("200", 18);
      
      await token.transfer(addr1.address, transfer1);
      await token.transfer(addr2.address, transfer2);
      
      expect(await token.balanceOf(addr1.address)).to.equal(transfer1);
      expect(await token.balanceOf(addr2.address)).to.equal(transfer2);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - transfer1 - transfer2);
    });
  });

  describe("approve", function () {
    it("Should set the right allowance", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      
      await expect(token.approve(addr1.address, allowanceAmount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, allowanceAmount);

      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowanceAmount);
    });

    it("Should fail when approving to zero address", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      
      await expect(
        token.approve(ethers.ZeroAddress, allowanceAmount)
      ).to.be.revertedWith("ERC20: approve to the zero address");
    });

    it("Should allow multiple approvals", async function () {
      const allowance1 = ethers.parseUnits("1000", 18);
      const allowance2 = ethers.parseUnits("2000", 18);
      
      await token.approve(addr1.address, allowance1);
      await token.approve(addr2.address, allowance2);
      
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowance1);
      expect(await token.allowance(owner.address, addr2.address)).to.equal(allowance2);
    });

    it("Should update allowance when approving again", async function () {
      const allowance1 = ethers.parseUnits("1000", 18);
      const allowance2 = ethers.parseUnits("2000", 18);
      
      await token.approve(addr1.address, allowance1);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowance1);
      
      await token.approve(addr1.address, allowance2);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowance2);
    });
  });

  describe("allowance", function () {
    it("Should return zero for unset allowance", async function () {
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
    });

    it("Should return the correct allowance", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      await token.approve(addr1.address, allowanceAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowanceAmount);
    });

    it("Should return zero allowance after transferFrom uses it all", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      await token.approve(addr1.address, allowanceAmount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, allowanceAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
    });

    it("Should return correct allowance after partial transferFrom", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      const transferAmount = ethers.parseUnits("300", 18);
      await token.approve(addr1.address, allowanceAmount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowanceAmount - transferAmount);
    });
  });

  describe("transferFrom", function () {
    it("Should transfer tokens using allowance", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      const transferAmount = ethers.parseUnits("500", 18);
      
      await token.approve(addr1.address, allowanceAmount);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      )
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr2.address, transferAmount);

      expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - transferAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowanceAmount - transferAmount);
    });

    it("Should fail if allowance is insufficient", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      const transferAmount = ethers.parseUnits("2000", 18);
      
      await token.approve(addr1.address, allowanceAmount);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should fail if balance is insufficient", async function () {
      const allowanceAmount = ethers.parseUnits("2000000", 18); // More than initial supply
      const transferAmount = ethers.parseUnits("2000000", 18);
      
      await token.approve(addr1.address, allowanceAmount);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient balance");
    });

    it("Should fail when transferring from zero address", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      await expect(
        token.transferFrom(ethers.ZeroAddress, addr1.address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer from the zero address");
    });

    it("Should fail when transferring to zero address", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      const transferAmount = ethers.parseUnits("100", 18);
      
      await token.approve(addr1.address, allowanceAmount);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("Should allow multiple transferFrom calls", async function () {
      const allowanceAmount = ethers.parseUnits("1000", 18);
      const transfer1 = ethers.parseUnits("300", 18);
      const transfer2 = ethers.parseUnits("200", 18);
      
      await token.approve(addr1.address, allowanceAmount);
      
      await token.connect(addr1).transferFrom(owner.address, addr2.address, transfer1);
      await token.connect(addr1).transferFrom(owner.address, addr3.address, transfer2);
      
      expect(await token.balanceOf(addr2.address)).to.equal(transfer1);
      expect(await token.balanceOf(addr3.address)).to.equal(transfer2);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowanceAmount - transfer1 - transfer2);
    });

    it("Should not allow transferFrom without approval", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Integration tests", function () {
    it("Should handle complete workflow: approve, transferFrom, transfer", async function () {
      // Owner approves addr1
      const allowanceAmount = ethers.parseUnits("10000", 18);
      await token.approve(addr1.address, allowanceAmount);
      
      // addr1 transfers to addr2
      const transferFromAmount = ethers.parseUnits("5000", 18);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, transferFromAmount);
      
      // addr2 transfers to addr3
      const transferAmount = ethers.parseUnits("2000", 18);
      await token.connect(addr2).transfer(addr3.address, transferAmount);
      
      // Verify final balances
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - transferFromAmount);
      expect(await token.balanceOf(addr2.address)).to.equal(transferFromAmount - transferAmount);
      expect(await token.balanceOf(addr3.address)).to.equal(transferAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(allowanceAmount - transferFromAmount);
    });

    it("Should maintain total supply constant through all operations", async function () {
      const allowanceAmount = ethers.parseUnits("50000", 18);
      await token.approve(addr1.address, allowanceAmount);
      
      await token.transfer(addr2.address, ethers.parseUnits("10000", 18));
      await token.connect(addr1).transferFrom(owner.address, addr3.address, ethers.parseUnits("20000", 18));
      await token.connect(addr2).transfer(addr3.address, ethers.parseUnits("5000", 18));
      
      const totalBalance = 
        (await token.balanceOf(owner.address)) +
        (await token.balanceOf(addr1.address)) +
        (await token.balanceOf(addr2.address)) +
        (await token.balanceOf(addr3.address));
      
      expect(totalBalance).to.equal(await token.totalSupply());
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });
});

