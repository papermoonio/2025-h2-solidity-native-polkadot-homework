import { network } from "hardhat";
const { ethers } = await network.connect({
    network: "localhost",
});

async function main() {
    const NAME = "SampleToken";
    const SYMBOL = "STK";
    const DECIMALS = 18;
    const INITIAL = ethers.parseUnits("1000000");

    let owner: any;
    let token: any;
    [owner] = await ethers.getSigners();
    token = await ethers.deployContract("ERC20Mintable", [NAME, SYMBOL, DECIMALS, INITIAL]);
    const tx = await token.waitForDeployment();
    console.log(`tx: ${tx.target}`);
    console.log(`total supply: ${await token.totalSupply()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});