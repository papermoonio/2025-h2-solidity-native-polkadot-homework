import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken (ERC20)", function () {
	const NAME = "My Token";
	const SYMBOL = "MTK";
	const DECIMALS = 18;
	const INITIAL_SUPPLY = ethers.parseUnits("1000000", DECIMALS);

	async function deployFixture() {
		const [deployer, alice, bob, carol] = await ethers.getSigners();
		const MyToken = await ethers.getContractFactory("MyToken");
		const token = await MyToken.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY, deployer.address);
		await token.waitForDeployment();
		return { token, deployer, alice, bob, carol };
	}

	it("deploys with correct metadata and initial balances", async () => {
		const { token, deployer } = await deployFixture();
		expect(await token.name()).to.equal(NAME);
		expect(await token.symbol()).to.equal(SYMBOL);
		expect(await token.decimals()).to.equal(DECIMALS);
		expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
		expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY);
	});

	it("totalSupply equals sum of balances (basic check)", async () => {
		const { token, deployer, alice } = await deployFixture();
		await expect(token.transfer(alice.address, 1n)).to.emit(token, "Transfer").withArgs(deployer.address, alice.address, 1n);
		const total = await token.totalSupply();
		const balDeployer = await token.balanceOf(deployer.address);
		const balAlice = await token.balanceOf(alice.address);
		expect(balDeployer + balAlice).to.equal(total);
	});

	it("balanceOf returns 0 for empty accounts", async () => {
		const { token, alice } = await deployFixture();
		expect(await token.balanceOf(alice.address)).to.equal(0n);
	});

	describe("transfer", () => {
		it("moves tokens and emits event", async () => {
			const { token, deployer, alice } = await deployFixture();
			await expect(token.transfer(alice.address, 100n))
				.to.emit(token, "Transfer")
				.withArgs(deployer.address, alice.address, 100n);
			expect(await token.balanceOf(alice.address)).to.equal(100n);
		});

		it("reverts on insufficient balance", async () => {
			const { token, alice, bob } = await deployFixture();
			await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
		});

		it("reverts on transfer to zero address", async () => {
			const { token } = await deployFixture();
			await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: transfer to zero address");
		});
	});

	describe("approve and allowance", () => {
		it("sets allowance and emits Approval", async () => {
			const { token, deployer, alice } = await deployFixture();
			await expect(token.approve(alice.address, 123n))
				.to.emit(token, "Approval")
				.withArgs(deployer.address, alice.address, 123n);
			expect(await token.allowance(deployer.address, alice.address)).to.equal(123n);
		});

		it("overwrites allowance on re-approve", async () => {
			const { token, deployer, alice } = await deployFixture();
			await token.approve(alice.address, 50n);
			await token.approve(alice.address, 75n);
			expect(await token.allowance(deployer.address, alice.address)).to.equal(75n);
		});

		it("reverts on approve to zero address", async () => {
			const { token } = await deployFixture();
			await expect(token.approve(ethers.ZeroAddress, 1n)).to.be.revertedWith("ERC20: approve to zero address");
		});
	});

	describe("transferFrom", () => {
		it("transfers using allowance and decreases it", async () => {
			const { token, deployer, alice, bob } = await deployFixture();
			await token.approve(alice.address, 1000n);
			await expect(token.connect(alice).transferFrom(deployer.address, bob.address, 400n))
				.to.emit(token, "Transfer")
				.withArgs(deployer.address, bob.address, 400n);
			expect(await token.allowance(deployer.address, alice.address)).to.equal(600n);
			expect(await token.balanceOf(bob.address)).to.equal(400n);
		});

		it("reverts when allowance is insufficient", async () => {
			const { token, deployer, alice, bob } = await deployFixture();
			await token.approve(alice.address, 10n);
			await expect(token.connect(alice).transferFrom(deployer.address, bob.address, 11n))
				.to.be.revertedWith("ERC20: insufficient allowance");
		});

		it("reverts when sender has insufficient balance", async () => {
			const { token, alice, bob } = await deployFixture();
			await token.connect(alice).approve(bob.address, 100n);
			await expect(token.connect(bob).transferFrom(alice.address, bob.address, 1n))
				.to.be.revertedWith("ERC20: transfer amount exceeds balance");
		});

		it("reverts on transfer to zero address", async () => {
			const { token, deployer, alice } = await deployFixture();
			await token.approve(alice.address, 10n);
			await expect(token.connect(alice).transferFrom(deployer.address, ethers.ZeroAddress, 1n))
				.to.be.revertedWith("ERC20: transfer to zero address");
		});
	});

	it("supports self-approval and self-transfer", async () => {
		const { token, deployer } = await deployFixture();
		await token.approve(deployer.address, 5n);
		await token.transfer(deployer.address, 5n);
		await token.transferFrom(deployer.address, deployer.address, 3n);
		expect(await token.allowance(deployer.address, deployer.address)).to.equal(2n);
	});
});

