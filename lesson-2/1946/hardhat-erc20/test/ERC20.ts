import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ERC20", function () {
  let token: any;
  let owner: any, addr1: any, addr2: any, addr3: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    addr1 = await ethers.Wallet.createRandom();
    addr2 = await ethers.Wallet.createRandom();
    addr3 = await ethers.Wallet.createRandom();

    const ethAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: addr1.address,
      value: ethAmount,
    });

    let balance = ethers.provider.getBalance(addr1.address);
    console.log(`Balance of addr1: ${ethers.formatEther(await balance)} ETH`);

    await owner.sendTransaction({
      to: addr2.address,
      value: ethAmount,
    });

    balance = ethers.provider.getBalance(addr2.address);
    console.log(`Balance of addr2: ${ethers.formatEther(await balance)} ETH`);

    await owner.sendTransaction({
      to: addr3.address,
      value: ethAmount,
    });

    balance = ethers.provider.getBalance(addr3.address);
    console.log(`Balance of addr3: ${ethers.formatEther(await balance)} ETH`);

    const factory = await ethers.getContractFactory("ERC20");
    token = await factory.deploy(
      "MyToken",
      "MTK",
      18,
      ethers.parseEther("1000")
    );
    await token.waitForDeployment();
  });

  it("Should set correct metadata", async function () {
    expect(await token.name()).to.equal("MyToken");
    expect(await token.symbol()).to.equal("MTK");
    expect(await token.decimals()).to.equal(18);
  });

  it("Should assign total supply to owner", async function () {
    const supply = await token.totalSupply();
    expect(await token.balanceOf(owner.address)).to.equal(supply);
  });

  it("Should transfer tokens", async function () {
    const amount = ethers.parseEther("100");
    await token.transfer(addr1.address, amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
  });

  it("Should emit Transfer event on transfer", async function () {
    const amount = ethers.parseEther("50");
    await expect(token.transfer(addr1.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, addr1.address, amount);
  });

  it("Should revert on insufficient balance", async function () {
    const amount = ethers.parseEther("2000");
    await expect(token.transfer(addr1.address, amount)).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    );
  });

  it("Should approve and allow transferFrom", async function () {
    const amount = ethers.parseEther("100");
    await token.approve(addr1.address, amount);
    expect(await token.allowance(owner.address, addr1.address)).to.equal(
      amount
    );

    await expect(
      token.connect(addr1).transferFrom(owner.address, addr2.address, amount)
    )
      .to.emit(token, "Transfer")
      .withArgs(owner.address, addr2.address, amount);

    expect(await token.allowance(owner.address, addr1.address)).to.equal(0n);
    expect(await token.balanceOf(addr2.address)).to.equal(amount);
  });

  it("Should emit Approval event", async function () {
    const amount = ethers.parseEther("200");
    await expect(token.approve(addr1.address, amount))
      .to.emit(token, "Approval")
      .withArgs(owner.address, addr1.address, amount);
  });

  it("Should revert transferFrom without allowance", async function () {
    const amount = ethers.parseEther("100");
    await expect(
      token.connect(addr1).transferFrom(owner.address, addr2.address, amount)
    ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("Should revert transfer to zero address", async function () {
    await expect(token.transfer(ethers.ZeroAddress, 1)).to.be.revertedWith(
      "ERC20: transfer to the zero address"
    );
  });

  it("Should revert approve to zero address", async function () {
    await expect(token.approve(ethers.ZeroAddress, 1)).to.be.revertedWith(
      "ERC20: approve to the zero address"
    );
  });

  it("Should revert transferFrom to zero address", async function () {
    await token.approve(addr1.address, 1);
    await expect(
      token.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, 1)
    ).to.be.revertedWith("ERC20: transfer to the zero address");
  });
});
