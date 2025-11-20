import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { compile } from './depLib.js';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const envPath = path.resolve(__dirname, "../../.env");
  dotenv.config({ path: envPath });
  const PRIVATE_KEY = process.env.LOCAL_PRIV_KEY;
  if (!PRIVATE_KEY) {
    throw new Error('请在 .env 中设置 LOCAL_PRIV_KEY');
  }

  const contractFile = 'MintableERC20.sol'; // 如果你的合约文件名不同，请修改
  const contractName = 'MintableERC20';     // 如果你的合约名不同，请修改
  const { abi, bytecode } = compile(contractFile, contractName);
  // 2) 连接本地节点与钱包
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // 3) 部署
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  // 如有构造参数，请在这里传入: await factory.deploy(arg1, arg2, ...)
  const contract = await factory.deploy("erc20", "ERC20");

  const tx = contract.deploymentTransaction();
  console.log('部署交易发送中，tx:', tx?.hash);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  // write this address to the .env file, replace the VITE_CONTRACT_ADDRESS if it exists, otherwise add it.
  const env = fs.readFileSync(envPath, "utf8");
  let envContent = env.replace(/VITE_CONTRACT_ADDRESS=.*/, `VITE_CONTRACT_ADDRESS = "${address}"`);
  if (!envContent.includes(`VITE_CONTRACT_ADDRESS`)) {
    envContent += `\nVITE_CONTRACT_ADDRESS= "${address}"`;
  }
  console.log("VITE_CONTRACT_ADDRESS updated in .env file", envContent);
  fs.writeFileSync(envPath, envContent);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});