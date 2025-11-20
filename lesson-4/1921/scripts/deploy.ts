import hre from "hardhat";

/**
 * 🚀 部署脚本：演示 delegatecall 代理模式
 */
async function main() {
  console.log("🎯 开始部署 DelegateCall 演示合约...\n");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1️⃣ 部署逻辑合约
  console.log("1️⃣ 部署逻辑合约 (SimpleCounter)...");
  const LogicFactory = await ethers.getContractFactory("SimpleCounter");
  const logicContract = await LogicFactory.deploy();
  await logicContract.waitForDeployment();
  
  const logicAddress = await logicContract.getAddress();
  console.log("✅ 逻辑合约地址:", logicAddress);
  console.log("📊 初始状态 - count:", await logicContract.count());
  console.log("👤 初始状态 - owner:", await logicContract.owner(), "\n");

  // 2️⃣ 部署代理合约
  console.log("2️⃣ 部署代理合约 (SimpleProxy)...");
  const ProxyFactory = await ethers.getContractFactory("SimpleProxy");
  const proxyContract = await ProxyFactory.deploy(logicAddress, deployer.address);
  await proxyContract.waitForDeployment();
  
  const proxyAddress = await proxyContract.getAddress();
  console.log("✅ 代理合约地址:", proxyAddress);
  console.log("📊 代理状态 - count:", await proxyContract.count());
  console.log("👤 代理状态 - owner:", await proxyContract.owner());
  console.log("🔗 代理状态 - implementation:", await proxyContract.implementation(), "\n");

  // 3️⃣ 创建代理+逻辑视图
  console.log("3️⃣ 创建代理合约的逻辑接口视图...");
  const proxyAsLogic = await ethers.getContractAt("SimpleCounter", proxyAddress);
  console.log("✅ 代理+逻辑视图创建成功\n");

  // 4️⃣ 演示 delegatecall 功能
  console.log("4️⃣ 演示 DelegateCall 功能...");
  
  console.log("📈 调用 increment() 函数...");
  const tx1 = await proxyAsLogic.increment();
  await tx1.wait();
  console.log("   - 代理合约 count:", await proxyContract.count());
  console.log("   - 通过逻辑视图读取 count:", await proxyAsLogic.count());
  
  console.log("📈 调用 incrementBy(5) 函数...");
  const tx2 = await proxyAsLogic.incrementBy(5);
  await tx2.wait();
  console.log("   - 最终 count:", await proxyAsLogic.count());

  // 5️⃣ 验证状态存储位置
  console.log("\n5️⃣ 验证状态存储...");
  console.log("🔍 逻辑合约的 count (应该还是0):", await logicContract.count());
  console.log("🔍 代理合约的 count (应该是6):", await proxyContract.count());
  console.log("✨ 验证：状态确实存储在代理合约中，逻辑合约只提供代码！\n");

  // 6️⃣ 输出部署信息
  console.log("🎉 部署完成！合约信息：");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📋 逻辑合约地址: ${logicAddress}`);
  console.log(`🔗 代理合约地址: ${proxyAddress}`);
  console.log(`👤 所有者地址:   ${deployer.address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 7️⃣ 使用说明
  console.log("\n📚 使用说明:");
  console.log("1. 用户始终与代理合约地址交互");
  console.log("2. 所有状态数据存储在代理合约中");
  console.log("3. 可以通过 proxy.upgrade() 更换逻辑合约");
  console.log("4. 升级后状态数据不会丢失");

  return {
    logicContract: logicAddress,
    proxyContract: proxyAddress,
    owner: deployer.address
  };
}

// 处理错误
main()
  .then((result) => {
    console.log("\n✅ 部署成功完成!");
    console.log("📊 返回结果:", result);
  })
  .catch((error) => {
    console.error("\n❌ 部署失败:");
    console.error(error);
    process.exitCode = 1;
  });
