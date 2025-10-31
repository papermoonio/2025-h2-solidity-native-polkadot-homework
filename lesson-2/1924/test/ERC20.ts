import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

describe("MyERC20", function () {
  it("should deploy and transfer tokens", async function () {
    const [owner, addr1] = await hre.ethers.getSigners();

    const MyERC20 = await hre.ethers.getContractFactory("MyERC20");
    const initialSupply = ethers.parseEther("1000");
    const token = await MyERC20.deploy(initialSupply);
    await token.waitForDeployment();

    expect(await token.totalSupply()).to.equal(initialSupply);
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply);

    await token.transfer(addr1.address, ethers.parseEther("100"));
    expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
  });
});