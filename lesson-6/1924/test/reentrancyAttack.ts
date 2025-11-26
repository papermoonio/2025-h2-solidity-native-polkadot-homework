import { expect } from "chai";
import hre from "hardhat";



const { ethers, networkHelpers } = await hre.network.connect();

describe("Reentrancy Attack Test", function () {
  it("Hacker should drain funds from Dao via reentrancy exploit", async function () {

    // 部署受害者 Dao
    const dao = await ethers.deployContract("Dao");
    await dao.waitForDeployment();

    // 部署攻击者 Hacker 合约
    const hacker = await ethers.deployContract("Hacker", [await dao.getAddress()]);
    await hacker.waitForDeployment();

    // 部署者给 Dao 预先充入 10ETH 作为资金池
    const [deployer, attacker] = await ethers.getSigners();
    await deployer.sendTransaction({
      to: await dao.getAddress(),
      value: ethers.parseEther("10"),
    });

    console.log("💰 Dao balance before attack:", ethers.formatEther(await dao.daoBalance()));

    // 发起攻击（存1ETH触发 withdraw → fallback重入）
    await hacker.connect(attacker).attack({ value: ethers.parseEther("1") });

    console.log("⚠️ Dao balance after attack:", ethers.formatEther(await dao.daoBalance()));
    console.log("🦹 Hacker profit:", ethers.formatEther(await hacker.getBalance()));

    // Dao 应明显损失资金（甚至清空）
    expect(await dao.daoBalance()).to.be.lessThan(ethers.parseEther("10"));

    // Hacker 获得超出投入 > 1 ETH
    expect(await hacker.getBalance()).to.be.greaterThan(ethers.parseEther("1"));
  });
});