import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { PolkadotERC20 } from "../typechain-types";

describe("PolkadotERC20", function () {
  let token: PolkadotERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let spender: Signer;
  
  const TOKEN_NAME = "Polkadot Test Token";
  const TOKEN_SYMBOL = "PDOT";
  const DECIMALS = 18;
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 100萬代幣

  beforeEach(async function () {
    [owner, user1, user2, spender] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("PolkadotERC20");
    token = await TokenFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      DECIMALS,
      INITIAL_SUPPLY
    );
  });

  describe("部署和基本資訊", function () {
    it("應該正確設置代幣名稱", async function () {
      expect(await token.name()).to.equal(TOKEN_NAME);
    });

    it("應該正確設置代幣符號", async function () {
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("應該正確設置小數位數", async function () {
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("應該正確設置總供應量", async function () {
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("應該將初始供應量分配給部署者", async function () {
      const ownerAddress = await owner.getAddress();
      expect(await token.balanceOf(ownerAddress)).to.equal(INITIAL_SUPPLY);
    });

    it("應該正確設置所有者", async function () {
      const ownerAddress = await owner.getAddress();
      expect(await token.owner()).to.equal(ownerAddress);
    });
  });

  describe("轉賬功能", function () {
    it("應該允許轉賬", async function () {
      const ownerAddress = await owner.getAddress();
      const user1Address = await user1.getAddress();
      
      const transferAmount = ethers.parseEther("1000");
      const ownerInitialBalance = await token.balanceOf(ownerAddress);
      const user1InitialBalance = await token.balanceOf(user1Address);

      await token.connect(owner).transfer(user1Address, transferAmount);

      expect(await token.balanceOf(ownerAddress)).to.equal(
        ownerInitialBalance - transferAmount
      );
      expect(await token.balanceOf(user1Address)).to.equal(
        user1InitialBalance + transferAmount
      );
    });

    it("應該在轉賬時發射Transfer事件", async function () {
      const ownerAddress = await owner.getAddress();
      const user1Address = await user1.getAddress();
      const transferAmount = ethers.parseEther("1000");

      await expect(token.connect(owner).transfer(user1Address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, user1Address, transferAmount);
    });

    it("應該拒絕轉賬到零地址", async function () {
      const transferAmount = ethers.parseEther("1000");

      await expect(
        token.connect(owner).transfer(ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("應該拒絕超過餘額的轉賬", async function () {
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();
      const transferAmount = ethers.parseEther("1000");

      await expect(
        token.connect(user1).transfer(user2Address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("授權功能", function () {
    it("應該允許授權", async function () {
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await spender.getAddress();
      const allowanceAmount = ethers.parseEther("5000");

      await token.connect(owner).approve(spenderAddress, allowanceAmount);

      expect(await token.allowance(ownerAddress, spenderAddress)).to.equal(
        allowanceAmount
      );
    });

    it("應該在授權時發射Approval事件", async function () {
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await spender.getAddress();
      const allowanceAmount = ethers.parseEther("5000");

      await expect(token.connect(owner).approve(spenderAddress, allowanceAmount))
        .to.emit(token, "Approval")
        .withArgs(ownerAddress, spenderAddress, allowanceAmount);
    });

    it("應該允許從授權地址轉賬", async function () {
      const ownerAddress = await owner.getAddress();
      const user2Address = await user2.getAddress();
      const spenderAddress = await spender.getAddress();
      
      const allowanceAmount = ethers.parseEther("5000");
      const transferAmount = ethers.parseEther("3000");

      // 先授權
      await token.connect(owner).approve(spenderAddress, allowanceAmount);

      const ownerInitialBalance = await token.balanceOf(ownerAddress);
      const user2InitialBalance = await token.balanceOf(user2Address);

      // 使用spender執行transferFrom
      await token.connect(spender).transferFrom(ownerAddress, user2Address, transferAmount);

      // 檢查餘額變化
      expect(await token.balanceOf(ownerAddress)).to.equal(
        ownerInitialBalance - transferAmount
      );
      expect(await token.balanceOf(user2Address)).to.equal(
        user2InitialBalance + transferAmount
      );

      // 檢查授權額度減少
      expect(await token.allowance(ownerAddress, spenderAddress)).to.equal(
        allowanceAmount - transferAmount
      );
    });

    it("應該拒絕超過授權額度的transferFrom", async function () {
      const ownerAddress = await owner.getAddress();
      const user2Address = await user2.getAddress();
      const spenderAddress = await spender.getAddress();
      
      const allowanceAmount = ethers.parseEther("1000");
      const transferAmount = ethers.parseEther("2000");

      // 先授權
      await token.connect(owner).approve(spenderAddress, allowanceAmount);

      // 嘗試轉賬超過授權額度
      await expect(
        token.connect(spender).transferFrom(ownerAddress, user2Address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("應該處理最大授權額度", async function () {
      const ownerAddress = await owner.getAddress();
      const user2Address = await user2.getAddress();
      const spenderAddress = await spender.getAddress();
      
      const maxAllowance = ethers.MaxUint256;
      const transferAmount = ethers.parseEther("1000");

      // 設置最大授權
      await token.connect(owner).approve(spenderAddress, maxAllowance);

      // 執行transferFrom
      await token.connect(spender).transferFrom(ownerAddress, user2Address, transferAmount);

      // 授權額度應該保持不變
      expect(await token.allowance(ownerAddress, spenderAddress)).to.equal(maxAllowance);
    });
  });

  describe("鑄幣功能", function () {
    it("應該允許所有者鑄幣", async function () {
      const user1Address = await user1.getAddress();
      const mintAmount = ethers.parseEther("50000");

      const initialTotalSupply = await token.totalSupply();
      const user1InitialBalance = await token.balanceOf(user1Address);

      await token.connect(owner).mint(user1Address, mintAmount);

      expect(await token.totalSupply()).to.equal(initialTotalSupply + mintAmount);
      expect(await token.balanceOf(user1Address)).to.equal(user1InitialBalance + mintAmount);
    });

    it("應該在鑄幣時發射Transfer事件", async function () {
      const user1Address = await user1.getAddress();
      const mintAmount = ethers.parseEther("50000");

      await expect(token.connect(owner).mint(user1Address, mintAmount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1Address, mintAmount);
    });

    it("應該拒絕非所有者鑄幣", async function () {
      const user1Address = await user1.getAddress();
      const mintAmount = ethers.parseEther("50000");

      await expect(
        token.connect(user1).mint(user1Address, mintAmount)
      ).to.be.revertedWith("ERC20: only owner can mint");
    });

    it("應該拒絕鑄幣到零地址", async function () {
      const mintAmount = ethers.parseEther("50000");

      await expect(
        token.connect(owner).mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWith("ERC20: mint to the zero address");
    });
  });

  describe("銷毀功能", function () {
    it("應該允許銷毀代幣", async function () {
      const user1Address = await user1.getAddress();
      const transferAmount = ethers.parseEther("10000");
      const burnAmount = ethers.parseEther("5000");

      // 先給user1一些代幣
      await token.connect(owner).transfer(user1Address, transferAmount);

      const initialTotalSupply = await token.totalSupply();
      const user1InitialBalance = await token.balanceOf(user1Address);

      // user1銷毀部分代幣
      await token.connect(user1).burn(burnAmount);

      expect(await token.totalSupply()).to.equal(initialTotalSupply - burnAmount);
      expect(await token.balanceOf(user1Address)).to.equal(user1InitialBalance - burnAmount);
    });

    it("應該在銷毀時發射Transfer事件", async function () {
      const user1Address = await user1.getAddress();
      const transferAmount = ethers.parseEther("10000");
      const burnAmount = ethers.parseEther("5000");

      // 先給user1一些代幣
      await token.connect(owner).transfer(user1Address, transferAmount);

      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1Address, ethers.ZeroAddress, burnAmount);
    });

    it("應該拒絕銷毀超過餘額的代幣", async function () {
      const user1Address = await user1.getAddress();
      const burnAmount = ethers.parseEther("1000");

      await expect(
        token.connect(user1).burn(burnAmount)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });

  describe("所有權管理", function () {
    it("應該允許所有者轉移所有權", async function () {
      const user1Address = await user1.getAddress();

      await token.connect(owner).transferOwnership(user1Address);

      expect(await token.owner()).to.equal(user1Address);
    });

    it("應該拒絕非所有者轉移所有權", async function () {
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();

      await expect(
        token.connect(user1).transferOwnership(user2Address)
      ).to.be.revertedWith("ERC20: only owner can transfer ownership");
    });

    it("應該拒絕轉移所有權到零地址", async function () {
      await expect(
        token.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("ERC20: new owner is the zero address");
    });
  });

  describe("邊界情況", function () {
    it("應該處理最大金額轉賬", async function () {
      const ownerAddress = await owner.getAddress();
      const user1Address = await user1.getAddress();
      
      const ownerBalance = await token.balanceOf(ownerAddress);

      await token.connect(owner).transfer(user1Address, ownerBalance);

      expect(await token.balanceOf(ownerAddress)).to.equal(0);
      expect(await token.balanceOf(user1Address)).to.equal(ownerBalance);
    });

    it("應該處理零金額轉賬", async function () {
      const ownerAddress = await owner.getAddress();
      const user1Address = await user1.getAddress();
      
      const ownerInitialBalance = await token.balanceOf(ownerAddress);
      const user1InitialBalance = await token.balanceOf(user1Address);

      // 零金額轉賬應該成功
      await token.connect(owner).transfer(user1Address, 0);

      expect(await token.balanceOf(ownerAddress)).to.equal(ownerInitialBalance);
      expect(await token.balanceOf(user1Address)).to.equal(user1InitialBalance);
    });

    it("應該處理零金額授權", async function () {
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await spender.getAddress();

      await token.connect(owner).approve(spenderAddress, 0);

      expect(await token.allowance(ownerAddress, spenderAddress)).to.equal(0);
    });
  });
});