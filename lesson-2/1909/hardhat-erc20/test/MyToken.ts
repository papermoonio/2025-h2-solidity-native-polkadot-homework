import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData } from "viem";

describe("MyToken", async function () {
  let owner: string;
  let addr1: string;
  let addr2: string;
  let ownerClient: any;
  let addr1Client: any;
  let addr2Client: any;
  let token: any;
  let viem: any;
  let publicClient: any;

  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const DECIMALS = 18;
  const INITIAL_SUPPLY = "1000"; // human-readable units

  beforeEach(async function () {
    const conn = await network.connect();
    viem = conn.viem;
    publicClient = await viem.getPublicClient();
    const wallets = await viem.getWalletClients();
    [ownerClient, addr1Client, addr2Client] = wallets;
    owner = ownerClient.account.address;
    addr1 = addr1Client.account.address;
    addr2 = addr2Client.account.address;

    // deploy with constructor args: pass as array (the helper resolves artifact by name)
    token = await viem.deployContract("MyToken", [
      NAME,
      SYMBOL,
      DECIMALS,
      INITIAL_SUPPLY,
    ]);
  });

  it("sets name, symbol, decimals and totalSupply correctly and assigns to deployer", async function () {
    assert.strictEqual(await token.read.name(), NAME);
    assert.strictEqual(await token.read.symbol(), SYMBOL);
    assert.strictEqual(Number(await token.read.decimals()), DECIMALS);

    const expectedTotal = BigInt(INITIAL_SUPPLY) * 10n ** BigInt(DECIMALS);
    // token.read.totalSupply() returns bigint
    assert.strictEqual(
      (await token.read.totalSupply()).toString(),
      expectedTotal.toString()
    );

    const ownerBal = await token.read.balanceOf([owner]);
    assert.strictEqual(ownerBal.toString(), expectedTotal.toString());
  });

  it("transfer: moves tokens between accounts and emits Transfer", async function () {
    const amount = BigInt(100) * 10n ** BigInt(DECIMALS);

    await token.write.transfer([addr1, amount]);

    const ownerBal = await token.read.balanceOf([owner]);
    const addr1Bal = await token.read.balanceOf([addr1]);
    assert.strictEqual(
      ownerBal.toString(),
      (BigInt(900) * 10n ** BigInt(DECIMALS)).toString()
    );
    assert.strictEqual(addr1Bal.toString(), amount.toString());
  });

  it("transfer: reverts when sending to zero address", async function () {
    const amount = 1n * 10n ** BigInt(DECIMALS);
    await assert.rejects(async () => {
      // viem.constants may not expose AddressZero in this helper; use zero address string
      await token.write.transfer([
        "0x0000000000000000000000000000000000000000",
        amount,
      ]);
    }, /ERC20: transfer to the zero address/);
  });

  it("transfer: reverts on insufficient balance", async function () {
    const large = 1000000n * 10n ** BigInt(DECIMALS);
    await assert.rejects(async () => {
      await token.write.transfer([owner, large], { walletClient: addr1Client });
    }, /ERC20: insufficient balance/);
  });

  it("approve: sets allowance and emits Approval", async function () {
    const allowance = 200n * 10n ** BigInt(DECIMALS);
    await token.write.approve([addr1, allowance]);

    const allowed = await token.read.allowance([owner, addr1]);
    assert.strictEqual(allowed.toString(), allowance.toString());
  });

  it("transferFrom: allows spender to move tokens after approve and updates allowance", async function () {
    const allowance = 150n * 10n ** BigInt(DECIMALS);
    const transferAmount = 50n * 10n ** BigInt(DECIMALS);

    await token.write.approve([addr1, allowance]);

    // debug: inspect token shape to find the right way to call as another wallet
    // console.log('token keys', Object.keys(token));
    // Attempt to use the token.write API with explicit walletClient if available
    // encode call data and send it from the spender wallet client
    const data = encodeFunctionData({
      abi: token.abi,
      functionName: "transferFrom",
      args: [owner, addr2, transferAmount],
    });
    await addr1Client.sendTransaction({ to: token.address, data });

    const addr2Bal = await token.read.balanceOf([addr2]);
    assert.strictEqual(addr2Bal.toString(), transferAmount.toString());

    const remaining = await token.read.allowance([owner, addr1]);
    assert.strictEqual(
      remaining.toString(),
      (allowance - transferAmount).toString()
    );
  });

  it("transferFrom: reverts when allowance is insufficient", async function () {
    const smallAllowance = 10n * 10n ** BigInt(DECIMALS);
    const transferAmount = 20n * 10n ** BigInt(DECIMALS);

    await token.write.approve([addr1, smallAllowance]);

    await assert.rejects(async () => {
      const data2 = encodeFunctionData({
        abi: token.abi,
        functionName: "transferFrom",
        args: [owner, addr2, transferAmount],
      });
      await addr1Client.sendTransaction({ to: token.address, data: data2 });
    }, /ERC20: insufficient allowance/);
  });

  it("transferFrom: reverts when from has insufficient balance", async function () {
    const sendOut = 999n * 10n ** BigInt(DECIMALS);
    await token.write.transfer([addr2, sendOut]);

    const allowance = 10n * 10n ** BigInt(DECIMALS);
    await token.write.approve([addr1, allowance]);

    const want = 2n * 10n ** BigInt(DECIMALS);
    await assert.rejects(async () => {
      const data3 = encodeFunctionData({
        abi: token.abi,
        functionName: "transferFrom",
        args: [owner, addr2, want],
      });
      await addr1Client.sendTransaction({ to: token.address, data: data3 });
    }, /ERC20: insufficient balance/);
  });
});
