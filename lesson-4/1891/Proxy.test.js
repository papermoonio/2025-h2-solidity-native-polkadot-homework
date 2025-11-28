const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Proxy Pattern with delegatecall", function() {
    let Logic;
    let Proxy;
    let logic;
    let proxy;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        // 部署逻辑合约
        Logic = await ethers.getContractFactory("Logic");
        logic = await Logic.deploy();
        await logic.deployed();

        // 部署代理合约
        Proxy = await ethers.getContractFactory("Proxy");
        proxy = await Proxy.deploy(logic.address);
        await proxy.deployed();

        // 初始化代理合约
        await proxy.initialize(owner.address);
    });

    describe("Deployment", function() {
        it("Should deploy both contracts successfully", async function() {
            expect(logic.address).to.not.equal(ethers.constants.AddressZero);
            expect(proxy.address).to.not.equal(ethers.constants.AddressZero);
        });

        it("Should set logic contract address in proxy", async function() {
            expect(await proxy.logicContract()).to.equal(logic.address);
        });

        it("Should initialize proxy with owner", async function() {
            expect(await proxy.owner()).to.equal(owner.address);
        });
    });

    describe("State Preservation", function() {
        it("Should preserve counter state through delegatecall", async function() {
            // 通过代理调用increment
            await proxy.increment();

            // 验证代理合约中的状态被更新
            expect(await proxy.getCounter()).to.equal(1);

            // 再次调用
            await proxy.increment();
            expect(await proxy.getCounter()).to.equal(2);
        });

        it("Should preserve user-specific state", async function() {
            // owner调用increment
            await proxy.increment();
            expect(await proxy.getUserCounter(owner.address)).to.equal(1);

            // addr1调用increment
            await proxy.connect(addr1).increment();
            expect(await proxy.getUserCounter(addr1.address)).to.equal(1);
            expect(await proxy.getUserCounter(owner.address)).to.equal(1);

            // 再次调用
            await proxy.connect(addr1).increment();
            expect(await proxy.getUserCounter(addr1.address)).to.equal(2);
        });

        it("Should maintain separate state for different users", async function() {
            // 多个用户调用
            await proxy.increment();
            await proxy.connect(addr1).incrementBy(5);
            await proxy.connect(addr2).incrementBy(3);

            // 验证全局计数器
            expect(await proxy.getCounter()).to.equal(9);

            // 验证用户特定计数器
            expect(await proxy.getUserCounter(owner.address)).to.equal(1);
            expect(await proxy.getUserCounter(addr1.address)).to.equal(5);
            expect(await proxy.getUserCounter(addr2.address)).to.equal(3);
        });
    });

    describe("Increment Operations", function() {
        it("Should increment counter by 1", async function() {
            await proxy.increment();
            expect(await proxy.getCounter()).to.equal(1);
        });

        it("Should increment counter multiple times", async function() {
            for (let i = 1; i <= 5; i++) {
                await proxy.increment();
                expect(await proxy.getCounter()).to.equal(i);
            }
        });

        it("Should increment by specified amount", async function() {
            await proxy.incrementBy(10);
            expect(await proxy.getCounter()).to.equal(10);

            await proxy.incrementBy(5);
            expect(await proxy.getCounter()).to.equal(15);
        });

        it("Should fail to increment by zero", async function() {
            await expect(
                proxy.incrementBy(0)
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should track user increments correctly", async function() {
            await proxy.incrementBy(3);
            await proxy.connect(addr1).incrementBy(2);
            await proxy.connect(addr2).incrementBy(5);

            expect(await proxy.getUserCounter(owner.address)).to.equal(3);
            expect(await proxy.getUserCounter(addr1.address)).to.equal(2);
            expect(await proxy.getUserCounter(addr2.address)).to.equal(5);
        });
    });

    describe("Decrement Operations", function() {
        it("Should decrement counter by 1", async function() {
            await proxy.incrementBy(5);
            expect(await proxy.getCounter()).to.equal(5);

            await proxy.decrement();
            expect(await proxy.getCounter()).to.equal(4);
        });

        it("Should fail to decrement below zero", async function() {
            await expect(
                proxy.decrement()
            ).to.be.revertedWith("Counter cannot be negative");
        });

        it("Should decrement multiple times", async function() {
            await proxy.incrementBy(10);

            for (let i = 9; i >= 0; i--) {
                await proxy.decrement();
                expect(await proxy.getCounter()).to.equal(i);
            }
        });
    });

    describe("Reset Operations", function() {
        it("Should reset counter to zero", async function() {
            await proxy.incrementBy(100);
            expect(await proxy.getCounter()).to.equal(100);

            await proxy.reset();
            expect(await proxy.getCounter()).to.equal(0);
        });

        it("Should fail to reset if not owner", async function() {
            await proxy.incrementBy(50);

            await expect(
                proxy.connect(addr1).reset()
            ).to.be.revertedWith("Only owner can reset");
        });

        it("Should allow owner to reset", async function() {
            await proxy.incrementBy(50);
            await proxy.reset();
            expect(await proxy.getCounter()).to.equal(0);
        });
    });

    describe("Owner Management", function() {
        it("Should change owner", async function() {
            expect(await proxy.owner()).to.equal(owner.address);

            await proxy.changeOwner(addr1.address);
            expect(await proxy.owner()).to.equal(addr1.address);
        });

        it("Should fail to change owner if not current owner", async function() {
            await expect(
                proxy.connect(addr1).changeOwner(addr2.address)
            ).to.be.revertedWith("Only owner can change owner");
        });

        it("Should fail to change owner to zero address", async function() {
            await expect(
                proxy.changeOwner(ethers.constants.AddressZero)
            ).to.be.revertedWith("New owner cannot be zero address");
        });

        it("New owner should be able to reset", async function() {
            await proxy.incrementBy(50);
            await proxy.changeOwner(addr1.address);

            // 新owner应该能重置
            await proxy.connect(addr1).reset();
            expect(await proxy.getCounter()).to.equal(0);

            // 旧owner不应该能重置
            await proxy.incrementBy(25);
            await expect(
                proxy.reset()
            ).to.be.revertedWith("Only owner can reset");
        });
    });

    describe("Logic Contract Updates", function() {
        it("Should update logic contract", async function() {
            // 部署新的逻辑合约
            const NewLogic = await ethers.getContractFactory("Logic");
            const newLogic = await NewLogic.deploy();
            await newLogic.deployed();

            // 更新逻辑合约
            await proxy.updateLogicContract(newLogic.address);
            expect(await proxy.logicContract()).to.equal(newLogic.address);
        });

        it("Should fail to update logic contract if not owner", async function() {
            const NewLogic = await ethers.getContractFactory("Logic");
            const newLogic = await NewLogic.deploy();
            await newLogic.deployed();

            await expect(
                proxy.connect(addr1).updateLogicContract(newLogic.address)
            ).to.be.revertedWith("Only owner can update logic contract");
        });

        it("Should fail to update logic contract to zero address", async function() {
            await expect(
                proxy.updateLogicContract(ethers.constants.AddressZero)
            ).to.be.revertedWith("New logic contract cannot be zero address");
        });

        it("Should preserve state after logic contract update", async function() {
            // 在原始逻辑合约上执行操作
            await proxy.incrementBy(50);
            expect(await proxy.getCounter()).to.equal(50);

            // 部署新的逻辑合约
            const NewLogic = await ethers.getContractFactory("Logic");
            const newLogic = await NewLogic.deploy();
            await newLogic.deployed();

            // 初始化新逻辑合约
            await newLogic.initialize(owner.address);

            // 更新逻辑合约
            await proxy.updateLogicContract(newLogic.address);

            // 状态应该被保留
            expect(await proxy.getCounter()).to.equal(50);

            // 新逻辑合约应该能继续工作
            await proxy.increment();
            expect(await proxy.getCounter()).to.equal(51);
        });
    });

    describe("Complex Scenarios", function() {
        it("Should handle complex operations sequence", async function() {
            // 初始状态
            expect(await proxy.getCounter()).to.equal(0);

            // 多个用户执行操作
            await proxy.incrementBy(10);
            await proxy.connect(addr1).incrementBy(5);
            await proxy.connect(addr2).incrementBy(3);
            expect(await proxy.getCounter()).to.equal(18);

            // 验证用户特定计数器
            expect(await proxy.getUserCounter(owner.address)).to.equal(10);
            expect(await proxy.getUserCounter(addr1.address)).to.equal(5);
            expect(await proxy.getUserCounter(addr2.address)).to.equal(3);

            // 减少
            await proxy.decrement();
            expect(await proxy.getCounter()).to.equal(17);

            // 重置
            await proxy.reset();
            expect(await proxy.getCounter()).to.equal(0);

            // 用户计数器不应该被重置
            expect(await proxy.getUserCounter(owner.address)).to.equal(10);
            expect(await proxy.getUserCounter(addr1.address)).to.equal(5);
            expect(await proxy.getUserCounter(addr2.address)).to.equal(3);
        });

        it("Should maintain state consistency across multiple operations", async function() {
            let expectedCounter = 0;

            // 执行一系列操作
            for (let i = 0; i < 5; i++) {
                await proxy.incrementBy(i + 1);
                expectedCounter += i + 1;
                expect(await proxy.getCounter()).to.equal(expectedCounter);
            }

            // 验证总计数
            expect(await proxy.getCounter()).to.equal(15); // 1+2+3+4+5

            // 减少操作
            for (let i = 0; i < 3; i++) {
                await proxy.decrement();
                expectedCounter -= 1;
                expect(await proxy.getCounter()).to.equal(expectedCounter);
            }

            expect(await proxy.getCounter()).to.equal(12);
        });

        it("Should emit events correctly", async function() {
            // 测试increment事件
            await expect(proxy.increment())
                .to.emit(proxy, "DelegateCallExecuted");

            // 测试incrementBy事件
            await expect(proxy.incrementBy(5))
                .to.emit(proxy, "DelegateCallExecuted");

            // 测试reset事件
            await expect(proxy.reset())
                .to.emit(proxy, "DelegateCallExecuted");
        });
    });

    describe("Delegatecall Behavior", function() {
        it("Should execute in proxy context (msg.sender preservation)", async function() {
            // 当通过代理调用时，msg.sender应该是调用者，而不是代理
            await proxy.connect(addr1).increment();

            // 验证addr1的计数器被更新
            expect(await proxy.getUserCounter(addr1.address)).to.equal(1);
        });

        it("Should use proxy storage (state preservation)", async function() {
            // 通过代理调用increment
            await proxy.increment();

            // 验证代理合约的状态被更新
            expect(await proxy.counter()).to.equal(1);

            // 逻辑合约的状态不应该被更新（因为delegatecall使用调用者的存储）
            expect(await logic.counter()).to.equal(0);
        });

        it("Should handle multiple delegatecalls correctly", async function() {
            // 执行多个delegatecall
            await proxy.increment();
            await proxy.incrementBy(5);
            await proxy.decrement();

            // 验证最终状态：1 + 5 - 1 = 5
            expect(await proxy.getCounter()).to.equal(5);
        });
    });

    describe("Error Handling", function() {
        it("Should revert with proper error message on failed delegatecall", async function() {
            // 尝试在未初始化的状态下调用（虽然我们已经初始化了，但这是测试错误处理）
            // 创建一个新的代理但不初始化
            const Proxy2 = await ethers.getContractFactory("Proxy");
            const proxy2 = await Proxy2.deploy(logic.address);
            await proxy2.deployed();

            // 尝试重置而不初始化
            await expect(
                proxy2.reset()
            ).to.be.revertedWith("Not initialized");
        });

        it("Should handle delegatecall to non-existent function", async function() {
            // 这个测试验证fallback函数的行为
            // 调用一个不存在的函数应该通过fallback转发
            const data = proxy.interface.encodeFunctionData("nonExistentFunction");

            // 由于fallback会转发到逻辑合约，而逻辑合约也没有这个函数
            // 应该会失败
            await expect(
                owner.sendTransaction({
                    to: proxy.address,
                    data: data
                })
            ).to.be.reverted;
        });
    });
});