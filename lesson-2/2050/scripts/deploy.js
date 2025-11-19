const { ethers } = require("hardhat");

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deploying with account:", await deployer.getAddress());

	const NAME = "TestToken";
	const SYMBOL = "TT";
	const DECIMALS = 18;
	const INITIAL_SUPPLY = ethers.parseUnits("1000000", DECIMALS); // 1,000,000 TT

	const ERC20 = await ethers.getContractFactory("ERC20");
	const token = await ERC20.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
	await token.waitForDeployment();

	console.log("ERC20 deployed to:", await token.getAddress());
	console.log("Deployer balance:", (await token.balanceOf(await deployer.getAddress())).toString());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});


