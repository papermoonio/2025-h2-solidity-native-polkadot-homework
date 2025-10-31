import { ethers } from "hardhat";

async function main() {
	const [deployer] = await ethers.getSigners();
	const NAME = "My Token";
	const SYMBOL = "MTK";
	const DECIMALS = 18;
	const INITIAL_SUPPLY = ethers.parseUnits("1000000", DECIMALS);

	const MyToken = await ethers.getContractFactory("MyToken");
	const token = await MyToken.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY, deployer.address);
	await token.waitForDeployment();
	console.log("MyToken deployed to:", await token.getAddress());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

