import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("DelegateCall", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Proxy should update its storage when calling Logic.increment() via delegatecall", async function () {
    // deploy Logic first
    const logic = await viem.deployContract("Logic");

    // deploy Proxy with implementation = logic.address
    const proxy = await viem.deployContract("Proxy", [logic.address]);

    // initial values should be zero
    assert.equal(await proxy.read.value(), 0n);
    assert.equal(await logic.read.value(), 0n);

    // call increment via proxy (which uses delegatecall internally)
    await proxy.write.increment();

    // after delegatecall, proxy.value should be 1, logic.value should remain 0
    assert.equal(await proxy.read.value(), 1n);
    assert.equal(await logic.read.value(), 0n);
  });
});
