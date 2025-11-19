import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import solc from 'solc';
import { createWalletClient, createPublicClient, http, parseUnits, defineChain} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

dotenv.config();

async function main() {
    const PRIVATE_KEY = process.env.LOCAL_PRIV_KEY;
    if (!PRIVATE_KEY) {
        throw new Error('请在 .env 中设置 LOCAL_PRIV_KEY');
    }
    const normalizedPk = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    const account = privateKeyToAccount(normalizedPk as `0x${string}`);
    const rpcUrl = 'http://127.0.0.1:8545';
    const localhost = defineChain({
        id: 420420420,
        name: 'localhost',
        nativeCurrency: {
            decimals: 18,
            name: 'DOT',
            symbol: 'DOT',
        },
        rpcUrls: {
            default: { http: [rpcUrl] },
        },

    })
    // 1) 编译合约（不使用 Hardhat）
    const contractFile = 'ERC20.sol';
    const contractName = 'ERC20';
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

    const compiledRaw = solc.compile(JSON.stringify(input));
    const output: any = JSON.parse(compiledRaw);

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

    // 2) 建立客户端（localhost 默认 127.0.0.1:8545）
    const walletClient = createWalletClient({
        account,
        transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({
        transport: http(rpcUrl),
    });

    // 3) 部署（构造函数: (name, symbol, decimals, initialSupply)）
    const NAME = 'SampleToken';
    const SYMBOL = 'STK';
    const DECIMALS = 18;
    const INITIAL = parseUnits('1000000', DECIMALS); // 1,000,000 * 10^decimals

    const hash = await walletClient.deployContract({
        abi, 
        chain:localhost,
        bytecode: `0x${bytecode}`,
        args: [NAME, SYMBOL, DECIMALS, INITIAL],
    });
    console.log('部署交易已发送, tx:', hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
        throw new Error('未在回执中获得合约地址');
    }
    console.log('合约已部署到地址:', receipt.contractAddress);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});