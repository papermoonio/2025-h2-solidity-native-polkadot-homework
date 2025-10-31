import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("ERC20", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should set name, symbol, decimals and mint initial supply to deployer", async function () {
    const name = "MyToken";
    const symbol = "MTK";
    const initialSupply = 1000n * 10n ** 18n;

    // record block before deploy so we can read the constructor Transfer event
    const before = await publicClient.getBlockNumber();
    const token = await viem.deployContract("ERC20", [name, symbol, initialSupply]);

    // fetch the Transfer events emitted during deployment (the mint)
    const events = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "Transfer",
      fromBlock: before,
      strict: true,
    });

    // find the mint event (from == zero address)
    const zero = "0x0000000000000000000000000000000000000000";
    const mint = events.find((e: any) => (e.args as any).from === zero);
    const deployer = (mint?.args as any).to;

    assert.equal(await token.read.name(), name);
    assert.equal(await token.read.symbol(), symbol);
    assert.equal(await token.read.decimals(), 18);
    assert.equal(await token.read.totalSupply(), initialSupply);
    assert.equal(await token.read.balanceOf([deployer]), initialSupply);
  });

  it("Should transfer tokens and update balances, and handle allowances", async function () {
    const initialSupply = 500n * 10n ** 18n;
    // record block before deploy so we can read the constructor Transfer event
    const before = await publicClient.getBlockNumber();
    const token = await viem.deployContract("ERC20", ["Token2", "TK2", initialSupply]);

    // fetch the Transfer events emitted during deployment (the mint)
    const events = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "Transfer",
      fromBlock: before,
      strict: true,
    });
    const zero = "0x0000000000000000000000000000000000000000";
    const mint = events.find((e: any) => (e.args as any).from === zero);
    const deployer = (mint?.args as any).to;

    // pick a recipient address (not the zero address)
    const recipient = "0x0000000000000000000000000000000000000001";
    const amount = 123n * 10n ** 18n;

    // transfer emits Transfer (from, to, value)
    await viem.assertions.emitWithArgs(
      token.write.transfer([recipient, amount]),
      token,
      "Transfer",
      [deployer, recipient, amount],
    );

    assert.equal(await token.read.balanceOf([recipient]), amount);
    assert.equal(await token.read.balanceOf([deployer]), initialSupply - amount);

    // approve and allowance
    const allowanceAmount = 200n * 10n ** 18n;
    await viem.assertions.emitWithArgs(
      token.write.approve([recipient, allowanceAmount]),
      token,
      "Approval",
      [deployer, recipient, allowanceAmount],
    );

    assert.equal(await token.read.allowance([deployer, recipient]), allowanceAmount);

    // increase & decrease allowance
    await token.write.increaseAllowance([recipient, 50n * 10n ** 18n]);
    assert.equal(
      await token.read.allowance([deployer, recipient]),
      allowanceAmount + 50n * 10n ** 18n,
    );

    await token.write.decreaseAllowance([recipient, 25n * 10n ** 18n]);
    assert.equal(
      await token.read.allowance([deployer, recipient]),
      allowanceAmount + 50n * 10n ** 18n - 25n * 10n ** 18n,
    );
  });
});
