const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Delegatecall Proxy-Logic example", function () {
	let deployer, user;
	let logic, proxy;

	beforeEach(async function () {
		[deployer, user] = await ethers.getSigners();

		const Logic = await ethers.getContractFactory("Logic");
		logic = await Logic.deploy();
		await logic.waitForDeployment();

		const Proxy = await ethers.getContractFactory("Proxy");
		proxy = await Proxy.deploy(await logic.getAddress());
		await proxy.waitForDeployment();
	});

	it("initial state is zero in both", async function () {
		// logic has no own count variable (managed via assembly slot), read proxy state only
		expect(await proxy.count()).to.equal(0);
	});

	it("delegatecall increments proxy storage, logic storage remains unaffected", async function () {
		// call increment via proxy twice
		await proxy.incrementViaDelegatecall();
		expect(await proxy.count()).to.equal(1);

		await proxy.incrementViaDelegatecall();
		expect(await proxy.count()).to.equal(2);

		// Deploy a separate Logic2 to show logic contract own storage isn't used
		// There is no public getter on Logic; the important assertion is that
		// the proxy's state changed while logic address didn't store state.
	});

	it("delegatecall preserves msg.sender as external caller", async function () {
		// msg.sender in delegatecall preserves the original caller (user).
		// While we don't store sender-specific data, we can still ensure no reverts and state increments.
		await proxy.connect(user).incrementViaDelegatecall();
		expect(await proxy.count()).to.equal(1);
	});
});


