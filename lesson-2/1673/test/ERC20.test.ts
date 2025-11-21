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

    beforeEach(async () => {
        [deployer, alice, bob, spender] = await ethers.getSigners();
        if (!alice) {
            alice = ethers.Wallet.createRandom();
        }
        if (!bob) {
            bob = ethers.Wallet.createRandom();
        }
        if (!spender) {
            spender = ethers.Wallet.createRandom();
        }
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
                const args = JSON.parse(JSON.stringify(parsed.args, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
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
        console.log(`[view] deployer=${JSON.stringify(deployer)}`);
        console.log(`[view] deployer=${JSON.stringify(deployer.address)}`);
        console.log(`[view] alice=${JSON.stringify(alice)}`);
        console.log(`[view] alice=${JSON.stringify(alice.address)}`);

        const depBal = await token.balanceOf(deployer.address);
        const aliceBal = await token.balanceOf(alice.address);
        const depAllow = await token.allowance(deployer.address, spender.address);
        console.log(`[view] totalSupply=${ts} depBal=${depBal} aliceBal=${aliceBal} dep->spender allowance=${depAllow}`);
        expect(ts).to.equal(initialScaled);
        expect(depBal).to.equal(initialScaled);
        expect(aliceBal).to.equal(0n);
        expect(depAllow).to.equal(0n);
    });

    it("应该成功转账", async function () {
        const transferAmount = 100n;
        await expect(token.transfer(alice.address, transferAmount)).to.emit(token, "Transfer").withArgs(deployer.address, alice.address, transferAmount);

        expect(await token.balanceOf(alice.address)).to.equal(transferAmount);
    });

    it("余额不足时转账应该失败", async function () {
        const largeAmount = ethers.parseUnits("2000000", DECIMALS); // 超过总供应量

        await expect(token.transfer(alice.address, largeAmount)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
});
