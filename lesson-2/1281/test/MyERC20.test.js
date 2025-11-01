const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyERC20", function () {
  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const DECIMALS = 18;
  const ONE = 1n;
  const TEN = 10n;
  const UNIT = TEN ** BigInt(DECIMALS);
  const INITIAL = 1_000_000n * UNIT;

  async function deploy() {
    const [owner, a1, a2] = await ethers.getSigners();
    const F = await ethers.getContractFactory("MyERC20");
    const token = await F.deploy(NAME, SYMBOL, DECIMALS, INITIAL);
    await token.waitForDeployment();
    return { token, owner, a1, a2 };
  }

  it("metadata and initial supply", async () => {
    const { token, owner } = await deploy();
    expect(await token.name()).to.equal(NAME);
    expect(await token.symbol()).to.equal(SYMBOL);
    expect(await token.decimals()).to.equal(DECIMALS);
    expect(await token.totalSupply()).to.equal(INITIAL);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL);
  });

  it("transfer updates balances and emits", async () => {
    const { token, owner, a1 } = await deploy();
    const amount = 123n * UNIT;
    await expect(token.transfer(a1.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, a1.address, amount);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL - amount);
    expect(await token.balanceOf(a1.address)).to.equal(amount);
  });

  it("approve and transferFrom flow", async () => {
    const { token, owner, a1, a2 } = await deploy();
    const amount = 456n * UNIT;

    await expect(token.approve(a1.address, amount))
      .to.emit(token, "Approval")
      .withArgs(owner.address, a1.address, amount);
    expect(await token.allowance(owner.address, a1.address)).to.equal(amount);

    await expect(token.connect(a1).transferFrom(owner.address, a2.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, a2.address, amount);

    expect(await token.balanceOf(a2.address)).to.equal(amount);
    expect(await token.allowance(owner.address, a1.address)).to.equal(0);
  });

  it("reverts on insufficient balance", async () => {
    const { token, a1, a2 } = await deploy();
    await expect(token.connect(a1).transfer(a2.address, 1n)).to.be.revertedWith(
      "ERC20: transfer exceeds balance"
    );
  });

  it("reverts on insufficient allowance", async () => {
    const { token, owner, a1, a2 } = await deploy();
    await expect(
      token.connect(a1).transferFrom(owner.address, a2.address, 1n)
    ).to.be.revertedWith("ERC20: insufficient allowance");
  });
});
