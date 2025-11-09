import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("ERC20", function () {
  let erc20: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("ERC20");
    erc20 = await ERC20.deploy("MyToken", "MTK", 1000); // 初始 1000 代币
    await erc20.deployed();
  });

  it("should assign total supply to owner", async function () {
    const ownerBalance = await erc20.balanceOf(await owner.getAddress());
    expect(await erc20.totalSupply()).to.equal(ownerBalance);
  });

  it("should transfer tokens between accounts", async function () {
    const ownerAddress = await owner.getAddress();
    const addr1Address = await addr1.getAddress();

    await erc20.transfer(addr1Address, 100);
    expect(await erc20.balanceOf(addr1Address)).to.equal(100);
    expect(await erc20.balanceOf(ownerAddress)).to.equal(900);
  });

  it("should approve and allow transferFrom", async function () {
    const ownerAddress = await owner.getAddress();
    const addr1Address = await addr1.getAddress();
    const addr2Address = await addr2.getAddress();

    await erc20.approve(addr1Address, 200);
    expect(await erc20.allowance(ownerAddress, addr1Address)).to.equal(200);

    await erc20.connect(addr1).transferFrom(ownerAddress, addr2Address, 150);
    expect(await erc20.balanceOf(addr2Address)).to.equal(150);
    expect(await erc20.allowance(ownerAddress, addr1Address)).to.equal(50);
  });

  it("should fail if sender does not have enough balance", async function () {
    const addr1Address = await addr1.getAddress();
    await expect(erc20.connect(addr1).transfer(await addr2.getAddress(), 10))
      .to.be.revertedWith("Insufficient balance");
  });
});