import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ERC20", function () {
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let zeroAddress: string;
  let initialSupply: bigint;
  let tokenName: string;
  let tokenSymbol: string;
  let decimals: number;

  beforeEach(async function () {
    // 获取测试账户
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    zeroAddress = ethers.ZeroAddress;
    
    // 设置初始参数
    tokenName = "Test Token";
    tokenSymbol = "TEST";
    decimals = 18;
    // 使用合理的初始供应量：10万代币（足够测试使用，不会导致gas问题）
    initialSupply = 100000n * 10n ** BigInt(decimals);
    
    // 部署合约
    token = await ethers.deployContract("MyToken", [
      tokenName,
      tokenSymbol,
      decimals,
      initialSupply,
    ]);
  });

  describe("构造函数和基本属性", function () {
    it("应该正确设置代币名称", async function () {
      expect(await token.name()).to.equal(tokenName);
    });

    it("应该正确设置代币符号", async function () {
      expect(await token.symbol()).to.equal(tokenSymbol);
    });

    it("应该正确设置代币精度", async function () {
      expect(await token.decimals()).to.equal(decimals);
    });

    it("应该将初始供应量分配给部署者", async function () {
      const ownerAddress = await owner.getAddress();
      expect(await token.balanceOf(ownerAddress)).to.equal(initialSupply);
    });

    it("应该触发 Transfer 事件（从零地址到部署者）", async function () {
      const ownerAddress = await owner.getAddress();
      const filter = token.filters.Transfer();
      const events = await token.queryFilter(filter, -1);
      
      expect(events.length).to.be.greaterThan(0);
      const deploymentEvent = events[events.length - 1];
      expect(deploymentEvent.args.from).to.equal(zeroAddress);
      expect(deploymentEvent.args.to).to.equal(ownerAddress);
      expect(deploymentEvent.args.value).to.equal(initialSupply);
    });
  });

  describe("totalSupply", function () {
    it("应该返回正确的总供应量", async function () {
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("总供应量应该等于初始供应量", async function () {
      const supply = await token.totalSupply();
      expect(supply).to.equal(initialSupply);
    });
  });

  describe("balanceOf", function () {
    it("应该返回部署者的正确余额", async function () {
      const ownerAddress = await owner.getAddress();
      expect(await token.balanceOf(ownerAddress)).to.equal(initialSupply);
    });

    it("应该为新地址返回零余额", async function () {
      const addr1Address = await addr1.getAddress();
      expect(await token.balanceOf(addr1Address)).to.equal(0n);
    });

    it("应该在转账后更新余额", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const transferAmount = 1000n * 10n ** BigInt(decimals);

      await token.transfer(addr1Address, transferAmount);

      expect(await token.balanceOf(ownerAddress)).to.equal(
        initialSupply - transferAmount
      );
      expect(await token.balanceOf(addr1Address)).to.equal(transferAmount);
    });
  });

  describe("transfer", function () {
    it("应该成功转账代币", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const transferAmount = 1000n * 10n ** BigInt(decimals);

      await expect(token.transfer(addr1Address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, addr1Address, transferAmount);

      expect(await token.balanceOf(addr1Address)).to.equal(transferAmount);
      expect(await token.balanceOf(ownerAddress)).to.equal(
        initialSupply - transferAmount
      );
    });

    it("应该返回 true", async function () {
      const addr1Address = await addr1.getAddress();
      const transferAmount = 1000n * 10n ** BigInt(decimals);

      const result = await token.transfer.staticCall(
        addr1Address,
        transferAmount
      );
      expect(result).to.be.true;
    });

    it("应该在余额不足时回滚", async function () {
      const addr2Address = await addr2.getAddress();
      const transferAmount = 1000n * 10n ** BigInt(decimals);

      // addr1 没有代币，尝试转账应该失败
      await expect(
        token.connect(addr1).transfer(addr2Address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("不应该允许转账到零地址", async function () {
      const transferAmount = 1000n * 10n ** BigInt(decimals);

      await expect(
        token.transfer(zeroAddress, transferAmount)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("应该处理零金额转账", async function () {
      const addr1Address = await addr1.getAddress();
      const ownerAddress = await owner.getAddress();
      const ownerBalanceBefore = await token.balanceOf(ownerAddress);

      await expect(token.transfer(addr1Address, 0n))
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, addr1Address, 0n);

      expect(await token.balanceOf(ownerAddress)).to.equal(
        ownerBalanceBefore
      );
      expect(await token.balanceOf(addr1Address)).to.equal(0n);
    });

    it("应该处理转账给自己", async function () {
      const ownerAddress = await owner.getAddress();
      const transferAmount = 1000n * 10n ** BigInt(decimals);
      const balanceBefore = await token.balanceOf(ownerAddress);

      await expect(token.transfer(ownerAddress, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, ownerAddress, transferAmount);

      expect(await token.balanceOf(ownerAddress)).to.equal(balanceBefore);
    });
  });

  describe("approve", function () {
    it("应该成功授权", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      await expect(token.approve(addr1Address, approveAmount))
        .to.emit(token, "Approval")
        .withArgs(ownerAddress, addr1Address, approveAmount);

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount
      );
    });

    it("应该返回 true", async function () {
      const addr1Address = await addr1.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      const result = await token.approve.staticCall(addr1Address, approveAmount);
      expect(result).to.be.true;
    });

    // 注意：无法测试"不允许从零地址授权"，因为零地址无法调用函数（没有私钥）
    // 合约代码中的 require(owner != address(0)) 检查是防御性编程

    it("不应该允许授权给零地址", async function () {
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      await expect(
        token.approve(zeroAddress, approveAmount)
      ).to.be.revertedWith("ERC20: approve to the zero address");
    });

    it("应该允许更新授权额度", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const firstAmount = 5000n * 10n ** BigInt(decimals);
      const secondAmount = 3000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, firstAmount);
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        firstAmount
      );

      await token.approve(addr1Address, secondAmount);
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        secondAmount
      );
    });

    it("应该允许将授权额度设置为零", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);
      await token.approve(addr1Address, 0n);

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(0n);
    });
  });

  describe("allowance", function () {
    it("应该为新授权返回零", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(0n);
    });

    it("应该返回正确的授权额度", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount
      );
    });

    it("应该在授权被使用后更新", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);
      const transferAmount = 2000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);
      await token.connect(addr1).transferFrom(ownerAddress, addr2Address, transferAmount);

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount - transferAmount
      );
    });
  });

  describe("transferFrom", function () {
    it("应该使用授权额度成功转账", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);
      const transferAmount = 2000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);

      await expect(
        token.connect(addr1).transferFrom(ownerAddress, addr2Address, transferAmount)
      )
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, addr2Address, transferAmount);

      expect(await token.balanceOf(addr2Address)).to.equal(transferAmount);
      expect(await token.balanceOf(ownerAddress)).to.equal(
        initialSupply - transferAmount
      );
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount - transferAmount
      );
    });

    it("应该返回 true", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);
      const transferAmount = 2000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);

      const result = await token
        .connect(addr1)
        .transferFrom.staticCall(ownerAddress, addr2Address, transferAmount);
      expect(result).to.be.true;
    });

    it("应该在授权额度不足时回滚", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approveAmount = 1000n * 10n ** BigInt(decimals);
      const transferAmount = 2000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);

      await expect(
        token.connect(addr1).transferFrom(ownerAddress, addr2Address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("应该在余额不足时回滚", async function () {
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const addr3Address = await addr3.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);
      const transferAmount = 100n * 10n ** BigInt(decimals);

      // 先给 addr1 一些代币
      await token.transfer(addr1Address, transferAmount);
      
      // addr1 授权给 addr2
      await token.connect(addr1).approve(addr2Address, approveAmount);
      
      // 但 addr1 的余额不足
      const excessiveAmount = 200n * 10n ** BigInt(decimals);
      await expect(
        token.connect(addr2).transferFrom(addr1Address, addr3Address, excessiveAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    // 注意：无法测试"不允许从零地址转账"，因为零地址无法调用函数（没有私钥）
    // 合约代码中的 require(from != address(0)) 检查是防御性编程
    // 正常的授权转账流程已在其他测试用例中覆盖

    it("不应该允许转账到零地址", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);
      const transferAmount = 2000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);

      await expect(
        token.connect(addr1).transferFrom(ownerAddress, zeroAddress, transferAmount)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("应该完全消耗授权额度", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);
      await token.connect(addr1).transferFrom(ownerAddress, addr2Address, approveAmount);

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(0n);
    });

    it("应该处理零金额转账", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approveAmount);

      await expect(
        token.connect(addr1).transferFrom(ownerAddress, addr2Address, 0n)
      )
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, addr2Address, 0n);

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount
      );
    });
  });

  describe("事件", function () {
    it("Transfer 事件应该在转账时触发", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const transferAmount = 1000n * 10n ** BigInt(decimals);

      const tx = await token.transfer(addr1Address, transferAmount);
      const receipt = await tx.wait();

      const transferEvent = receipt?.logs
        .map((log: any) => {
          try {
            return token.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === "Transfer");

      expect(transferEvent).to.not.be.undefined;
      expect(transferEvent?.args.from).to.equal(ownerAddress);
      expect(transferEvent?.args.to).to.equal(addr1Address);
      expect(transferEvent?.args.value).to.equal(transferAmount);
    });

    it("Approval 事件应该在授权时触发", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const approveAmount = 5000n * 10n ** BigInt(decimals);

      const tx = await token.approve(addr1Address, approveAmount);
      const receipt = await tx.wait();

      const approvalEvent = receipt?.logs
        .map((log: any) => {
          try {
            return token.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === "Approval");

      expect(approvalEvent).to.not.be.undefined;
      expect(approvalEvent?.args.owner).to.equal(ownerAddress);
      expect(approvalEvent?.args.spender).to.equal(addr1Address);
      expect(approvalEvent?.args.value).to.equal(approveAmount);
    });
  });

  describe("综合场景", function () {
    it("应该支持完整的转账流程", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const transfer1Amount = 10000n * 10n ** BigInt(decimals);
      const transfer2Amount = 5000n * 10n ** BigInt(decimals);

      // 第一次转账
      await token.transfer(addr1Address, transfer1Amount);
      expect(await token.balanceOf(addr1Address)).to.equal(transfer1Amount);

      // 第二次转账
      await token.transfer(addr2Address, transfer2Amount);
      expect(await token.balanceOf(addr2Address)).to.equal(transfer2Amount);
      expect(await token.balanceOf(ownerAddress)).to.equal(
        initialSupply - transfer1Amount - transfer2Amount
      );
    });

    it("应该支持完整的授权和转账流程", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const addr3Address = await addr3.getAddress();
      const approveAmount = 10000n * 10n ** BigInt(decimals);
      const transfer1Amount = 3000n * 10n ** BigInt(decimals);
      const transfer2Amount = 5000n * 10n ** BigInt(decimals);

      // 授权
      await token.approve(addr1Address, approveAmount);
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount
      );

      // 第一次使用授权转账
      await token.connect(addr1).transferFrom(ownerAddress, addr2Address, transfer1Amount);
      expect(await token.balanceOf(addr2Address)).to.equal(transfer1Amount);
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount - transfer1Amount
      );

      // 第二次使用授权转账
      await token.connect(addr1).transferFrom(ownerAddress, addr3Address, transfer2Amount);
      expect(await token.balanceOf(addr3Address)).to.equal(transfer2Amount);
      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approveAmount - transfer1Amount - transfer2Amount
      );
    });

    it("应该正确处理多个授权", async function () {
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const approve1Amount = 5000n * 10n ** BigInt(decimals);
      const approve2Amount = 3000n * 10n ** BigInt(decimals);

      await token.approve(addr1Address, approve1Amount);
      await token.approve(addr2Address, approve2Amount);

      expect(await token.allowance(ownerAddress, addr1Address)).to.equal(
        approve1Amount
      );
      expect(await token.allowance(ownerAddress, addr2Address)).to.equal(
        approve2Amount
      );
    });

    it("总供应量应该在所有转账后保持不变", async function () {
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();
      const transfer1Amount = 10000n * 10n ** BigInt(decimals);
      const transfer2Amount = 5000n * 10n ** BigInt(decimals);

      await token.transfer(addr1Address, transfer1Amount);
      await token.transfer(addr2Address, transfer2Amount);

      const ownerAddress = await owner.getAddress();
      const ownerBalance = await token.balanceOf(ownerAddress);
      const addr1Balance = await token.balanceOf(addr1Address);
      const addr2Balance = await token.balanceOf(addr2Address);

      expect(ownerBalance + addr1Balance + addr2Balance).to.equal(initialSupply);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });
});

