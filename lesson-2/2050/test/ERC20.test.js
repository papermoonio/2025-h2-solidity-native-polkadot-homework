const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20 (no external libs)", function () {
	let deployer;
	let user1;
	let user2;
	let token;

	const NAME = "TestToken";
	const SYMBOL = "TT";
	const DECIMALS = 18;
	const INITIAL_SUPPLY = ethers.parseUnits("1000", DECIMALS);

	beforeEach(async function () {
		[deployer, user1, user2] = await ethers.getSigners();
		const ERC20 = await ethers.getContractFactory("ERC20");
		token = await ERC20.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
		await token.waitForDeployment();
	});

	it("has correct metadata", async function () {
		expect(await token.name()).to.equal(NAME);
		expect(await token.symbol()).to.equal(SYMBOL);
		expect(await token.decimals()).to.equal(DECIMALS);
	});

	it("assigns initial supply to deployer", async function () {
		const totalSupply = await token.totalSupply();
		const deployerBal = await token.balanceOf(deployer.address);
		expect(totalSupply).to.equal(INITIAL_SUPPLY);
		expect(deployerBal).to.equal(INITIAL_SUPPLY);
	});

	it("transfers tokens", async function () {
		const amount = ethers.parseUnits("10", DECIMALS);
		await expect(token.transfer(user1.address, amount))
			.to.emit(token, "Transfer")
			.withArgs(await deployer.getAddress(), user1.address, amount);
		expect(await token.balanceOf(user1.address)).to.equal(amount);
		expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY - amount);
	});

	it("reverts on transfer exceeding balance", async function () {
		const amount = INITIAL_SUPPLY + 1n;
		await expect(token.transfer(user1.address, amount)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
	});

	it("approve and allowance", async function () {
		const amount = ethers.parseUnits("50", DECIMALS);
		await expect(token.approve(user1.address, amount))
			.to.emit(token, "Approval")
			.withArgs(await deployer.getAddress(), user1.address, amount);
		expect(await token.allowance(deployer.address, user1.address)).to.equal(amount);
	});

	it("transferFrom uses allowance and updates balances", async function () {
		const amount = ethers.parseUnits("25", DECIMALS);
		await token.approve(user1.address, amount);
		await expect(token.connect(user1).transferFrom(deployer.address, user2.address, amount))
			.to.emit(token, "Transfer")
			.withArgs(await deployer.getAddress(), user2.address, amount);
		expect(await token.allowance(deployer.address, user1.address)).to.equal(0);
		expect(await token.balanceOf(user2.address)).to.equal(amount);
		expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY - amount);
	});

	it("reverts transferFrom on insufficient allowance", async function () {
		const amount = ethers.parseUnits("5", DECIMALS);
		await expect(token.connect(user1).transferFrom(deployer.address, user2.address, amount))
			.to.be.revertedWith("ERC20: insufficient allowance");
	});

	it("increase/decrease allowance", async function () {
		const base = ethers.parseUnits("10", DECIMALS);
		await token.approve(user1.address, base);
		await token.increaseAllowance(user1.address, base);
		expect(await token.allowance(deployer.address, user1.address)).to.equal(base * 2n);
		await token.decreaseAllowance(user1.address, base);
		expect(await token.allowance(deployer.address, user1.address)).to.equal(base);
	});

	it("reverts approvals with zero addresses", async function () {
		await expect(token.approve(ethers.ZeroAddress, 1)).to.be.revertedWith("ERC20: approve to zero address");
		await expect(token.connect(user1).decreaseAllowance(ethers.ZeroAddress, 1)).to.be.revertedWith("ERC20: decreased below zero");
	});

	it("reverts transfer to/from zero address", async function () {
		await expect(token.transfer(ethers.ZeroAddress, 1)).to.be.revertedWith("ERC20: transfer to zero address");
		// simulate transfer from zero is not directly callable; covered in internal checks
	});
});


