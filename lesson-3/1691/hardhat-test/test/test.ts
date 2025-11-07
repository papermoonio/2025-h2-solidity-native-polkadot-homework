import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ERC20", function () {
  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const DECIMALS = 18;
  const INITIAL_SUPPLY_WHOLE = 1000n; // whole tokens, contract scales by decimals

  let deployer: any;
  let alice: any;
  let bob: any;
  let spender: any;
  let token: any;
  const scale = 10n ** BigInt(DECIMALS);
  const initialScaled = INITIAL_SUPPLY_WHOLE * scale;

  before(async function() {
    const accounts = await ethers.getSigners();
    console.log("Available accounts:", accounts);
    const balance = await ethers.provider.getBalance(accounts[0].address);
    console.log("balance:", balance);
  });

  beforeEach(async () => {
    [deployer, alice, bob, spender] = await ethers.getSigners();
    token = await ethers.deployContract("ERC20", [NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY_WHOLE]);
  });

  // helper to log tx hash and decoded events
  async function logTx(tx: any, label: string) {
    console.log(`[op] ${label}`);
    const receipt = await tx.wait();
    console.log(`[tx] hash=${tx.hash} status=${receipt.status}`);
    for (const log of receipt.logs) {
      try {
        const parsed = token.interface.parseLog({ topics: log.topics, data: log.data });
        // stringify BigInt values cleanly
        const args = JSON.parse(
          JSON.stringify(parsed.args, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
        );
        console.log(`[event] ${parsed.name} args=${JSON.stringify(args)}`);
      } catch {
        // ignore logs that don't belong to this token
      }
    }
    return receipt;
  }

  it("metadata: name, symbol, decimals", async function () {
    const n = await token.name();
    const s = await token.symbol();
    const d = await token.decimals();
    console.log(`[view] name=${n}, symbol=${s}, decimals=${d}`);
    expect(n).to.equal(NAME);
    expect(s).to.equal(SYMBOL);
    expect(d).to.equal(DECIMALS);
  });

  it("initial supply minted to deployer; others zero", async function () {
    const ts = await token.totalSupply();
    const depBal = await token.balanceOf(deployer.address);
    const aliceBal = await token.balanceOf(alice.address);
    const depAllow = await token.allowance(deployer.address, spender.address);
    console.log(`[view] totalSupply=${ts} depBal=${depBal} aliceBal=${aliceBal} dep->spender allowance=${depAllow}`);
    expect(ts).to.equal(initialScaled);
    expect(depBal).to.equal(initialScaled);
    expect(aliceBal).to.equal(0n);
    expect(depAllow).to.equal(0n);
  });

  it("approve: set, overwrite, zero; events and reverts", async function () {
    // approve non-zero
    const tx1 = await token.approve(spender.address, 123n);
    await expect(tx1).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 123n);
    await logTx(tx1, `approve spender=${spender.address} amount=123`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(123n);

    // overwrite to larger value
    const tx2 = await token.approve(spender.address, 1000n);
    await expect(tx2).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 1000n);
    await logTx(tx2, `approve overwrite spender=${spender.address} amount=1000`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(1000n);

    // set to zero
    const tx3 = await token.approve(spender.address, 0n);
    await expect(tx3).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 0n);
    await logTx(tx3, `approve reset spender=${spender.address} amount=0`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(0n);

    // approve to zero address reverts
    console.log(`[op] expect revert: approve to zero address`);
    await expect(token.approve(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: approve to zero");
  });

  it("increaseAllowance / decreaseAllowance: behavior, events, and reverts", async function () {
    // start from zero; increase
    const tx1 = await token.increaseAllowance(spender.address, 50n);
    await expect(tx1).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 50n);
    await logTx(tx1, `increaseAllowance spender=${spender.address} by=50`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(50n);

    // increase again
    const tx2 = await token.increaseAllowance(spender.address, 25n);
    await expect(tx2).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 75n);
    await logTx(tx2, `increaseAllowance spender=${spender.address} by=25`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(75n);

    // decrease partially
    const tx3 = await token.decreaseAllowance(spender.address, 10n);
    await expect(tx3).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 65n);
    await logTx(tx3, `decreaseAllowance spender=${spender.address} by=10`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(65n);

    // decrease to zero
    const tx4 = await token.decreaseAllowance(spender.address, 65n);
    await expect(tx4).to.emit(token, "Approval").withArgs(deployer.address, spender.address, 0n);
    await logTx(tx4, `decreaseAllowance spender=${spender.address} by=65`);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(0n);

    // underflow revert
    console.log(`[op] expect revert: decreaseAllowance below zero`);
    await expect(token.decreaseAllowance(spender.address, 1n)).to.be.revertedWith(
      "ERC20: decreased below zero",
    );

    // zero address spender reverts via _approve
    console.log(`[op] expect revert: increaseAllowance to zero address`);
    await expect(token.increaseAllowance(ethers.ZeroAddress, 1n)).to.be.revertedWith(
      "ERC20: approve to zero",
    );
    console.log(`[op] expect revert: decreaseAllowance to zero address`);
    await expect(token.decreaseAllowance(ethers.ZeroAddress, 0n)).to.be.revertedWith(
      "ERC20: approve to zero",
    );
  });

  it("transfer: zero and non-zero amounts; balance updates; events; reverts", async function () {
    const amount = 123n * scale;

    // zero amount transfer allowed and emits event
    const tx1 = await token.transfer(alice.address, 0n);
    await expect(tx1).to.emit(token, "Transfer").withArgs(deployer.address, alice.address, 0n);
    await logTx(tx1, `transfer from=${deployer.address} to=${alice.address} amount=0`);
    expect(await token.balanceOf(alice.address)).to.equal(0n);
    expect(await token.balanceOf(deployer.address)).to.equal(initialScaled);

    // non-zero transfer
    const tx2 = await token.transfer(alice.address, amount);
    await expect(tx2).to.emit(token, "Transfer").withArgs(deployer.address, alice.address, amount);
    await logTx(tx2, `transfer from=${deployer.address} to=${alice.address} amount=${amount}`);
    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.balanceOf(deployer.address)).to.equal(initialScaled - amount);

    // insufficient balance from alice -> bob
    console.log(`[op] expect revert: transfer insufficient balance alice->bob`);
    await expect(token.connect(alice).transfer(bob.address, amount + 1n)).to.be.revertedWith(
      "ERC20: insufficient balance",
    );

    // transfer to zero address reverts
    console.log(`[op] expect revert: transfer to zero address`);
    await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: transfer to zero");
  });

  it("transferFrom: alice approves, bob pulls from alice to bob; events and reverts", async function () {
    const amount = 50n * scale;

    // move funds to alice first
    const txPrep = await token.transfer(alice.address, amount);
    await expect(txPrep).to.emit(token, "Transfer").withArgs(deployer.address, alice.address, amount);
    await logTx(txPrep, `prepare: transfer initial to alice amount=${amount}`);

    // alice approves bob
    const txA = await token.connect(alice).approve(bob.address, amount);
    await expect(txA).to.emit(token, "Approval").withArgs(alice.address, bob.address, amount);
    await logTx(txA, `approve owner=${alice.address} spender=${bob.address} amount=${amount}`);
    expect(await token.allowance(alice.address, bob.address)).to.equal(amount);

    // bob pulls from alice to bob
    const txB = await token.connect(bob).transferFrom(alice.address, bob.address, amount);
    await expect(txB).to.emit(token, "Transfer").withArgs(alice.address, bob.address, amount);
    await logTx(txB, `transferFrom spender=${bob.address} from=${alice.address} to=${bob.address} amount=${amount}`);
    expect(await token.balanceOf(bob.address)).to.equal(amount);
    expect(await token.balanceOf(alice.address)).to.equal(0n);
    expect(await token.allowance(alice.address, bob.address)).to.equal(0n);

    // zero-amount transferFrom (allowance should not change)
    const txC1 = await token.connect(alice).approve(bob.address, 10n);
    await expect(txC1).to.emit(token, "Approval").withArgs(alice.address, bob.address, 10n);
    await logTx(txC1, `approve owner=${alice.address} spender=${bob.address} amount=10`);
    const txC2 = await token.connect(bob).transferFrom(alice.address, bob.address, 0n);
    await expect(txC2).to.emit(token, "Transfer").withArgs(alice.address, bob.address, 0n);
    await logTx(txC2, `transferFrom spender=${bob.address} from=${alice.address} to=${bob.address} amount=0`);
    expect(await token.allowance(alice.address, bob.address)).to.equal(10n);

    // insufficient allowance
    console.log(`[op] expect revert: transferFrom insufficient allowance bob pulls 11 from alice`);
    await expect(
      token.connect(bob).transferFrom(alice.address, bob.address, 11n),
    ).to.be.revertedWith("ERC20: insufficient allowance");

    // transfer to zero address reverts
    const txC3 = await token.connect(alice).approve(bob.address, 1n);
    await expect(txC3).to.emit(token, "Approval").withArgs(alice.address, bob.address, 1n);
    await logTx(txC3, `approve owner=${alice.address} spender=${bob.address} amount=1`);
    console.log(`[op] expect revert: transferFrom to zero address`);
    await expect(
      token.connect(bob).transferFrom(alice.address, ethers.ZeroAddress, 1n),
    ).to.be.revertedWith("ERC20: transfer to zero");

    // from zero address with amount 0 reverts via _approve check
    console.log(`[op] expect revert: transferFrom from zero address amount=0`);
    await expect(
      token.connect(bob).transferFrom(ethers.ZeroAddress, bob.address, 0n),
    ).to.be.revertedWith("ERC20: approve from zero");
  });

  it("balanceOf and allowance reflect post-transfer states", async function () {
    const amt1 = 1n * scale;
    const amt2 = 2n * scale;

    await token.transfer(alice.address, amt1);
    await token.transfer(bob.address, amt2);

    expect(await token.balanceOf(alice.address)).to.equal(amt1);
    expect(await token.balanceOf(bob.address)).to.equal(amt2);
    expect(await token.totalSupply()).to.equal(initialScaled);

    await token.connect(alice).approve(spender.address, 7n);
    expect(await token.allowance(alice.address, spender.address)).to.equal(7n);
  });
});
