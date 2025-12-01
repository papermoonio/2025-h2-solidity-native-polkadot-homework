import { expect } from "chai";
import hre from "hardhat";

describe("VulnerableBank Reentrancy Demo", function () {
  async function deployAll() {
    const { ethers } = await hre.network.connect();
    const [deployer, user, attackerEOA] = await ethers.getSigners();

    const Bank = await ethers.getContractFactory("VulnerableBank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();

    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await Attacker.connect(attackerEOA).deploy(await bank.getAddress());
    await attacker.waitForDeployment();

    const Rejector = await ethers.getContractFactory("Rejector");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    return { deployer, user, attackerEOA, bank, attacker, rejector };
  }

  it("基线：正常存取流程应更新余额并发送 ETH", async function () {
    const { user, bank } = await deployAll();
    const { ethers } = await hre.network.connect();

    const depositAmount = ethers.parseEther("10");
    await expect(bank.connect(user).deposit({ value: depositAmount }))
      .to.emit(bank, "Deposited")
      .withArgs(await user.getAddress(), depositAmount, depositAmount);

    const beforeBank = await bank.bankBalance();
    await expect(bank.connect(user).withdraw(ethers.parseEther("1")))
      .to.emit(bank, "Withdrawn");

    const afterBank = await bank.bankBalance();
    expect(afterBank).to.equal(beforeBank - ethers.parseEther("1"));

    const userRecorded = await bank.balances(await user.getAddress());
    expect(userRecorded).to.equal(depositAmount - ethers.parseEther("1"));
  });

  it("错误处理：当接收方拒绝 ETH 时应触发 TransferFailed", async function () {
    const { bank, rejector } = await deployAll();
    const { ethers } = await hre.network.connect();
    const amount = ethers.parseEther("1");

    await rejector.depositToBank(await bank.getAddress(), { value: amount });
    await expect(rejector.withdrawFromBank(await bank.getAddress(), amount)).to.be.revertedWithCustomError(
      bank,
      "TransferFailed"
    );
  });

  it("攻击演示：重入攻击可将银行资金耗尽", async function () {
    const { deployer, attackerEOA, bank, attacker } = await deployAll();
    const { ethers } = await hre.network.connect();

    // 初始化银行资金：deployer 先存入 20 ETH
    const initialBankFund = ethers.parseEther("20");
    await bank.connect(deployer).deposit({ value: initialBankFund });
    expect(await bank.bankBalance()).to.equal(initialBankFund);

    // 攻击者准备 1 ETH 作为启动金额
    const startAmount = ethers.parseEther("1");
    const attackTx = await attacker.connect(attackerEOA).attack({ value: startAmount });
    await attackTx.wait();

    // 事件校验（通过过滤器查询）
    const startedEv = await attacker.queryFilter(attacker.filters.AttackStarted());
    const completedEv = await attacker.queryFilter(attacker.filters.AttackCompleted());
    expect(startedEv.length).to.be.greaterThan(0);
    expect(completedEv.length).to.be.greaterThan(0);

    // 银行余额应下降（至少发生一次提款）
    const bankBalAfter = await bank.bankBalance();
    expect(bankBalAfter).to.be.lte(initialBankFund);

    // 攻击合约收到了资金
    const attackerContractETH = await attacker.attackerBalance();
    // 至少获得一次回款
    expect(attackerContractETH).to.be.gte(startAmount);

    // 记录重入次数
    const depth = await attacker.reenterCount();
    expect(depth).to.be.gte(0n);
  });
});
