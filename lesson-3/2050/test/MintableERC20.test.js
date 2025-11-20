const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MintableERC20", function () {
	let deployer, alice, bob, carol, token;

	const NAME = "MintableToken";
	const SYMBOL = "MTK";
	const DECIMALS = 18;
	const INITIAL_SUPPLY = ethers.parseUnits("1000", DECIMALS);

	beforeEach(async function () {
		[deployer, alice, bob, carol] = await ethers.getSigners();
		const Mintable = await ethers.getContractFactory("MintableERC20");
		token = await Mintable.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
		await token.waitForDeployment();
	});

	it("initializes metadata and owner/minter state", async function () {
		expect(await token.name()).to.equal(NAME);
		expect(await token.symbol()).to.equal(SYMBOL);
		expect(await token.decimals()).to.equal(DECIMALS);
		expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
		expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY);
		expect(await token.owner()).to.equal(deployer.address);
		expect(await token.isMinter(deployer.address)).to.equal(true);
	});

	it("owner can add and remove minter", async function () {
		await expect(token.addMinter(alice.address))
			.to.emit(token, "MinterAdded")
			.withArgs(alice.address);
		expect(await token.isMinter(alice.address)).to.equal(true);

		await expect(token.removeMinter(alice.address))
			.to.emit(token, "MinterRemoved")
			.withArgs(alice.address);
		expect(await token.isMinter(alice.address)).to.equal(false);
	});

	it("non-owner cannot add/remove minter", async function () {
		await expect(token.connect(alice).addMinter(bob.address))
			.to.be.revertedWith("Ownable: caller is not the owner");
		await expect(token.connect(alice).removeMinter(bob.address))
			.to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("minter can mint; non-minter cannot", async function () {
		const amount = ethers.parseUnits("250", DECIMALS);

		await expect(token.mint(alice.address, amount))
			.to.emit(token, "Transfer")
			.withArgs(ethers.ZeroAddress, alice.address, amount);
		expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + amount);
		expect(await token.balanceOf(alice.address)).to.equal(amount);

		await expect(token.connect(alice).mint(bob.address, amount))
			.to.be.revertedWith("Mintable: caller is not a minter");
	});

	it("owner can transfer ownership", async function () {
		await expect(token.transferOwnership(alice.address))
			.to.emit(token, "OwnershipTransferred")
			.withArgs(await deployer.getAddress(), alice.address);
		expect(await token.owner()).to.equal(alice.address);
	});

	it("mint to zero address reverts", async function () {
		await expect(token.mint(ethers.ZeroAddress, 1))
			.to.be.revertedWith("ERC20: mint to zero address");
	});

	it("transfers of minted tokens work and update balances", async function () {
		const minted = ethers.parseUnits("10", DECIMALS);
		await token.mint(alice.address, minted);
		await expect(token.connect(alice).transfer(bob.address, minted))
			.to.emit(token, "Transfer")
			.withArgs(alice.address, bob.address, minted);
		expect(await token.balanceOf(alice.address)).to.equal(0);
		expect(await token.balanceOf(bob.address)).to.equal(minted);
	});

	it("approvals and transferFrom with minted tokens", async function () {
		const minted = ethers.parseUnits("5", DECIMALS);
		await token.mint(alice.address, minted);
		await expect(token.connect(alice).approve(bob.address, minted))
			.to.emit(token, "Approval")
			.withArgs(alice.address, bob.address, minted);
		await expect(token.connect(bob).transferFrom(alice.address, carol.address, minted))
			.to.emit(token, "Transfer")
			.withArgs(alice.address, carol.address, minted);
		expect(await token.balanceOf(carol.address)).to.equal(minted);
		expect(await token.allowance(alice.address, bob.address)).to.equal(0);
	});
});


