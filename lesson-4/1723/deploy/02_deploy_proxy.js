// 使用 Logic 合约地址部署 Proxy 合约 使用 module.exports 导出
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const logic = await deployments.get("Logic");
  log("先获取 Logic 合约地址====>", logic.address);

  const proxy = await deploy("Proxy", {
    from: deployer,
    args: [logic.address],
    log: true,
  });
  log("Proxy 合约地址====>", proxy.address);
};

module.exports.tags = ["All", "Proxy"];

