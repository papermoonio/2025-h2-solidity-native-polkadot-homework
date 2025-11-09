import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("SimpleERC20", function () {
  // 部署辅助函数：可传入名称/符号/初始供应（最小单位）
  async function deploy(name: string = "My Token", symbol: string = "MTK", initial: bigint = 1_000_000n * 10n ** 18n) {
    const [deployer, alice, bob] = await ethers.getSigners();
    const token = (await ethers.deployContract("SimpleERC20", [name, symbol, initial])) as any;
    await token.waitForDeployment();
    return { token, deployer, alice, bob, name, symbol, initial };
  }

  // 基本元数据与初始供应检查
  it("metadata and initial supply", async function () {
    const { token, deployer, name, symbol, initial } = await deploy();
    expect(await token.name()).to.equal(name);
    expect(await token.symbol()).to.equal(symbol);
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupply()).to.equal(initial);
    expect(await token.balanceOf(deployer.address)).to.equal(initial);
  });

  describe("transfer", function () {
    // 正常转账并校验事件参数
    it("moves tokens and emits event", async function () {
      const { token, deployer, alice } = await deploy();
      await expect(token.transfer(alice.address, 100n))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, alice.address, 100n);
      expect(await token.balanceOf(alice.address)).to.equal(100n);
    });

    // 余额不足时应回退
    it("reverts on insufficient balance", async function () {
      const { token, alice, bob } = await deploy();
      await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    // 发送到零地址应回退
    it("reverts on zero address recipient", async function () {
      const { token } = await deploy();
      await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: transfer to zero address");
    });

    // 两个账户相互转账的场景
    it("two accounts can transfer to each other", async function () {
      const { token, deployer, alice, bob } = await deploy();

      // 由部署者分别为 alice 与 bob 预置余额
      await token.transfer(alice.address, 1_000n);
      await token.transfer(bob.address, 500n);

      // alice -> bob 转账
      await expect(token.connect(alice).transfer(bob.address, 200n))
        .to.emit(token, "Transfer")
        .withArgs(alice.address, bob.address, 200n);

      // bob -> alice 转账
      await expect(token.connect(bob).transfer(alice.address, 100n))
        .to.emit(token, "Transfer")
        .withArgs(bob.address, alice.address, 100n);

      // 余额校验：alice 1_000 - 200 + 100 = 900；bob 500 + 200 - 100 = 600
      expect(await token.balanceOf(alice.address)).to.equal(900n);
      expect(await token.balanceOf(bob.address)).to.equal(600n);
      // 部署者减少总计 1_500
      expect(await token.balanceOf(deployer.address)).to.equal((1_000_000n * 10n ** 18n) - 1_500n);
    });
  });

  describe("approve", function () {
    // 设置授权并校验事件
    it("sets allowance and emits event", async function () {
      const { token, deployer, alice } = await deploy();
      await expect(token.approve(alice.address, 500n))
        .to.emit(token, "Approval")
        .withArgs(deployer.address, alice.address, 500n);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(500n);
    });

    // 覆盖旧的授权额度
    it("overwrites existing allowance", async function () {
      const { token, deployer, alice } = await deploy();
      await token.approve(alice.address, 300n);
      await token.approve(alice.address, 100n);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(100n);
    });

    // 授权零地址应回退
    it("reverts on zero spender", async function () {
      const { token } = await deploy();
      await expect(token.approve(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: approve to zero address");
    });
  });

  describe("transferFrom", function () {
    // 消耗授权并完成代扣转账
    it("spends allowance and moves tokens", async function () {
      const { token, deployer, alice, bob } = await deploy();
      await token.approve(alice.address, 200n);
      await expect(token.connect(alice).transferFrom(deployer.address, bob.address, 150n))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, bob.address, 150n);

      expect(await token.allowance(deployer.address, alice.address)).to.equal(50n);
      expect(await token.balanceOf(bob.address)).to.equal(150n);
    });

    // 授权不足时应回退
    it("reverts when allowance is insufficient", async function () {
      const { token, deployer, alice, bob } = await deploy();
      await token.approve(alice.address, 100n);
      await expect(token.connect(alice).transferFrom(deployer.address, bob.address, 101n)).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("mint", function () {
    // 仅 owner 可铸造，校验事件与供应变动
    it("owner can mint and emits Transfer from zero", async function () {
      const { token, deployer, alice } = await deploy();
      const supplyBefore = await token.totalSupply();
      await expect(token.mint(alice.address, 1_000n))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, 1_000n);
      expect(await token.totalSupply()).to.equal(supplyBefore + 1_000n);
      expect(await token.balanceOf(alice.address)).to.equal(1_000n);
    });

    // 非 owner 铸造应回退
    it("non-owner cannot mint", async function () {
      const { token, alice, bob } = await deploy();
      await expect(token.connect(alice).mint(bob.address, 1n)).to.be.revertedWith("Only owner");
    });

    // 铸造到零地址应回退
    it("reverts on mint to zero address", async function () {
      const { token } = await deploy();
      await expect(token.mint(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: mint to zero address");
    });
  });

  describe("burn", function () {
    // 仅 owner 可销毁，校验事件与余额变动
    it("owner can burn and emits Transfer to zero", async function () {
      const { token, deployer } = await deploy();
      const balanceBefore = await token.balanceOf(deployer.address);
      await expect(token.burn(deployer.address, 5_000n))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, ethers.ZeroAddress, 5_000n);
      expect(await token.balanceOf(deployer.address)).to.equal(balanceBefore - 5_000n);
    });

    // 非 owner 销毁应回退
    it("non-owner cannot burn", async function () {
      const { token, alice } = await deploy();
      await expect(token.connect(alice).burn(alice.address, 1n)).to.be.revertedWith("Only owner");
    });

    // 销毁超过余额应回退
    it("reverts when burning more than balance", async function () {
      const { token, alice } = await deploy();
      await expect(token.burn(alice.address, 1n)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    // 从零地址销毁应回退
    it("reverts on burn from zero address", async function () {
      const { token } = await deploy();
      // we call internal check through the public function
      await expect(token.burn(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: burn from zero address");
    });
  });
});


