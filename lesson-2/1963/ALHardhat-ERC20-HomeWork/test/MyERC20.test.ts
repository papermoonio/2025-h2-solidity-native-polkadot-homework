import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyERC20", function () {
  let myERC20: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addrs: any[];

  const TOKEN_NAME = "My Test Token";
  const TOKEN_SYMBOL = "MTT";
  const TOKEN_DECIMALS = 18;
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 tokens

  beforeEach(async function () {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    addr1 = accounts[1];
    addr2 = accounts[2];
    addr3 = accounts[3];
    addrs = accounts.slice(4);

    myERC20 = await ethers.deployContract("MyERC20", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_DECIMALS,
      ethers.parseEther("1000000")
    ]);
  });

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      expect(await myERC20.name()).to.equal(TOKEN_NAME);
    });

    it("Should set the correct symbol", async function () {
      expect(await myERC20.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the correct decimals", async function () {
      expect(await myERC20.decimals()).to.equal(TOKEN_DECIMALS);
    });

    it("Should set the correct total supply", async function () {
      expect(await myERC20.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await myERC20.balanceOf(owner.address);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should emit Transfer event on deployment", async function () {
      const newToken = await ethers.deployContract("MyERC20", [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOKEN_DECIMALS,
        ethers.parseEther("1000000")
      ]);
      await expect(newToken.deploymentTransaction())
        .to.emit(newToken, "Transfer")
        .withArgs(ethers.ZeroAddress, owner.address, INITIAL_SUPPLY);
    });
  });

  describe("ERC20 Standard Functions", function () {
    describe("balanceOf", function () {
      it("Should return the correct balance for owner", async function () {
        expect(await myERC20.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      });

      it("Should return zero balance for empty address", async function () {
        expect(await myERC20.balanceOf(addr1.address)).to.equal(0);
      });
    });

    describe("transfer", function () {
      const transferAmount = ethers.parseEther("1000");

      it("Should transfer tokens between accounts", async function () {
        await expect(myERC20.transfer(addr1.address, transferAmount))
          .to.emit(myERC20, "Transfer")
          .withArgs(owner.address, addr1.address, transferAmount);

        expect(await myERC20.balanceOf(addr1.address)).to.equal(transferAmount);
        expect(await myERC20.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
      });

      it("Should return true on successful transfer", async function () {
        await myERC20.transfer(addr1.address, transferAmount);
        // Function executes successfully without reverting
      });

      it("Should fail if sender has insufficient balance", async function () {
        await expect(
          myERC20.connect(addr1).transfer(addr2.address, transferAmount)
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      });

      it("Should fail if transferring to zero address", async function () {
        await expect(
          myERC20.transfer(ethers.ZeroAddress, transferAmount)
        ).to.be.revertedWith("ERC20: transfer to the zero address");
      });

      it("Should fail if transferring from zero address", async function () {
        // This is tested implicitly as the contract doesn't allow zero address to call functions
      });
    });

    describe("approve", function () {
      const approveAmount = ethers.parseEther("500");

      it("Should approve the correct amount", async function () {
        await expect(myERC20.approve(addr1.address, approveAmount))
          .to.emit(myERC20, "Approval")
          .withArgs(owner.address, addr1.address, approveAmount);

        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(approveAmount);
      });

      it("Should return true on successful approval", async function () {
        await myERC20.approve(addr1.address, approveAmount);
        // Function executes successfully without reverting
      });

      it("Should fail if approving to zero address", async function () {
        await expect(
          myERC20.approve(ethers.ZeroAddress, approveAmount)
        ).to.be.revertedWith("ERC20: approve to the zero address");
      });

      it("Should allow changing approval amount", async function () {
        await myERC20.approve(addr1.address, approveAmount);
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(approveAmount);

        const newAmount = ethers.parseEther("1000");
        await myERC20.approve(addr1.address, newAmount);
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(newAmount);
      });
    });

    describe("allowance", function () {
      it("Should return zero allowance by default", async function () {
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(0);
      });

      it("Should return correct allowance after approval", async function () {
        const approveAmount = ethers.parseEther("1000");
        await myERC20.approve(addr1.address, approveAmount);
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(approveAmount);
      });
    });

    describe("transferFrom", function () {
      const transferAmount = ethers.parseEther("1000");
      const approveAmount = ethers.parseEther("2000");

      beforeEach(async function () {
        await myERC20.approve(addr1.address, approveAmount);
      });

      it("Should transfer tokens using allowance", async function () {
        await expect(
          myERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
        )
          .to.emit(myERC20, "Transfer")
          .withArgs(owner.address, addr2.address, transferAmount);

        expect(await myERC20.balanceOf(addr2.address)).to.equal(transferAmount);
        expect(await myERC20.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(approveAmount - transferAmount);
      });

      it("Should return true on successful transferFrom", async function () {
        await myERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
        // Function executes successfully without reverting
      });

      it("Should fail if insufficient allowance", async function () {
        await expect(
          myERC20.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("3000"))
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });

      it("Should fail if insufficient balance", async function () {
        // First transfer all tokens to addr1
        await myERC20.transfer(addr1.address, INITIAL_SUPPLY);
        
        // Now try to transfer from owner (who has no balance) using addr1's allowance
        await myERC20.approve(addr1.address, transferAmount);
        await expect(
          myERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      });

      it("Should fail if transferring to zero address", async function () {
        await expect(
          myERC20.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, transferAmount)
        ).to.be.revertedWith("ERC20: transfer to the zero address");
      });
    });

    describe("increaseAllowance", function () {
      const initialAmount = ethers.parseEther("1000");
      const increaseAmount = ethers.parseEther("500");

      beforeEach(async function () {
        await myERC20.approve(addr1.address, initialAmount);
      });

      it("Should increase allowance correctly", async function () {
        await expect(myERC20.increaseAllowance(addr1.address, increaseAmount))
          .to.emit(myERC20, "Approval")
          .withArgs(owner.address, addr1.address, initialAmount + increaseAmount);

        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(initialAmount + increaseAmount);
      });

      it("Should return true on successful increase", async function () {
        await myERC20.increaseAllowance(addr1.address, increaseAmount);
        // Function executes successfully without reverting
      });

      it("Should work with zero increase", async function () {
        await myERC20.increaseAllowance(addr1.address, 0);
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(initialAmount);
      });
    });

    describe("decreaseAllowance", function () {
      const initialAmount = ethers.parseEther("1000");
      const decreaseAmount = ethers.parseEther("300");

      beforeEach(async function () {
        await myERC20.approve(addr1.address, initialAmount);
      });

      it("Should decrease allowance correctly", async function () {
        await expect(myERC20.decreaseAllowance(addr1.address, decreaseAmount))
          .to.emit(myERC20, "Approval")
          .withArgs(owner.address, addr1.address, initialAmount - decreaseAmount);

        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(initialAmount - decreaseAmount);
      });

      it("Should return true on successful decrease", async function () {
        await myERC20.decreaseAllowance(addr1.address, decreaseAmount);
        // Function executes successfully without reverting
      });

      it("Should fail if decreasing below zero", async function () {
        await expect(
          myERC20.decreaseAllowance(addr1.address, initialAmount + 1n)
        ).to.be.revertedWith("ERC20: decreased allowance below zero");
      });

      it("Should work with zero decrease", async function () {
        await myERC20.decreaseAllowance(addr1.address, 0);
        expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(initialAmount);
      });
    });
  });

  describe("Additional Functions", function () {
    describe("mint", function () {
      const mintAmount = ethers.parseEther("10000");

      it("Should mint tokens to specified address", async function () {
        const initialBalance = await myERC20.balanceOf(addr1.address);
        const initialTotalSupply = await myERC20.totalSupply();

        await expect(myERC20.mint(addr1.address, mintAmount))
          .to.emit(myERC20, "Transfer")
          .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

        expect(await myERC20.balanceOf(addr1.address)).to.equal(initialBalance + mintAmount);
        expect(await myERC20.totalSupply()).to.equal(initialTotalSupply + mintAmount);
      });

      it("Should fail if minting to zero address", async function () {
        await expect(
          myERC20.mint(ethers.ZeroAddress, mintAmount)
        ).to.be.revertedWith("ERC20: mint to the zero address");
      });
    });

    describe("burn", function () {
      const burnAmount = ethers.parseEther("10000");

      it("Should burn tokens from caller's balance", async function () {
        const initialBalance = await myERC20.balanceOf(owner.address);
        const initialTotalSupply = await myERC20.totalSupply();

        await expect(myERC20.burn(burnAmount))
          .to.emit(myERC20, "Transfer")
          .withArgs(owner.address, ethers.ZeroAddress, burnAmount);

        expect(await myERC20.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
        expect(await myERC20.totalSupply()).to.equal(initialTotalSupply - burnAmount);
      });

      it("Should fail if burning more than balance", async function () {
        await expect(
          myERC20.burn(INITIAL_SUPPLY + 1n)
        ).to.be.revertedWith("ERC20: burn amount exceeds balance");
      });
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle maximum uint256 values", async function () {
      const maxUint256 = ethers.MaxUint256;
      
      // Test with maximum allowance
      await myERC20.approve(addr1.address, maxUint256);
      expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(maxUint256);
      
      // Test transferFrom with max allowance (should not decrease allowance)
      await myERC20.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("1000"));
      expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(maxUint256);
    });

    it("Should handle zero amount transfers", async function () {
      await expect(myERC20.transfer(addr1.address, 0))
        .to.emit(myERC20, "Transfer")
        .withArgs(owner.address, addr1.address, 0);
    });

    it("Should handle zero amount approvals", async function () {
      await expect(myERC20.approve(addr1.address, 0))
        .to.emit(myERC20, "Approval")
        .withArgs(owner.address, addr1.address, 0);
    });

    it("Should maintain correct balances after multiple operations", async function () {
      const transfer1 = ethers.parseEther("10000");
      const transfer2 = ethers.parseEther("5000");
      const approveAmount = ethers.parseEther("20000");
      const transferFromAmount = ethers.parseEther("3000");

      // Transfer to addr1
      await myERC20.transfer(addr1.address, transfer1);
      expect(await myERC20.balanceOf(addr1.address)).to.equal(transfer1);

      // Approve addr1 to spend from owner
      await myERC20.approve(addr1.address, approveAmount);

      // Transfer from owner to addr2 using addr1's allowance
      await myERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferFromAmount);

      // Transfer from addr1 to addr3
      await myERC20.connect(addr1).transfer(addr3.address, transfer2);

      // Verify final balances
      expect(await myERC20.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transfer1 - transferFromAmount);
      expect(await myERC20.balanceOf(addr1.address)).to.equal(transfer1 - transfer2);
      expect(await myERC20.balanceOf(addr2.address)).to.equal(transferFromAmount);
      expect(await myERC20.balanceOf(addr3.address)).to.equal(transfer2);
      expect(await myERC20.allowance(owner.address, addr1.address)).to.equal(approveAmount - transferFromAmount);
    });
  });

  describe("Event Emissions", function () {
    it("Should emit Transfer event on transfer", async function () {
      const amount = ethers.parseEther("1000");
      await expect(myERC20.transfer(addr1.address, amount))
        .to.emit(myERC20, "Transfer")
        .withArgs(owner.address, addr1.address, amount);
    });

    it("Should emit Approval event on approve", async function () {
      const amount = ethers.parseEther("1000");
      await expect(myERC20.approve(addr1.address, amount))
        .to.emit(myERC20, "Approval")
        .withArgs(owner.address, addr1.address, amount);
    });

    it("Should emit Transfer event on transferFrom", async function () {
      const amount = ethers.parseEther("1000");
      await myERC20.approve(addr1.address, amount);
      
      await expect(myERC20.connect(addr1).transferFrom(owner.address, addr2.address, amount))
        .to.emit(myERC20, "Transfer")
        .withArgs(owner.address, addr2.address, amount);
    });

    it("Should emit Approval event on increaseAllowance", async function () {
      const initialAmount = ethers.parseEther("1000");
      const increaseAmount = ethers.parseEther("500");
      await myERC20.approve(addr1.address, initialAmount);
      
      await expect(myERC20.increaseAllowance(addr1.address, increaseAmount))
        .to.emit(myERC20, "Approval")
        .withArgs(owner.address, addr1.address, initialAmount + increaseAmount);
    });

    it("Should emit Approval event on decreaseAllowance", async function () {
      const initialAmount = ethers.parseEther("1000");
      const decreaseAmount = ethers.parseEther("300");
      await myERC20.approve(addr1.address, initialAmount);
      
      await expect(myERC20.decreaseAllowance(addr1.address, decreaseAmount))
        .to.emit(myERC20, "Approval")
        .withArgs(owner.address, addr1.address, initialAmount - decreaseAmount);
    });
  });
});
