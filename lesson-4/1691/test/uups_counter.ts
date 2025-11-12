import { expect } from "chai";
import { network } from "hardhat";
const { ethers } = await network.connect();

describe("UUPS_Counter / UUPS_CounterV2 (UUPS upgradeable)", () => {
  async function deployV1ViaERC1967Proxy(initialX: bigint) {
    const [owner, other] = await ethers.getSigners();

    // Deploy implementation (UUPS_Counter)
    const V1 = await ethers.getContractFactory("UUPS_Counter");
    const impl = await V1.deploy();
    await impl.waitForDeployment();

    // Prepare init calldata for proxy: initialize(uint256,address)
    const initData = V1.interface.encodeFunctionData("initialize", [
      initialX,
      owner.address,
    ]);

    // Deploy ERC1967Proxy pointing to V1 implementation, calling initialize
    const Proxy = await ethers.getContractFactory("OZ_ERC1967Proxy");
    const proxy = await Proxy.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();

    // Bind proxy address with V1 ABI (ensures UUPS functions present)
    const proxyAsV1 = await ethers.getContractAt(
      "UUPS_Counter",
      await proxy.getAddress(),
      owner
    );

    return { owner, other, V1, impl, proxy, proxyAsV1 };
  }

  it("deploys UUPS_Counter behind ERC1967Proxy and calls functions", async () => {
    const { proxyAsV1 } = await deployV1ViaERC1967Proxy(10n);

    const x0 = (await proxyAsV1.x()) as bigint;
    console.log("[V1] x initial:", x0.toString());
    expect(x0).to.equal(10n);

    await expect(proxyAsV1.inc()).to.emit(proxyAsV1, "Increment").withArgs(1n);
    const x1 = (await proxyAsV1.x()) as bigint;
    console.log("[V1] x after inc():", x1.toString());
    expect(x1).to.equal(11n);

    await expect(proxyAsV1.incBy(5))
      .to.emit(proxyAsV1, "Increment")
      .withArgs(5n);
    const x2 = (await proxyAsV1.x()) as bigint;
    console.log("[V1] x after incBy(5):", x2.toString());
    expect(x2).to.equal(16n);

    await expect(proxyAsV1.incBy(0)).to.be.revertedWith(
      "incBy: increment should be positive"
    );
  });

  it("upgrades to UUPS_CounterV2, preserves x, then exercises V2 and logs x,y", async () => {
    const { owner, other, V1, proxy, proxyAsV1 } =
      await deployV1ViaERC1967Proxy(7n);

    // Mutate some state on V1 to verify persistence after upgrade
    await (await proxyAsV1.inc()).wait(); // x = 8
    await (await proxyAsV1.incBy(4)).wait(); // x = 12
    const xBefore = (await proxyAsV1.x()) as bigint;
    console.log("[Before Upgrade] x:", xBefore.toString());

    // Deploy V2 implementation
    const V2 = await ethers.getContractFactory("UUPS_CounterV2");
    const implV2 = await V2.deploy();
    await implV2.waitForDeployment();
    console.log("Logic V2:", await implV2.getAddress());

    // Non-owner cannot upgrade
    await expect(
      proxyAsV1.connect(other).upgradeToAndCall(await implV2.getAddress(), "0x")
    ).to.be.revertedWithCustomError(proxyAsV1, "OwnableUnauthorizedAccount");

    // Owner upgrades via UUPS function exposed on the proxy
    await expect(
      proxyAsV1.connect(owner).upgradeToAndCall(await implV2.getAddress(), "0x")
    ).to.emit(proxyAsV1, "Upgraded");

    // Rebind with V2 ABI on same proxy address
    const proxyAsV2 = new ethers.Contract(
      await proxy.getAddress(),
      V2.interface,
      owner
    );

    // x is preserved after upgrade
    const xAfter = (await proxyAsV2.x()) as bigint;
    console.log("[After Upgrade] x (should equal before):", xAfter.toString());
    expect(xAfter).to.equal(xBefore);

    // y is new in V2; initialize it
    const yInit = 100n;
    await (await proxyAsV2.initializeV2(yInit)).wait();
    const y0 = (await proxyAsV2.y()) as bigint;
    console.log("[V2:init] y:", y0.toString());
    expect(y0).to.equal(yInit);

    // Call overridden inc(): increments x and y by 1
    await (await proxyAsV2.inc()).wait();
    const xA = (await proxyAsV2.x()) as bigint;
    const yA = (await proxyAsV2.y()) as bigint;
    console.log("[V2:inc] x:", xA.toString(), "y:", yA.toString());
    expect(xA).to.equal(xBefore + 1n);
    expect(yA).to.equal(yInit + 1n);

    // Call inherited incBy(): increases x only
    await (await proxyAsV2.incBy(3)).wait();
    const xB = (await proxyAsV2.x()) as bigint;
    const yB = (await proxyAsV2.y()) as bigint;
    console.log("[V2:incBy(3)] x:", xB.toString(), "y:", yB.toString());
    expect(xB).to.equal(xA + 3n);
    expect(yB).to.equal(yA);

    // Call decrease(): reduces x
    await (await proxyAsV2.decrease(2)).wait();
    const xC = (await proxyAsV2.x()) as bigint;
    const yC = (await proxyAsV2.y()) as bigint;
    console.log("[V2:decrease(2)] x:", xC.toString(), "y:", yC.toString());
    expect(xC).to.equal(xB - 2n);
    expect(yC).to.equal(yB);

    // Guard rails
    await expect(proxyAsV2.decrease(0)).to.be.revertedWith(
      "decrease: decrement should be positive"
    );
    await expect(proxyAsV2.decrease(xC + 1n)).to.be.revertedWith(
      "decrease: insufficient"
    );
  });
});
