import { expect } from "chai";
import hre from "hardhat";

describe("Proxy with Logic Contract", function () {
    it("Should delegate calls and manage state via proxy", async function () {
        console.log("🧪 开始测试：代理合约与逻辑合约交互");

        const { ethers } = await hre.network.connect();
        const [owner, otherAccount] = await ethers.getSigners();
        console.log("👤 部署者地址:", owner.address);
        console.log("👥 其他账户地址:", otherAccount.address);

        // 1. 部署逻辑合约
        console.log("\n📦 步骤1: 部署 Logic 逻辑合约...");
        const LogicFactory = await ethers.getContractFactory("logic");
        const logic = await LogicFactory.deploy();
        await logic.waitForDeployment();
        const logicAddress = await logic.getAddress();
        console.log("✅ Logic 合约已部署到:", logicAddress);

        // 2. 部署代理合约，传入逻辑合约地址
        console.log("\n📦 步骤2: 部署 Proxy 代理合约（传入 Logic 地址）...");
        const ProxyFactory = await ethers.getContractFactory("proxy");
        const proxy = await ProxyFactory.deploy(logicAddress);
        await proxy.waitForDeployment();
        const proxyAddress = await proxy.getAddress();
        console.log("✅ Proxy 合约已部署到:", proxyAddress);

        // 3. 验证代理合约的逻辑地址
        console.log("\n🔍 步骤3: 验证 Proxy 中存储的 logicAddress 是否正确...");
        const ProxyContract = await ethers.getContractFactory("proxy");
        const proxyContract = ProxyContract.attach(proxyAddress);
        const storedLogicAddr = await proxyContract.logicAddress();
        console.log("📌 Proxy 中记录的 logic 地址:", storedLogicAddr);
        expect(storedLogicAddr).to.equal(logicAddress);
        console.log("✅ 验证通过：logic 地址匹配！");

        // 4. 创建一个"逻辑合约接口"的实例，但指向代理地址（关键！）
        console.log("\n🔗 步骤4: 使用 Logic ABI 操作 Proxy 地址（委托调用）...");
        const logicAsProxy = LogicFactory.attach(proxyAddress);
        console.log("✅ 已创建 logicAsProxy 实例，目标地址为 Proxy");

        // 5. 初始化（通过代理调用 initialize）
        console.log("\n⚙️ 步骤5: 通过代理调用 initialize 初始化状态...");
        const initTx = await logicAsProxy.initialize(owner.address);
        await initTx.wait();
        console.log("✅ 初始化完成！Owner 已设为:", owner.address);

        // 验证 owner 已设置为部署者（通过存储直接读取）
        console.log("\n🔍 验证 Owner 是否写入代理合约存储（slot 1）...");
        const ownerFromStorage = await ethers.provider.getStorage(proxyAddress, 1);
        const extractedOwner = '0x' + ownerFromStorage.slice(-40);
        console.log("📌 从存储 slot 1 读取的 owner 地址:", extractedOwner);
        expect(ownerFromStorage.slice(-40)).to.equal(owner.address.slice(2).toLowerCase());
        console.log("✅ Owner 存储验证通过！");

        // 6. 调用 count()
        console.log("\n➕ 步骤6: 调用 count() 增加计数器（应从 0 → 1）...");
        await logicAsProxy.count();
        let valueFromStorage = await ethers.provider.getStorage(proxyAddress, 0);
        console.log("📌 当前 value（slot 0）:", valueFromStorage.toString());
        expect(valueFromStorage).to.equal(1n);
        console.log("✅ 计数器成功增加到 1");

        console.log("🔁 再次调用 count()（应从 1 → 2）...");
        await logicAsProxy.count();
        valueFromStorage = await ethers.provider.getStorage(proxyAddress, 0);
        console.log("📌 当前 value（slot 0）:", valueFromStorage.toString());
        expect(valueFromStorage).to.equal(2n);
        console.log("✅ 计数器成功增加到 2");

        // 7. setValue
        console.log("\n✏️ 步骤7: 调用 setValue(100) 设置值...");
        await logicAsProxy.setValue(100);
        valueFromStorage = await ethers.provider.getStorage(proxyAddress, 0);
        console.log("📌 设置后的 value（slot 0）:", valueFromStorage.toString());
        expect(valueFromStorage).to.equal(100n);
        console.log("✅ 值已成功设为 100");

        // 8. 权限测试
        console.log("\n🔒 步骤8: 权限测试 —— 其他账户尝试调用受保护函数...");
        const logicAsOther = logicAsProxy.connect(otherAccount);
        console.log("❌ 其他账户调用 count() 应被拒绝...");
        await expect(logicAsOther.count()).to.be.revertedWith("Not owner");
        console.log("✅ 成功拒绝非所有者调用 count()");

        console.log("❌ 其他账户调用 setValue(50) 应被拒绝...");
        await expect(logicAsOther.setValue(50)).to.be.revertedWith("Not owner");
        console.log("✅ 成功拒绝非所有者调用 setValue()");

        // 9. 验证状态确实存储在代理
        console.log("\n📊 步骤9: 最终验证 —— 状态是否持久化在 Proxy 合约中？");
        const finalValueFromStorage = await ethers.provider.getStorage(proxyAddress, 0);
        const finalOwnerFromStorage = await ethers.provider.getStorage(proxyAddress, 1);
        console.log("📌 最终 value（slot 0）:", finalValueFromStorage.toString());
        console.log("📌 最终 owner（slot 1）:", finalOwnerFromStorage);

        expect(finalValueFromStorage).to.equal(100n);
        const expectedOwnerStorage = BigInt("0x" + owner.address.slice(2));
        expect(finalOwnerFromStorage).to.equal(expectedOwnerStorage);
        console.log("✅ 所有状态验证通过！数据确实存储在 Proxy 中，而非 Logic 合约。");

        console.log("\n🎉 测试全部通过！代理模式工作正常！");
    });
});