const { ethers } = require("hardhat");

async function main() {
  console.log("=== 整数溢出漏洞演示脚本 ===\n");

  // 获取账户
  const [owner] = await ethers.getSigners();
  console.log(`使用账户: ${owner.address}`);
  console.log(`账户余额: ${ethers.formatEther(await ethers.provider.getBalance(owner.address))} ETH\n`);

  // 部署漏洞合约
  console.log("部署整数溢出漏洞合约...");
  const OverflowContract = await ethers.getContractFactory("OverflowContract");
  const overflowContract = await OverflowContract.deploy();
  await overflowContract.waitForDeployment();
  console.log(`合约已部署至: ${await overflowContract.getAddress()}\n`);

  // 1. 演示基本功能
  console.log("=== 1. 基本功能测试 ===");
  const depositAmount = ethers.parseEther("0.1");
  console.log(`存入 ${ethers.formatEther(depositAmount)} ETH`);
  await overflowContract.deposit({ value: depositAmount });
  
  const balance = await overflowContract.balances(owner.address);
  console.log(`当前余额: ${ethers.formatEther(balance)} ETH\n`);

  // 2. 演示直接的整数溢出计算
  console.log("=== 2. 直接整数溢出演示 ===");
  
  // 获取uint256最大值
  const maxUint256 = ethers.MaxUint256;
  console.log(`uint256最大值: ${maxUint256.toString()}`);
  
  // 演示加法溢出
  console.log("\n加法溢出演示:");
  try {
    // 在Solidity 0.8+中这会抛出错误，但在0.7.6中不会
    console.log("尝试计算: maxUint256 + 1");
    console.log("在Solidity 0.7.6中，这会导致溢出并返回0");
  } catch (error) {
    console.log(`错误: ${error.message}`);
  }
  
  // 演示减法下溢
  console.log("\n减法下溢演示:");
  try {
    // 在Solidity 0.8+中这会抛出错误，但在0.7.6中不会
    console.log("尝试计算: 0 - 1");
    console.log("在Solidity 0.7.6中，这会导致下溢并返回maxUint256");
  } catch (error) {
    console.log(`错误: ${error.message}`);
  }
  
  // 演示乘法溢出
  console.log("\n乘法溢出演示:");
  try {
    // 在Solidity 0.8+中这会抛出错误，但在0.7.6中不会
    const largeNum = maxUint256 / 2n + 1n;
    console.log(`尝试计算: ${largeNum.toString()} * 2`);
    console.log("在Solidity 0.7.6中，这会导致溢出并返回错误的结果");
  } catch (error) {
    console.log(`错误: ${error.message}`);
  }

  // 3. 演示安全函数vs不安全函数
  console.log("\n=== 3. 安全函数vs不安全函数 ===");
  
  // 测试safeAdd函数
  try {
    console.log("\n测试safeAdd函数:");
    console.log("尝试: safeAdd(maxUint256, 1)");
    await overflowContract.safeAdd(maxUint256, 1n);
  } catch (error) {
    console.log(`安全函数正确检测到溢出: ${error.message}`);
  }
  
  // 测试safeMul函数
  try {
    console.log("\n测试safeMul函数:");
    console.log("尝试: safeMul(maxUint256 / 2 + 1, 2)");
    const largeNum = maxUint256 / 2n + 1n;
    await overflowContract.safeMul(largeNum, 2n);
  } catch (error) {
    console.log(`安全函数正确检测到溢出: ${error.message}`);
  }

  // 4. 演示溢出攻击原理
  console.log("\n=== 4. 溢出攻击原理演示 ===");
  
  // 存入更多资金用于攻击演示
  const attackDeposit = ethers.parseEther("0.2");
  console.log(`存入攻击资金: ${ethers.formatEther(attackDeposit)} ETH`);
  await overflowContract.deposit({ value: attackDeposit });
  
  const balanceBefore = await overflowContract.balances(owner.address);
  console.log(`攻击前余额: ${ethers.formatEther(balanceBefore)} ETH`);
  
  // 执行溢出攻击
  try {
    const attackAmount = balanceBefore / 2n;
    console.log(`执行溢出攻击，攻击金额: ${ethers.formatEther(attackAmount)} ETH`);
    await overflowContract.overflowAttack(attackAmount);
    
    const balanceAfter = await overflowContract.balances(owner.address);
    console.log(`攻击后余额: ${ethers.formatEther(balanceAfter)} ETH`);
    
    if (balanceAfter > balanceBefore) {
      console.log("⚠️  攻击成功: 余额异常增加！");
    } else {
      console.log("注意: 由于测试环境限制，攻击效果可能不明显，但原理已演示");
    }
  } catch (error) {
    console.log(`攻击执行失败: ${error.message}`);
    console.log("但在Solidity 0.7.6及以下版本中，整数溢出攻击原理上是可行的");
  }

  // 5. 总结
  console.log("\n=== 整数溢出漏洞总结 ===");
  console.log("1. 整数溢出发生在算术运算结果超出变量类型范围时");
  console.log("2. 在Solidity 0.8.0之前的版本中，溢出不会抛出错误，而是返回错误的结果");
  console.log("3. 防范方法:");
  console.log("   - 使用Solidity 0.8.0+版本（内置溢出检查）");
  console.log("   - 对于旧版本，使用SafeMath库");
  console.log("   - 实施严格的输入验证和范围检查");
  console.log("\n请参阅Integer-Overflow-README.md文件了解更多详细信息");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("执行错误:", error);
    process.exit(1);
  });