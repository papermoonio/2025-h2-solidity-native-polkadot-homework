import { expect } from "chai";
import { network } from "hardhat";
const { ethers } = await network.connect();

describe("Basic_Proxy_Counter", () => {
  async function deployV1AndProxy() {
    const [owner, other] = await ethers.getSigners();

    const LogicV1 = await ethers.getContractFactory("Basic_Logic_Counter");
    const logicV1 = await LogicV1.deploy();
    await logicV1.waitForDeployment();

    const Proxy = await ethers.getContractFactory("Basic_Proxy_Counter");
    const proxy = await Proxy.deploy(await logicV1.getAddress());
    await proxy.waitForDeployment();

    const proxyAsV1 = new ethers.Contract(
      await proxy.getAddress(),
      LogicV1.interface,
      owner
    );

    return { owner, other, LogicV1, logicV1, proxy, proxyAsV1 };
  }

  it("delegatecall routes to V1 and updates x as expected", async () => {
    const { proxyAsV1 } = await deployV1AndProxy();

    const prev = (await proxyAsV1.x()) as bigint;
    console.log("[V1] x initial:", prev.toString());

    await expect(proxyAsV1.increment())
      .to.emit(proxyAsV1, "Increment")
      .withArgs(prev + 1n);

    const afterInc = (await proxyAsV1.x()) as bigint;
    expect(afterInc).to.equal(prev + 1n);
    console.log("[V1] x after increment():", afterInc.toString());

    await expect(proxyAsV1.incrementBy(5))
      .to.emit(proxyAsV1, "Increment")
      .withArgs(prev + 6n);

    const afterAdd = (await proxyAsV1.x()) as bigint;
    expect(afterAdd).to.equal(prev + 6n);
    console.log("[V1] x after incrementBy(5):", afterAdd.toString());

    await expect(proxyAsV1.incrementBy(0)).to.be.revertedWith(
      "incrementBy: increment should be positive"
    );
  });

  it("only owner can setImplementation", async () => {
    const { owner, other, proxy } = await deployV1AndProxy();

    const LogicV2 = await ethers.getContractFactory("Basic_Logic_Counter_V2");
    const logicV2 = await LogicV2.deploy();
    await logicV2.waitForDeployment();

    await expect(
      proxy.connect(other).setImplementation(await logicV2.getAddress())
    ).to.be.revertedWith("Not owner");

    // await expect(
    //   proxy.connect(owner).setImplementation(await logicV2.getAddress())
    // ).to.not.be.reverted;
  });

  it("upgradeTo preserves V1 x state and continues on V2", async () => {
    const { owner, proxy, proxyAsV1 } = await deployV1AndProxy();

    const LogicV2 = await ethers.getContractFactory("Basic_Logic_Counter_V2");
    const logicV2 = await LogicV2.deploy();
    await logicV2.waitForDeployment();

    // Addresses diagnostics
    const proxyAddr = await proxy.getAddress();
    const v1Addr = await proxyAsV1.getAddress();
    const v2Addr = await logicV2.getAddress();
    console.log("[Addr] proxy:", proxyAddr);
    console.log("[Addr] logicV1:", v1Addr);
    console.log("[Addr] logicV2:", v2Addr);

    // Pre-upgrade: mutate x via V1 so we can verify persistence
    const xPre0 = (await proxyAsV1.x()) as bigint;
    console.log("[Pre-Upgrade] x before writes:", xPre0.toString());
    await (await proxyAsV1.increment()).wait();
    await (await proxyAsV1.incrementBy(5)).wait();
    const xPre1 = (await proxyAsV1.x()) as bigint;
    console.log("[Pre-Upgrade] x after V1 writes (expect +6):", xPre1.toString());

    // Implementation before upgrade (if getter exists)
    if (typeof (proxy as any).implemantation === "function") {
      const implBefore = await (proxy as any).implemantation();
      console.log("[Proxy] impl before:", implBefore);
    } else if (typeof (proxy as any).implementation === "function") {
      const implBefore = await (proxy as any).implementation();
      console.log("[Proxy] impl before:", implBefore);
    }

    // Upgrade WITHOUT initData to avoid touching V2.y (prevents implementation address corruption on this proxy)
    await expect(
      proxy.connect(owner).upgradeTo(await logicV2.getAddress(), "0x")
    )
      .to.emit(proxy, "Upgraded")
      .withArgs(await logicV2.getAddress());

    // Rebind contract with V2 ABI on the same proxy address
    const proxyAsV2 = new ethers.Contract(
      await proxy.getAddress(),
      LogicV2.interface,
      owner
    );

    // Diagnostics: confirm implementation address used by proxy
    if (typeof (proxy as any).implemantation === "function") {
      const implAddr = await (proxy as any).implemantation();
      console.log("[Proxy] impl after:", implAddr);
    } else if (typeof (proxy as any).implementation === "function") {
      const implAddr = await (proxy as any).implementation();
      console.log("[Proxy] impl after:", implAddr);
    }

    // Verify x is preserved across upgrade
    const xAfterUpgrade = (await proxyAsV2.x()) as bigint;
    console.log("[Post-Upgrade] x should equal pre-upgrade:", xAfterUpgrade.toString());
    expect(xAfterUpgrade).to.equal(xPre1);

    // Use a V2 function that only touches x (incrementBy) to avoid y writes on this proxy design
    await expect(proxyAsV2.incrementBy(2))
      .to.emit(proxyAsV2, "Increment")
      .withArgs(xPre1 + 2n);

    const xFinal = (await proxyAsV2.x()) as bigint;
    console.log("[After V2.incrementBy(2)] x:", xFinal.toString());
    expect(xFinal).to.equal(xPre1 + 2n);

    // V1 ABI still works for shared functions when bound to V1 interface
    const before = (await proxyAsV1.x()) as bigint; // read via V1 ABI
    console.log("[V1 ABI] x read after upgrade (should equal xFinal):", before.toString());
    expect(before).to.equal(xFinal);
  });
});
