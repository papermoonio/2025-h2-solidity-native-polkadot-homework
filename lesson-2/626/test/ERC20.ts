import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;

describe("Polkadot (ERC20)", function () {
  const NAME = "Polkadot";
  const SYMBOL = "DOT";
  const DECIMALS = 18;
  let INITIAL_SUPPLY: bigint;

  let owner: any;
  let addr1: any;
  let addr2: any;
  let token: any;

  before(async () => {
    const { ethers: connectedEthers } = await network.connect({
      network: "hardhatMainnet",
      chainType: "l1",
    });
    ethers = connectedEthers;
  });

  beforeEach(async () => {
    INITIAL_SUPPLY = ethers.parseUnits("1000", DECIMALS);
    [owner, addr1, addr2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Polkadot");
    token = await Token.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
    await token.waitForDeployment();
  });

  it("has correct metadata: name, symbol, decimals", async () => {
    expect(await token.name()).to.equal(NAME);
    expect(await token.symbol()).to.equal(SYMBOL);
    expect(await token.decimals()).to.equal(DECIMALS);
  });

  it("totalSupply equals initial minted amount", async () => {
    const supply = await token.totalSupply();
    expect(supply).to.equal(INITIAL_SUPPLY);
  });

  it("balanceOf returns correct balances", async () => {
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    expect(await token.balanceOf(addr1.address)).to.equal(0n);
  });

  it("transfer moves tokens and emits Transfer", async () => {
    const amount = ethers.parseUnits("100", DECIMALS);
    await expect(token.transfer(addr1.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(await owner.getAddress(), await addr1.getAddress(), amount);

    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
  });

  it("transfer reverts on insufficient balance", async () => {
    const amount = ethers.parseUnits("1", DECIMALS);
    await expect(token.connect(addr2).transfer(addr1.address, amount)).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    );
  });

  it("transfer reverts to zero address", async () => {
    const amount = ethers.parseUnits("1", DECIMALS);
    await expect(token.transfer(ethers.ZeroAddress, amount)).to.be.revertedWith(
      "ERC20: transfer to the zero address"
    );
  });

  it("allowance is zero by default and updates after approve", async () => {
    const amount = ethers.parseUnits("50", DECIMALS);
    expect(await token.allowance(owner.address, addr1.address)).to.equal(0n);
    await expect(token.approve(addr1.address, amount))
      .to.emit(token, "Approval")
      .withArgs(await owner.getAddress(), await addr1.getAddress(), amount);
    expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);
  });

  it("approve reverts to zero address", async () => {
    await expect(token.approve(ethers.ZeroAddress, 1n)).to.be.revertedWith(
      "ERC20: approve to the zero address"
    );
  });

  it("transferFrom moves tokens, decreases allowance and emits events", async () => {
    const approveAmount = ethers.parseUnits("200", DECIMALS);
    const spendAmount = ethers.parseUnits("150", DECIMALS);

    await expect(token.approve(addr1.address, approveAmount))
      .to.emit(token, "Approval")
      .withArgs(await owner.getAddress(), await addr1.getAddress(), approveAmount);

    await expect(token.connect(addr1).transferFrom(owner.address, addr2.address, spendAmount))
      .to.emit(token, "Transfer")
      .withArgs(await owner.getAddress(), await addr2.getAddress(), spendAmount);

    const remaining = approveAmount - spendAmount;
    expect(await token.allowance(owner.address, addr1.address)).to.equal(remaining);

    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - spendAmount);
    expect(await token.balanceOf(addr2.address)).to.equal(spendAmount);
  });

  it("transferFrom reverts when allowance is insufficient", async () => {
    const amount = ethers.parseUnits("10", DECIMALS);
    await token.approve(addr1.address, amount - 1n);
    await expect(token.connect(addr1).transferFrom(owner.address, addr2.address, amount)).to.be.revertedWith(
      "ERC20: transfer amount exceeds allowance"
    );
  });

  it("transferFrom reverts to zero address", async () => {
    const amount = ethers.parseUnits("10", DECIMALS);
    await token.approve(addr1.address, amount);
    await expect(token.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, amount)).to.be.revertedWith(
      "ERC20: transfer to the zero address"
    );
  });
});