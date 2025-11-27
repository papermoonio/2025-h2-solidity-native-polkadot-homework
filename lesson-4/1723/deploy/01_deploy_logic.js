// 部署 Logic 合约 使用 module.exports 导出
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const logic = await deploy("Logic", {
    from: deployer,
    args: [],
    log: true,
  });
  log("Logic 合约地址====>", logic.address);
};

module.exports.tags = ["All", "Logic"];

