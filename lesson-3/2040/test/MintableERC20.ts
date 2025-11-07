import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("MintableERC20", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, user1, user2] = await viem.getWalletClients();
  
  // 辅助函数：增加时间
  async function increaseTime(seconds: number) {
    const transport = publicClient.transport as any;
    await transport.request({
      method: "evm_increaseTime",
      params: [seconds],
    });
  }
  
  // 辅助函数：挖矿
  async function mine(count: number = 1) {
    const transport = publicClient.transport as any;
    for (let i = 0; i < count; i++) {
      await transport.request({
        method: "evm_mine",
        params: [],
      });
    }
  }

  // 部署合约的辅助函数
  async function deployMintableERC20(name?: string, symbol?: string) {
    const contractName = name ?? "TestToken";
    const contractSymbol = symbol ?? "TEST";
    return await viem.deployContract("MintableERC20", [contractName, contractSymbol]);
  }

  describe("部署 (Deployment)", function () {
    it("应该正确设置代币名称和符号", async function () {
      const token = await deployMintableERC20("MyToken", "MTK");

      assert.equal(await token.read.name(), "MyToken");
      assert.equal(await token.read.symbol(), "MTK");
      assert.equal(Number(await token.read.decimals()), 18);
    });

    it("应该在部署时给部署者铸造 100,000 个代币", async function () {
      const token = await deployMintableERC20();
      const expectedBalance = 100000n * 10n ** 18n; // 100,000 tokens
      
      const balance = await token.read.balanceOf([owner.account.address]);
      assert.equal(balance, expectedBalance);
    });

    it("应该将部署者设置为 owner", async function () {
      const token = await deployMintableERC20();
      const contractOwner = await token.read.owner();
      
      assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("应该将间隔设置为 3600 秒（1小时）", async function () {
      const token = await deployMintableERC20();
      const interval = await token.read.interval();
      
      assert.equal(interval, 3600n);
    });
  });

  describe("mintToken() - 用户铸造功能", function () {
    it("应该允许用户首次铸造代币", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 100n * 10n ** 18n; // 100 tokens
      const initialBalance = await token.read.balanceOf([user1.account.address]);

      const hash = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const finalBalance = await token.read.balanceOf([user1.account.address]);
      assert.equal(finalBalance - initialBalance, mintAmount);
    });

    it("应该记录用户的最后铸造时间", async function () {
      const token = await deployMintableERC20();

      const hash = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const lastMintTime = await token.read.lastMintTime([user1.account.address]);
      assert.ok(lastMintTime > 0n, "lastMintTime should be greater than 0");
    });

    it("如果距离上次铸造不足1小时，应该拒绝铸造", async function () {
      const token = await deployMintableERC20();

      // 首次铸造
      const hash1 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // 立即尝试再次铸造应该失败
      await assert.rejects(
        token.write.mintToken({
          account: user1.account,
        }),
        (error: any) => {
          return error.message.includes("You need to wait an hour between mints");
        }
      );
    });

    it("如果距离上次铸造超过1小时，应该允许铸造", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 100n * 10n ** 18n;

      // 首次铸造
      const hash1 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const balanceBefore = await token.read.balanceOf([user1.account.address]);

      // 增加时间 1 小时 + 1 秒
      await increaseTime(3601);
      await mine(1);

      // 再次铸造
      const hash2 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const balanceAfter = await token.read.balanceOf([user1.account.address]);
      assert.equal(balanceAfter - balanceBefore, mintAmount);
    });

    it("应该允许不同用户同时铸造", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 100n * 10n ** 18n;

      const hash1 = await token.write.mintToken({
        account: user1.account,
      });
      const hash2 = await token.write.mintToken({
        account: user2.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const balance1 = await token.read.balanceOf([user1.account.address]);
      const balance2 = await token.read.balanceOf([user2.account.address]);

      assert.equal(balance1, mintAmount);
      assert.equal(balance2, mintAmount);
    });

    it("每次铸造应该铸造 100 个代币", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 100n * 10n ** 18n;
      const initialBalance = await token.read.balanceOf([user1.account.address]);

      const hash = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const finalBalance = await token.read.balanceOf([user1.account.address]);
      assert.equal(finalBalance - initialBalance, mintAmount);
    });
  });

  describe("canMint() - 查询是否可以铸造", function () {
    it("对于从未铸造的用户应该返回 true", async function () {
      const token = await deployMintableERC20();
      const canMint = await token.read.canMint([user1.account.address]);

      assert.equal(canMint, true);
    });

    it("对于刚刚铸造的用户应该返回 false", async function () {
      const token = await deployMintableERC20();

      const hash = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const canMint = await token.read.canMint([user1.account.address]);
      assert.equal(canMint, false);
    });

    it("等待1小时后应该返回 true", async function () {
      const token = await deployMintableERC20();

      const hash = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // 增加时间 1 小时 + 1 秒
      await increaseTime(3601);
      await mine(1);

      const canMint = await token.read.canMint([user1.account.address]);
      assert.equal(canMint, true);
    });
  });

  describe("ownerMint() - 所有者铸造功能", function () {
    it("应该允许 owner 为任何地址铸造代币", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 1000n * 10n ** 18n;
      const balanceBefore = await token.read.balanceOf([user1.account.address]);

      const hash = await token.write.ownerMint({
        account: owner.account,
        args: [user1.account.address, mintAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const balanceAfter = await token.read.balanceOf([user1.account.address]);
      assert.equal(balanceAfter - balanceBefore, mintAmount);
    });

    it("应该允许 owner 铸造任意数量", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 5000n * 10n ** 18n;

      const hash = await token.write.ownerMint({
        account: owner.account,
        args: [user2.account.address, mintAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const balance = await token.read.balanceOf([user2.account.address]);
      assert.equal(balance, mintAmount);
    });

    it("非 owner 调用应该失败", async function () {
      const token = await deployMintableERC20();
      const mintAmount = 1000n * 10n ** 18n;

      await assert.rejects(
        token.write.ownerMint({
          account: user1.account,
          args: [user2.account.address, mintAmount],
        }),
        (error: any) => {
          return error.message.includes("Not owner");
        }
      );
    });
  });

  describe("setInterval() - 设置铸造间隔", function () {
    it("应该允许 owner 修改铸造间隔", async function () {
      const token = await deployMintableERC20();
      const newInterval = 7200n; // 2小时

      const hash = await token.write.setInterval({
        account: owner.account,
        args: [newInterval],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const interval = await token.read.interval();
      assert.equal(interval, newInterval);
    });

    it("非 owner 调用应该失败", async function () {
      const token = await deployMintableERC20();

      await assert.rejects(
        token.write.setInterval({
          account: user1.account,
          args: [1800],
        }),
        (error: any) => {
          return error.message.includes("Not owner");
        }
      );
    });

    it("修改间隔后应该影响后续的铸造时间限制", async function () {
      const token = await deployMintableERC20();

      // 将间隔改为 1800 秒（30分钟）
      const hash1 = await token.write.setInterval({
        account: owner.account,
        args: [1800],
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // 用户首次铸造
      const hash2 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // 等待 30 分钟
      await increaseTime(1801);
      await mine(1);

      // 应该可以再次铸造
      const hash3 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      // 验证成功（如果没有抛出错误，说明铸造成功）
      const balance = await token.read.balanceOf([user1.account.address]);
      assert.equal(balance, 200n * 10n ** 18n); // 2次铸造，每次100个
    });
  });

  describe("继承的 ERC20 功能", function () {
    it("应该支持代币转账", async function () {
      const token = await deployMintableERC20();
      const transferAmount = 1000n * 10n ** 18n;

      const hash = await token.write.transfer({
        account: owner.account,
        args: [user1.account.address, transferAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const balance = await token.read.balanceOf([user1.account.address]);
      assert.equal(balance, transferAmount);
    });

    it("应该支持授权和转账", async function () {
      const token = await deployMintableERC20();
      const approveAmount = 500n * 10n ** 18n;

      // 授权
      const hash1 = await token.write.approve({
        account: owner.account,
        args: [user1.account.address, approveAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const allowance = await token.read.allowance([
        owner.account.address,
        user1.account.address,
      ]);
      assert.equal(allowance, approveAmount);

      // 转账
      const hash2 = await token.write.transferFrom({
        account: user1.account,
        args: [owner.account.address, user2.account.address, approveAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const balance = await token.read.balanceOf([user2.account.address]);
      assert.equal(balance, approveAmount);
    });
  });

  describe("边界情况", function () {
    it("应该正确处理间隔恰好等于限制的情况", async function () {
      const token = await deployMintableERC20();

      const hash1 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // 获取第一次铸造的时间
      const lastMintTime = await token.read.lastMintTime([user1.account.address]);
      const interval = await token.read.interval();
      
      // 获取当前区块时间
      const currentBlock = await publicClient.getBlock();
      const currentTime = BigInt(currentBlock.timestamp);
      
      // 计算需要等待的时间（确保恰好等于间隔）
      const timePassed = currentTime - lastMintTime;
      const timeToWait = interval - timePassed;
      
      // 等待 timeToWait - 1 秒，这样当我们挖矿时，新区块的时间戳可能是 timeToWait
      // 但由于时间控制的困难，我们等待 timeToWait - 1 秒，然后检查
      if (timeToWait > 1n) {
        await increaseTime(Number(timeToWait - 1n));
        await mine(1);
      }

      // 检查 canMint，如果返回 false，说明时间恰好等于或小于 interval
      const canMintBefore = await token.read.canMint([user1.account.address]);
      
      // 如果 canMint 返回 false，说明时间恰好等于或小于 interval，应该被拒绝
      if (!canMintBefore) {
        await assert.rejects(
          token.write.mintToken({
            account: user1.account,
          }),
          (error: any) => {
            return error.message.includes("You need to wait an hour between mints");
          }
        );
      }

      // 再等 1 秒应该可以
      await increaseTime(1);
      await mine(1);

      const hash2 = await token.write.mintToken({
        account: user1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // 验证成功
      const balance = await token.read.balanceOf([user1.account.address]);
      assert.equal(balance, 200n * 10n ** 18n); // 2次铸造
    });

    it("lastMintTime 应该为 0 对于从未铸造的用户", async function () {
      const token = await deployMintableERC20();
      const lastMintTime = await token.read.lastMintTime([user1.account.address]);

      assert.equal(lastMintTime, 0n);
    });
  });
});

