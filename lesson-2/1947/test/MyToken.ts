import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken (TS)", function () {
	it("deploys with correct metadata and initial supply to owner", async function () {
		const [owner, user] = await ethers.getSigners();
		const name = "MyToken";
		const symbol = "MTK";
		const initialSupply = ethers.parseUnits("1000", 18);

		const MyToken = await ethers.getContractFactory("MyToken");
		const token = await MyToken.deploy(name, symbol, initialSupply, owner.address);
		await token.waitForDeployment();

		expect(await token.name()).to.equal(name);
		expect(await token.symbol()).to.equal(symbol);
		expect(await token.decimals()).to.equal(18);
		expect(await token.totalSupply()).to.equal(initialSupply);
		expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
		expect(await token.balanceOf(user.address)).to.equal(0n);
	});

	it("transfers tokens between accounts", async function () {
		const [owner, user] = await ethers.getSigners();
		const initialSupply = ethers.parseUnits("1000", 18);
		const MyToken = await ethers.getContractFactory("MyToken");
		const token = await MyToken.deploy("MyToken", "MTK", initialSupply, owner.address);
		await token.waitForDeployment();

		const amount = ethers.parseUnits("10", 18);
		await token.transfer(user.address, amount);

		expect(await token.balanceOf(owner.address)).to.equal(initialSupply - amount);
		expect(await token.balanceOf(user.address)).to.equal(amount);
	});

	it("supports approve/allowance and transferFrom", async function () {
		const [owner, spender, receiver] = await ethers.getSigners();
		const initialSupply = ethers.parseUnits("1000", 18);
		const MyToken = await ethers.getContractFactory("MyToken");
		const token = await MyToken.deploy("MyToken", "MTK", initialSupply, owner.address);
		await token.waitForDeployment();

		const allowanceAmount = ethers.parseUnits("50", 18);
		await token.approve(spender.address, allowanceAmount);
		expect(await token.allowance(owner.address, spender.address)).to.equal(allowanceAmount);

		const transferAmount = ethers.parseUnits("20", 18);
		await token.connect(spender).transferFrom(owner.address, receiver.address, transferAmount);

		expect(await token.balanceOf(receiver.address)).to.equal(transferAmount);
		expect(await token.balanceOf(owner.address)).to.equal(initialSupply - transferAmount);
		expect(await token.allowance(owner.address, spender.address)).to.equal(allowanceAmount - transferAmount);
	});
});


