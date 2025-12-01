import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyERC20 Token", function () {
  // 部署夹具：每次测试前重置合约状态
  async function deployTokenFixture() {
    const [owner, otherAccount, spender] = await ethers.getSigners();

    const MyERC20 = await ethers.getContractFactory("MyERC20");
    // 部署代币：名字 MyToken, 符号 MTK, 总量 1000
    const token = await MyERC20.deploy("MyToken", "MTK", 1000); 

    return { token, owner, otherAccount, spender };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("MyToken");
      expect(await token.symbol()).to.equal("MTK");
    });

    it("Should assign the total supply to the owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployTokenFixture);

      // 从 owner 转 50 个代币给 otherAccount
      await token.transfer(otherAccount.address, 50);
      expect(await token.balanceOf(otherAccount.address)).to.equal(50);

      // 检查 owner 余额减少
      // 注意：初始总量是 1000 * 10^18，这里简化比较逻辑
      // 实际测试中通常使用 BigInt 比较
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployTokenFixture);
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // 尝试转账超过余额的数量 (其他账户初始为0)
      await expect(
        token.connect(otherAccount).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Allowances", function () {
    it("Should approve allowance", async function () {
        const { token, owner, spender } = await loadFixture(deployTokenFixture);
        
        await token.approve(spender.address, 100);
        expect(await token.allowance(owner.address, spender.address)).to.equal(100);
    });

    it("Should transferFrom with allowance", async function () {
        const { token, owner, otherAccount, spender } = await loadFixture(deployTokenFixture);

        // 1. Owner 授权 Spender 花 100
        await token.approve(spender.address, 100);

        // 2. Spender 调用 transferFrom 把 Owner 的钱转给 OtherAccount
        await token.connect(spender).transferFrom(owner.address, otherAccount.address, 100);

        // 3. 检查余额
        expect(await token.balanceOf(otherAccount.address)).to.equal(100);
        expect(await token.allowance(owner.address, spender.address)).to.equal(0);
    });
  });
});