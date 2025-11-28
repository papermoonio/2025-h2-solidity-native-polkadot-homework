import { expect } from "chai";
import { log } from "console";
import { ethers } from "hardhat";
import { send } from "process";

describe("Reentrancy Attack Test", function () {
  it("Should successfully execute reentrancy attack and drain bank funds", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // 1. 部署银行合约
    const Bank = await ethers.getContractFactory("VulnerableBank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();

    const ownerBalance = await ethers.provider.getBalance(owner.address);
console.log("Owner balance:", ethers.formatEther(ownerBalance));

    // 2. 存款（银行初始余额）
    await bank.connect(owner).deposit({ value: ethers.parseEther("4") });
    console.log(await ethers.provider.getBalance(bank.target));
    
    expect(await ethers.provider.getBalance(bank.target)).to.equal(ethers.parseEther("4"));

    // 3. 部署攻击合约
    const AttackFactory = await ethers.getContractFactory("Attack");
    const attackContract = await AttackFactory.deploy(bank.target);
    await attackContract.waitForDeployment();

    console.log("attack balance: " + await ethers.provider.getBalance(attackContract.target));

    // 4. 攻击者向攻击合约充值（用于支付 Gas）
    // await owner.sendTransaction({
    //   to: attackContract.target,
    //   value: ethers.parseEther("2"),
    // });
    
    console.log("attack balance: " + await ethers.provider.getBalance(attackContract.target));
    

    // 5. 执行攻击
    await attackContract.connect(attacker).attack({ value: ethers.parseEther("1") });

    // 6. 检查银行余额（应为 0）
    expect(await ethers.provider.getBalance(bank.target)).to.equal(0n);

    // 7. 攻击者提取收益
    await attackContract.connect(attacker).withdraw();
    expect(await ethers.provider.getBalance(attackContract.target)).to.equal(0n);
  });
});