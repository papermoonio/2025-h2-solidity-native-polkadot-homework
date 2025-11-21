import hre from "hardhat";
import { expect } from "chai";

describe("Delegatecall proxy example", function () {
  this.timeout(200000);

  let deployer: any;
  let alice: any;
  let logic: any;
  let proxy: any;

  beforeEach(async function () {
    // 当使用 --network local 时，getSigners() 可能只返回 provider-only runner，
    // 因此我们显示创建一个 Wallet（signer）并连接到 hre.ethers.provider。
    const PRIVATE = process.env.PRIVATE_KEY; // 或 LOCAL_PRIV_KEY，根据你打算用哪个
    if (!PRIVATE) {
      // 如果没有私钥，仍然可以在 hardhat 网络上用 getSigners()
      [deployer, alice] = await hre.ethers.getSigners();
    } else {
      // 使用 env 私钥创建 signer（对 external/local network 有效）
      const provider = hre.ethers.provider;
      deployer = new hre.ethers.Wallet(PRIVATE, provider);
      // 可选：再创建一个不同的 signer（如果你有第二个私钥）
      // alice = new hre.ethers.Wallet(ANOTHER_PRIVATE, provider);
      // 若只有一个私钥，也可把 deployer 当作 signer 发 tx
      alice = deployer;
    }

    // 部署逻辑合约（用 deployer）
    const Logic = await hre.ethers.getContractFactory("Logic", deployer);
    logic = await Logic.deploy();
    await logic.waitForDeployment();

    // 部署代理合约
    const Proxy = await hre.ethers.getContractFactory("Proxy", deployer);
    proxy = await Proxy.deploy(await logic.getAddress());
    await proxy.waitForDeployment();
  });

  it("updates counter in proxy storage via delegatecall", async function () {
    // 确保把调用连接到 signer（deploy/contractFactory 已使用 deployer 部署，
    // 但 proxy 变量的 runner 可能仍是 provider —— 所以用 connect）
    const proxyWithAlice = proxy.connect(alice);

    expect(await proxy.counter()).to.equal(0);
    expect(await logic.counter()).to.equal(0);

    const tx = await proxyWithAlice.increment();
    const receipt = await tx.wait(); // 获取 receipt 检查
    console.log("Transaction receipt:", receipt); // 调试: 检查 status 和 logs
    console.log("Proxy counter after increment:", await proxy.counter()); // 调试: 打印实际值

    expect(await proxy.counter()).to.equal(1);
    expect(await logic.counter()).to.equal(0);
  });
});
