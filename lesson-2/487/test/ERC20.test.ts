import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20 Contract - 完整测试套件", function () {
  let token: Contract;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addr3: HardhatEthersSigner;

  const TOKEN_NAME = "Test Token";
  const TOKEN_SYMBOL = "TEST";
  const TOKEN_DECIMALS = 18;
  const INITIAL_SUPPLY = 1000000; // 100万个代币

  beforeEach(async function () {
    // 获取测试账户
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // 部署新的 ERC20 合约实例
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    token = await ERC20Factory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_DECIMALS,
      INITIAL_SUPPLY
    );
    await token.waitForDeployment();
  });

  describe("部署和初始化", function () {
    it("应该正确设置代币元数据", async function () {
      expect(await token.name()).to.equal(TOKEN_NAME);
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
    });

    it("应该正确设置总供应量", async function () {
      const expectedTotalSupply = BigInt(INITIAL_SUPPLY) * BigInt(10 ** TOKEN_DECIMALS);
      expect(await token.totalSupply()).to.equal(expectedTotalSupply);
    });

    it("应该将初始供应量分配给部署者", async function () {
      const expectedBalance = BigInt(INITIAL_SUPPLY) * BigInt(10 ** TOKEN_DECIMALS);
      expect(await token.balanceOf(owner.address)).to.equal(expectedBalance);
    });

    it("应该为新账户返回零余额", async function () {
      expect(await token.balanceOf(addr1.address)).to.equal(0n);
    });
  });

  describe("totalSupply() - 总供应量查询", function () {
    it("应该返回正确的总供应量", async function () {
      const expectedTotalSupply = BigInt(INITIAL_SUPPLY) * BigInt(10 ** TOKEN_DECIMALS);
      expect(await token.totalSupply()).to.equal(expectedTotalSupply);
    });

    it("应该在转账后总供应量保持不变", async function () {
      const initialTotalSupply = await token.totalSupply();
      await token.transfer(addr1.address, ethers.parseEther("100"));
      expect(await token.totalSupply()).to.equal(initialTotalSupply);
    });
  });

  describe("balanceOf() - 余额查询", function () {
    it("应该返回正确的账户余额", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      const expectedBalance = BigInt(INITIAL_SUPPLY) * BigInt(10 ** TOKEN_DECIMALS);
      expect(ownerBalance).to.equal(expectedBalance);
    });

    it("应该返回零地址的余额为零", async function () {
      expect(await token.balanceOf(ethers.ZeroAddress)).to.equal(0n);
    });

    it("应该在转账后正确更新余额", async function () {
      const transferAmount = ethers.parseEther("100");
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialAddr1Balance = await token.balanceOf(addr1.address);

      await token.transfer(addr1.address, transferAmount);

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance - transferAmount);
      expect(await token.balanceOf(addr1.address)).to.equal(initialAddr1Balance + transferAmount);
    });
  });

  describe("transfer() - 转账功能", function () {
    it("应该成功转移代币", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(token.transfer(addr1.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("应该更新发送者和接收者的余额", async function () {
      const transferAmount = ethers.parseEther("500");
      const initialOwnerBalance = await token.balanceOf(owner.address);

      await token.transfer(addr1.address, transferAmount);

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance - transferAmount);
      expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("应该返回 true", async function () {
      const transferAmount = ethers.parseEther("100");
      const tx = await token.transfer(addr1.address, transferAmount);
      await expect(tx).to.emit(token, "Transfer");
    });

    it("应该在余额不足时回滚", async function () {
      const transferAmount = ethers.parseEther("100");
      await token.transfer(addr1.address, transferAmount);

      // addr1 尝试转移超过其余额的数量
      const excessiveAmount = ethers.parseEther("101");
      await expect(token.connect(addr1).transfer(addr2.address, excessiveAmount))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("应该在转移到零地址时回滚", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(token.transfer(ethers.ZeroAddress, transferAmount))
        .to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("应该支持转移到自身", async function () {
      const transferAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(owner.address);
      
      await token.transfer(owner.address, transferAmount);
      
      // 余额应该保持不变
      expect(await token.balanceOf(owner.address)).to.equal(initialBalance);
    });

    it("应该支持多次转账", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      await token.transfer(addr1.address, amount1);
      await token.transfer(addr1.address, amount2);

      expect(await token.balanceOf(addr1.address)).to.equal(amount1 + amount2);
    });
  });

  describe("approve() - 授权功能", function () {
    it("应该成功设置授权额度", async function () {
      const approveAmount = ethers.parseEther("1000");
      
      await expect(token.approve(addr1.address, approveAmount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, approveAmount);

      expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount);
    });

    it("应该返回 true", async function () {
      const approveAmount = ethers.parseEther("1000");
      const tx = await token.approve(addr1.address, approveAmount);
      await expect(tx).to.emit(token, "Approval");
    });

    it("应该在授权零地址时回滚", async function () {
      const approveAmount = ethers.parseEther("1000");
      await expect(token.approve(ethers.ZeroAddress, approveAmount))
        .to.be.revertedWith("ERC20: approve to the zero address");
    });

    it("应该允许更新授权额度", async function () {
      const firstAmount = ethers.parseEther("1000");
      const secondAmount = ethers.parseEther("2000");

      await token.approve(addr1.address, firstAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(firstAmount);

      await token.approve(addr1.address, secondAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(secondAmount);
    });

    it("应该允许将授权额度设置为零", async function () {
      const approveAmount = ethers.parseEther("1000");
      await token.approve(addr1.address, approveAmount);
      await token.approve(addr1.address, 0n);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0n);
    });

    it("应该允许多个账户授权同一个 spender", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      await token.transfer(addr1.address, amount1);
      await token.transfer(addr2.address, amount2);

      await token.connect(addr1).approve(addr3.address, amount1);
      await token.connect(addr2).approve(addr3.address, amount2);

      expect(await token.allowance(addr1.address, addr3.address)).to.equal(amount1);
      expect(await token.allowance(addr2.address, addr3.address)).to.equal(amount2);
    });
  });

  describe("allowance() - 授权额度查询", function () {
    it("应该为新授权返回零", async function () {
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0n);
    });

    it("应该返回正确的授权额度", async function () {
      const approveAmount = ethers.parseEther("1500");
      await token.approve(addr1.address, approveAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount);
    });

    it("应该在 transferFrom 后正确减少授权额度", async function () {
      const approveAmount = ethers.parseEther("1000");
      const transferAmount = ethers.parseEther("300");

      await token.approve(addr1.address, approveAmount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

      expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount - transferAmount);
    });
  });

  describe("transferFrom() - 授权转账功能", function () {
    beforeEach(async function () {
      // 给 addr1 一些代币并授权给 addr2
      const transferAmount = ethers.parseEther("1000");
      await token.transfer(addr1.address, transferAmount);
    });

    it("应该成功执行授权转账", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("300");

      await token.connect(addr1).approve(addr2.address, approveAmount);

      await expect(token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, addr3.address, transferAmount);

      expect(await token.balanceOf(addr3.address)).to.equal(transferAmount);
    });

    it("应该正确更新授权额度", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("300");

      await token.connect(addr1).approve(addr2.address, approveAmount);
      await token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount);

      expect(await token.allowance(addr1.address, addr2.address)).to.equal(approveAmount - transferAmount);
    });

    it("应该返回 true", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("300");

      await token.connect(addr1).approve(addr2.address, approveAmount);
      const tx = await token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount);
      await expect(tx).to.emit(token, "Transfer");
    });

    it("应该在授权额度不足时回滚", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("600"); // 超过授权额度

      await token.connect(addr1).approve(addr2.address, approveAmount);
      
      await expect(token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount))
        .to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("应该在余额不足时回滚", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("2000"); // 超过余额

      await token.connect(addr1).approve(addr2.address, approveAmount);
      
      await expect(token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("应该允许使用完整的授权额度", async function () {
      const approveAmount = ethers.parseEther("500");

      await token.connect(addr1).approve(addr2.address, approveAmount);
      await token.connect(addr2).transferFrom(addr1.address, addr3.address, approveAmount);

      expect(await token.allowance(addr1.address, addr2.address)).to.equal(0n);
      expect(await token.balanceOf(addr3.address)).to.equal(approveAmount);
    });

    it("应该在从零地址转账时回滚", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(token.transferFrom(ethers.ZeroAddress, addr1.address, transferAmount))
        .to.be.revertedWith("ERC20: transfer from the zero address");
    });

    it("应该支持多次授权转账", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount1 = ethers.parseEther("200");
      const transferAmount2 = ethers.parseEther("300");

      await token.connect(addr1).approve(addr2.address, approveAmount);
      
      await token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount1);
      await token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount2);

      expect(await token.balanceOf(addr3.address)).to.equal(transferAmount1 + transferAmount2);
      expect(await token.allowance(addr1.address, addr2.address)).to.equal(0n);
    });
  });

  describe("事件测试", function () {
    it("应该在转账时发出 Transfer 事件", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(token.transfer(addr1.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);
    });

    it("应该在授权时发出 Approval 事件", async function () {
      const approveAmount = ethers.parseEther("1000");
      
      await expect(token.approve(addr1.address, approveAmount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, approveAmount);
    });

    it("应该在 transferFrom 时发出 Transfer 事件", async function () {
      const transferAmount = ethers.parseEther("500");
      await token.transfer(addr1.address, ethers.parseEther("1000"));
      
      await token.connect(addr1).approve(addr2.address, transferAmount);
      
      await expect(token.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, addr3.address, transferAmount);
    });
  });

  describe("边界情况测试", function () {
    it("应该处理零金额转账", async function () {
      await token.transfer(addr1.address, 0n);
      expect(await token.balanceOf(owner.address)).to.equal(await token.totalSupply());
      expect(await token.balanceOf(addr1.address)).to.equal(0n);
    });

    it("应该处理零金额授权", async function () {
      await token.approve(addr1.address, 0n);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0n);
    });

    it("应该处理最大 uint256 值的授权", async function () {
      const maxAmount = ethers.MaxUint256;
      await token.approve(addr1.address, maxAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(maxAmount);
    });

    it("应该处理转账整个余额", async function () {
      const totalBalance = await token.balanceOf(owner.address);
      await token.transfer(addr1.address, totalBalance);
      
      expect(await token.balanceOf(owner.address)).to.equal(0n);
      expect(await token.balanceOf(addr1.address)).to.equal(totalBalance);
    });
  });

  describe("集成测试", function () {
    it("应该支持完整的转账和授权流程", async function () {
      // 1. 初始状态
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(await token.totalSupply());

      // 2. 转账给 addr1
      const transfer1 = ethers.parseEther("1000");
      await token.transfer(addr1.address, transfer1);
      expect(await token.balanceOf(addr1.address)).to.equal(transfer1);

      // 3. addr1 授权给 addr2
      const approve1 = ethers.parseEther("500");
      await token.connect(addr1).approve(addr2.address, approve1);
      expect(await token.allowance(addr1.address, addr2.address)).to.equal(approve1);

      // 4. addr2 使用授权从 addr1 转账给 addr3
      const transfer2 = ethers.parseEther("300");
      await token.connect(addr2).transferFrom(addr1.address, addr3.address, transfer2);
      expect(await token.balanceOf(addr3.address)).to.equal(transfer2);
      expect(await token.balanceOf(addr1.address)).to.equal(transfer1 - transfer2);
      expect(await token.allowance(addr1.address, addr2.address)).to.equal(approve1 - transfer2);

      // 5. 验证总供应量不变
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });
});
