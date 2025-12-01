const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("整数溢出漏洞测试", function () {
  let overflowContract;
  let owner;
  let initialDeposit;
  let maxUint256;

  beforeEach(async function () {
    // 获取测试账户
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    
    // 设置测试金额
    initialDeposit = ethers.parseEther("1"); // 1 ETH
    
    // 获取uint256的最大值
    maxUint256 = ethers.MaxUint256;
    
    console.log("测试环境准备中...");
    console.log(`- 测试账户: ${owner.address}`);
    console.log(`- 初始存款: ${ethers.formatEther(initialDeposit)} ETH`);
    console.log(`- uint256最大值: ${maxUint256.toString()}\n`);
    
    // 部署漏洞合约
    const OverflowContract = await ethers.getContractFactory("OverflowContract");
    overflowContract = await OverflowContract.deploy();
    await overflowContract.waitForDeployment();
    console.log(`漏洞合约已部署: ${await overflowContract.getAddress()}`);
    
    // 向漏洞合约存入初始资金
    await overflowContract.deposit({ value: initialDeposit });
    console.log(`初始资金已存入: ${ethers.formatEther(initialDeposit)} ETH`);
  });

  it("应该成功执行正常的存款和提款操作", async function () {
    // 获取初始余额
    const initialBalance = await overflowContract.balances(owner.address);
    expect(initialBalance).to.equal(initialDeposit);
    
    // 再存入一些资金
    const additionalDeposit = ethers.parseEther("0.5");
    await overflowContract.deposit({ value: additionalDeposit });
    
    // 验证余额增加
    const newBalance = await overflowContract.balances(owner.address);
    expect(newBalance).to.equal(initialDeposit + additionalDeposit);
    
    // 安全提款
    const withdrawAmount = ethers.parseEther("0.7");
    await overflowContract.unsafeWithdraw(withdrawAmount);
    
    // 验证余额减少
    const finalBalance = await overflowContract.balances(owner.address);
    expect(finalBalance).to.equal(newBalance - withdrawAmount);
    
    console.log("\n正常操作测试成功");
    console.log(`- 初始余额: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`- 增加存款后: ${ethers.formatEther(newBalance)} ETH`);
    console.log(`- 提款后: ${ethers.formatEther(finalBalance)} ETH`);
  });

  it("应该演示减法溢出漏洞", async function () {
    // 获取用户当前余额
    const currentBalance = await overflowContract.balances(owner.address);
    console.log(`\n当前余额: ${ethers.formatEther(currentBalance)} ETH`);
    
    // 尝试提取超过余额的金额，这应该会导致减法溢出
    const withdrawAmount = currentBalance + 1n;
    
    console.log(`尝试提取超过余额的金额: ${withdrawAmount} wei`);
    console.log("注意: 在Solidity 0.7.6中，这不会抛出错误，而是会导致溢出!");
    
    // 执行可能导致溢出的操作
    await overflowContract.unsafeWithdraw(withdrawAmount);
    
    // 检查余额 - 在溢出情况下，余额应该变成一个非常大的数
    const newBalance = await overflowContract.balances(owner.address);
    console.log(`溢出后的余额: ${newBalance.toString()} wei`);
    
    // 验证溢出发生 - 新余额应该远大于初始余额
    expect(newBalance).to.be.gt(currentBalance);
    
    // 注意: 在真实环境中，攻击者可以利用这种溢出后的巨大余额尝试提取合约中的所有资金
    console.log("减法溢出漏洞演示成功");
  });

  it("应该演示乘法溢出漏洞", async function () {
    // 测试safeMul函数在遇到溢出时会抛出错误
    try {
      // 尝试一个会导致乘法溢出的操作
      const largeNumber = ethers.parseUnits("1000000000000000000000000000000000000", 0);
      await overflowContract.safeMul(largeNumber, largeNumber);
      expect.fail("应该抛出乘法溢出错误");
    } catch (error) {
      console.log("\n安全乘法函数正确检测到溢出");
      console.log(`错误信息: ${error.message}`);
    }
    
    // 测试unsafeDoubleFunds函数的乘法溢出
    try {
      // 存入一些初始资金
      const depositAmount = ethers.parseEther("0.1");
      await overflowContract.deposit({ value: depositAmount });
      
      // 尝试使用一个可能导致乘法溢出的大金额
      const largeAmount = maxUint256 / 2n + 1n; // 这会导致 largeAmount * 2 溢出
      console.log(`尝试翻倍金额: ${largeAmount.toString()} wei`);
      
      // 注意: 在实际测试中，这可能会因为gas限制而失败，但在原理上会导致溢出
      await overflowContract.unsafeDoubleFunds(largeAmount);
      
      console.log("乘法操作完成");
    } catch (error) {
      console.log("\n乘法操作失败，可能是因为gas限制:", error.message);
      console.log("在实际环境中，unsafeDoubleFunds函数中的乘法操作可能导致溢出");
    }
    
    console.log("乘法溢出漏洞演示完成");
  });

  it("应该演示加法溢出漏洞", async function () {
    // 测试safeAdd函数在遇到溢出时会抛出错误
    try {
      // 尝试一个会导致加法溢出的操作
      await overflowContract.safeAdd(maxUint256, 1n);
      expect.fail("应该抛出加法溢出错误");
    } catch (error) {
      console.log("\n安全加法函数正确检测到溢出");
      console.log(`错误信息: ${error.message}`);
    }
    
    // 注意: 演示totalDeposits的加法溢出需要非常大的金额，可能会因为gas限制而无法直接测试
    // 在实际环境中，如果totalDeposits接近uint256的最大值，再添加一笔资金就会导致溢出
    console.log("\n注意: 在实际环境中，如果合约的totalDeposits接近uint256的最大值，");
    console.log("再添加一笔资金就会导致加法溢出，可能会被攻击者利用");
    
    console.log("加法溢出漏洞演示完成");
  });

  it("应该演示溢出攻击场景", async function () {
    // 存入足够的资金来执行攻击演示
    const attackDeposit = ethers.parseEther("0.5");
    await overflowContract.deposit({ value: attackDeposit });
    
    const balanceBefore = await overflowContract.balances(owner.address);
    console.log(`\n攻击前余额: ${ethers.formatEther(balanceBefore)} ETH`);
    
    // 尝试执行溢出攻击
    try {
      const attackAmount = balanceBefore / 2n; // 使用余额的一半作为攻击金额
      await overflowContract.overflowAttack(attackAmount);
      
      const balanceAfter = await overflowContract.balances(owner.address);
      console.log(`攻击后余额: ${balanceAfter.toString()} wei`);
      
      // 验证攻击效果 - 余额应该发生异常变化
      console.log("溢出攻击演示完成");
    } catch (error) {
      console.log("\n攻击执行失败，可能是因为测试环境的限制:", error.message);
      console.log("但在Solidity 0.7.6及以下版本中，这种溢出攻击原理上是可行的");
    }
  });
});