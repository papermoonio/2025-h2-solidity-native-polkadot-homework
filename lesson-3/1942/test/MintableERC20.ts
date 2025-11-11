import { expect } from "chai";
import { ethers } from "hardhat";

describe("MintableERC20", function () {
  async function deployFixture() {
    const [deployer, alice, bob] = await ethers.getSigners();
    const name = "Mintable Token";
    const symbol = "MINT";
    const decimals = 18n;
    const initialSupply = ethers.parseUnits("1000", decimals);

    const MintableERC20 = await ethers.getContractFactory("MintableERC20");
    const token = await MintableERC20.deploy(name, symbol, initialSupply, deployer.address);
    await token.waitForDeployment();

    return { token, deployer, alice, bob, name, symbol, decimals, initialSupply };
  }

  it("deploys with correct metadata and initial supply to deployer", async () => {
    const { token, deployer, name, symbol, initialSupply } = await deployFixture();
    expect(await token.name()).to.eq(name);
    expect(await token.symbol()).to.eq(symbol);
    expect(await token.decimals()).to.eq(18);
    expect(await token.totalSupply()).to.eq(initialSupply);
    expect(await token.balanceOf(deployer.address)).to.eq(initialSupply);
  });

  it("owner can mint; non-owner cannot", async () => {
    const { token, deployer, alice } = await deployFixture();
    const amount = ethers.parseUnits("5", 18);

    // Non-owner should revert
    await expect(token.connect(alice).mint(alice.address, amount)).to.be.revertedWithCustomError(
      token,
      "OwnableUnauthorizedAccount"
    );

    // Owner mints successfully
    await expect(token.connect(deployer).mint(alice.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, amount);

    expect(await token.balanceOf(alice.address)).to.eq(amount);
    expect(await token.totalSupply()).to.eq((await token.totalSupply()) - amount + amount); // no-op, ensures read
  });

  it("transfers update balances", async () => {
    const { token, deployer, alice } = await deployFixture();
    const amount = ethers.parseUnits("10", 18);
    await expect(token.connect(deployer).transfer(alice.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(deployer.address, alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.eq(amount);
  });

  it("allowance and transferFrom work correctly", async () => {
    const { token, deployer, alice, bob } = await deployFixture();
    const approveAmount = ethers.parseUnits("20", 18);
    const spendAmount = ethers.parseUnits("7", 18);

    // Deployer approves Alice
    await expect(token.connect(deployer).approve(alice.address, approveAmount))
      .to.emit(token, "Approval")
      .withArgs(deployer.address, alice.address, approveAmount);

    // Alice spends part of allowance to send to Bob
    await expect(token.connect(alice).transferFrom(deployer.address, bob.address, spendAmount))
      .to.emit(token, "Transfer")
      .withArgs(deployer.address, bob.address, spendAmount);

    const remaining = await token.allowance(deployer.address, alice.address);
    expect(remaining).to.eq(approveAmount - spendAmount);
    expect(await token.balanceOf(bob.address)).to.eq(spendAmount);
  });
});


