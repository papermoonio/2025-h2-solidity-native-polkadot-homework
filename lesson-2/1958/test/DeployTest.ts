import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("部署测试", function () {
  it("应该能够直接部署 ERC20 合约", async function () {
    const [owner] = await ethers.getSigners();
    
    const tokenName = "Direct ERC20";
    const tokenSymbol = "DERC20";
    const decimals = 18;
    const initialSupply = 1000000n * 10n ** BigInt(decimals);

    // 直接部署 ERC20 合约
    const erc20 = await ethers.deployContract("ERC20", [
      tokenName,
      tokenSymbol,
      decimals,
      initialSupply,
    ]);

    // 验证部署成功
    expect(await erc20.name()).to.equal(tokenName);
    expect(await erc20.symbol()).to.equal(tokenSymbol);
    expect(await erc20.decimals()).to.equal(decimals);
    expect(await erc20.totalSupply()).to.equal(initialSupply);
    
    const ownerAddress = await owner.getAddress();
    expect(await erc20.balanceOf(ownerAddress)).to.equal(initialSupply);
  });

  it("应该能够部署 MyToken 合约", async function () {
    const [owner] = await ethers.getSigners();
    
    const tokenName = "My Token";
    const tokenSymbol = "MTK";
    const decimals = 18;
    const initialSupply = 1000000n * 10n ** BigInt(decimals);

    // 部署 MyToken 合约
    const myToken = await ethers.deployContract("MyToken", [
      tokenName,
      tokenSymbol,
      decimals,
      initialSupply,
    ]);

    // 验证部署成功
    expect(await myToken.name()).to.equal(tokenName);
    expect(await myToken.symbol()).to.equal(tokenSymbol);
    expect(await myToken.decimals()).to.equal(decimals);
    expect(await myToken.totalSupply()).to.equal(initialSupply);
    
    const ownerAddress = await owner.getAddress();
    expect(await myToken.balanceOf(ownerAddress)).to.equal(initialSupply);
  });
});

