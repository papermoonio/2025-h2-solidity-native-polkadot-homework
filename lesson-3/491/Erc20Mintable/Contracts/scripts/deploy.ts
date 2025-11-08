import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import solc from 'solc';
import { ethers } from 'ethers';

dotenv.config({path: "../.env"});

// ⭐️ 关键：实现 import 回调
function findImports(importPath: string) {
  try {
    // 支持从 node_modules 加载
    if (importPath.startsWith("@")) {
      const fullPath = path.resolve("node_modules", importPath);
      const content = fs.readFileSync(fullPath, "utf8");
      return { contents: content };
    }
    // 支持相对路径
    const fullPath = path.resolve("contracts", importPath);
    const content = fs.readFileSync(fullPath, "utf8");
    return { contents: content };
  } catch (error) {
    return { error: `File not found: ${importPath}` };
  }
}

async function main() {
  const PRIVATE_KEY = process.env.LOCAL_PRIV_KEY;
  if (!PRIVATE_KEY) {
    throw new Error('请在 .env 中设置 LOCAL_PRIV_KEY');
  }

  // 1) 读取并编译合约（不依赖 Hardhat）
  // const contractFile = 'ERC20.sol'; // 如果你的合约文件名不同，请修改
  // const contractName = 'ERC20';     // 如果你的合约名不同，请修改
  const contractFile = 'MintableERC20.sol'; // 如果你的合约文件名不同，请修改
  const contractName = 'MintableERC20';     // 如果你的合约名不同，请修改
  const contractPath = path.resolve(process.cwd(), 'contracts', contractFile);
  if (!fs.existsSync(contractPath)) {
    throw new Error(`未找到合约文件: ${contractPath}`);
  }
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      [contractFile]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] },
      },
    },
  };

  const raw = solc.compile(JSON.stringify(input),{import: findImports});
  const output: any = JSON.parse(raw);

  if (output.errors && output.errors.length) {
    const hasError = output.errors.some((e: any) => e.severity === 'error');
    output.errors.forEach((e: any) => console.error(e.formattedMessage || e.message));
    if (hasError) throw new Error('Solidity 编译失败');
  }

  const compiled = output.contracts?.[contractFile]?.[contractName];
  if (!compiled) {
    throw new Error(`未在编译结果中找到合约 ${contractName}`);
  }
  const abi = compiled.abi;
  const bytecode: string | undefined = compiled.evm?.bytecode?.object;
  if (!bytecode || bytecode === '0x') {
    throw new Error('未生成有效 bytecode，请检查合约与编译配置');
  }

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
  const env = fs.readFileSync("../.env", "utf8");
  let envContent = env.replace(/VITE_CONTRACT_ADDRESS=.*/, `VITE_CONTRACT_ADDRESS = "${address}"`);
  if (!envContent.includes(`VITE_CONTRACT_ADDRESS`)) {
    envContent += `\nVITE_CONTRACT_ADDRESS= "${address}"`;
  }
  console.log("VITE_CONTRACT_ADDRESS updated in .env file", envContent);
  fs.writeFileSync("../.env", envContent);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});