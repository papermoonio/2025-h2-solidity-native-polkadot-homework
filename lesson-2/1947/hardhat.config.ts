import "@nomicfoundation/hardhat-ethers";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.24",
		settings: {
			optimizer: { enabled: true, runs: 200 }
		}
	}
};

export default config;


