// 部署脚本：部署逻辑合约和代理合约

async function main() {
  // 部署逻辑合约
  const LogicContract = await ethers.getContractFactory("LogicContract");
  console.log("Deploying LogicContract...");
  const logicContract = await LogicContract.deploy();
  await logicContract.deployed();
  console.log("LogicContract deployed to:", logicContract.address);

  // 使用逻辑合约地址部署代理合约
  const ProxyContract = await ethers.getContractFactory("ProxyContract");
  console.log("Deploying ProxyContract...");
  const proxyContract = await ProxyContract.deploy(logicContract.address);
  await proxyContract.deployed();
  console.log("ProxyContract deployed to:", proxyContract.address);

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });