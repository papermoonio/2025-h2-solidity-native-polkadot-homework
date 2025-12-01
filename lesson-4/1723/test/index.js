const { expect } = require("chai");
const { ethers, deployments, network } = require("hardhat");

describe("合约测试", function () {
    let logic;
    let proxy;

    beforeEach(async function () {
        if (network.name === "AssetHub") {
            logic = await deployments.get("Logic");
            proxy = await deployments.get("Proxy");
        } else {
            // 部署逻辑合约
            const LogicFactory = await ethers.getContractFactory("Logic");
            logic = await LogicFactory.deploy();
            // 部署代理合约
            const LogicProxyFactory = await ethers.getContractFactory("Proxy");
            proxy = await LogicProxyFactory.deploy(await logic.getAddress());
        }
    });

    describe("Logic 合约测试", function () {
        it("初始值应该为 0", async function () {
            expect(await logic.getNumber()).to.equal(0);
        });

        it("increment 函数应该将值加 1", async function () {
            await logic.increment();
            expect(await logic.getNumber()).to.equal(1);
        });

        it("多次调用 increment 应该正确累加", async function () {
            await logic.increment();
            await logic.increment();
            await logic.increment();
            expect(await logic.getNumber()).to.equal(3);
        });
    });

    describe("Proxy 合约测试", function () {
        it("初始值应该为 0", async function () {
            expect(await proxy.getNumber()).to.equal(0);
        });

        it("通过代理调用 increment 应该将值加 1", async function () {
            await proxy.increment();
            expect(await proxy.getNumber()).to.equal(1);
        });

        it("多次通过代理调用 increment 应该正确累加", async function () {
            await proxy.increment();
            await proxy.increment();
            expect(await proxy.getNumber()).to.equal(2);
        });

        it("验证代理调用不影响逻辑合约状态", async function () {
            // 通过代理调用两次
            await proxy.increment();
            await proxy.increment();
            // 验证代理合约状态正确更新
            expect(await proxy.getNumber()).to.equal(2);
            // 验证逻辑合约状态保持不变
            expect(await logic.getNumber()).to.equal(0);
        });
    });
});