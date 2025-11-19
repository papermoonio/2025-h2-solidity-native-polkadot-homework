import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ERC20", function () {
  it("deploys with metadata and initial supply to owner", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000n * 10n ** 18n;
    const token = await ethers.deployContract("ERC20", ["MyToken", "MTK", initialSupply]);
    await token.waitForDeployment();

    expect(await token.name()).to.equal("MyToken");
    expect(await token.symbol()).to.equal("MTK");
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupply()).to.equal(initialSupply);
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
  });

  it("handles transfer and emits events", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const token = await ethers.deployContract("ERC20", ["MyToken", "MTK", 1000n]);
    await token.waitForDeployment();

    const recipient = addr1?.address ?? ethers.Wallet.createRandom().address;
    await expect(token.transfer(recipient, 100n))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, recipient, 100n);

    expect(await token.balanceOf(owner.address)).to.equal(900n);
    expect(await token.balanceOf(recipient)).to.equal(100n);

    await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.revertedWith("transfer to zero address");
    await expect(token.transfer(recipient, 2000n)).to.be.revertedWith("insufficient balance");
  });

  it("supports approve and transferFrom flows", async function () {
    const [owner, spender, recipientSigner] = await ethers.getSigners();
    const token = await ethers.deployContract("ERC20", ["MyToken", "MTK", 1000n]);
    await token.waitForDeployment();

    const effectiveSpender = spender ?? owner;
    await expect(token.approve(effectiveSpender.address, 250n))
      .to.emit(token, "Approval")
      .withArgs(owner.address, effectiveSpender.address, 250n);

    expect(await token.allowance(owner.address, effectiveSpender.address)).to.equal(250n);

    await expect(token.approve(ethers.ZeroAddress, 1n)).to.be.revertedWith("approve to zero address");

    const tokenAsSpender = token.connect(effectiveSpender);
    const recipient = recipientSigner?.address ?? ethers.Wallet.createRandom().address;
    await expect(tokenAsSpender.transferFrom(owner.address, recipient, 200n))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, recipient, 200n);

    expect(await token.allowance(owner.address, effectiveSpender.address)).to.equal(50n);
    expect(await token.balanceOf(owner.address)).to.equal(800n);
    expect(await token.balanceOf(recipient)).to.equal(200n);

    await expect(tokenAsSpender.transferFrom(owner.address, recipient, 100n)).to.be.revertedWith(
      "insufficient allowance",
    );
  });
});