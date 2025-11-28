const { ethers } = require("hardhat");

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deploying with account:", await deployer.getAddress());

	const NAME = "MintableToken";
	const SYMBOL = "MTK";
	const DECIMALS = 18;
	const INITIAL_SUPPLY = ethers.parseUnits("1000000", DECIMALS);

	const Mintable = await ethers.getContractFactory("MintableERC20");
	const token = await Mintable.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
	await token.waitForDeployment();

	console.log("MintableERC20 deployed to:", await token.getAddress());
	console.log("Deployer balance:", (await token.balanceOf(await deployer.getAddress())).toString());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});


