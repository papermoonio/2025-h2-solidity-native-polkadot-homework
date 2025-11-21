import { ethers } from "ethers";
import { ABI, BYTECODE } from "./erc20";
import { beforeEach } from "node:test";

async function transferEther(provider: ethers.Provider, wallet: ethers.Wallet, to: string, amount: bigint) {
    const tx = await wallet.sendTransaction({
        to: to,
        value: amount,
    });
    await tx.wait();
    console.log(`Transferred ${ethers.formatEther(amount)} ETH to ${to}. Transaction hash: ${tx.hash}`);
    
    const senderBalance = await provider.getBalance(wallet.address);
    console.log("Sender balance (in ether):", ethers.formatEther(senderBalance));
    const receiverBalance = await provider.getBalance(to);
    console.log("Receiver balance (in ether):", ethers.formatEther(receiverBalance));
}

async function transferTokens(contract: ethers.Contract, to: string, amount: bigint) {
    const tokenName = await contract.getFunction('name')();
    const tx = await contract.getFunction('transfer')(to, amount);
    await tx.wait();
    console.log(`Transferred ${amount} tokens to ${to}. Transaction hash: ${tx.hash}`);
    const senderBalance = await contract.getFunction('balanceOf')((contract.runner as ethers.Wallet).address);
    console.log(`Sender's ${tokenName} token balance:`, senderBalance.toString());
    const receiverBalance = await contract.getFunction('balanceOf')(to);
    console.log(`Receiver's ${tokenName} token balance:`, receiverBalance.toString());
}

async function main() {
    const url = "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(url);

    provider.on("block", (blockNumber) => { // 监控新区块产生
        console.log("New block mined:", blockNumber);
    });

    const blockNumber = await provider.getBlockNumber();
    console.log("Current block number:", blockNumber);
    const privateKey = `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`;
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = wallet.address;
    console.log("Wallet address:", address);
    const balance = await provider.getBalance(address);
    const formatBalance = ethers.formatEther(balance);
    console.log("Wallet balance (in ether):", formatBalance);
    const nonce = await provider.getTransactionCount(address);
    console.log("Transaction count (nonce):", nonce);

    const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
    const contract = await factory.deploy("MyToken", "MTK", 18, 1000000);
    await contract.waitForDeployment();
    console.log("Contract deployed at address:", contract.target);

    const deployedContract = new ethers.Contract(contract.target, ABI, wallet);
    console.log("Deployed Contract Address:", deployedContract);
    const totalSupply0 = await deployedContract.getFunction('totalSupply')(); // 运行安全性更高的写法
    console.log("Contract:", totalSupply0.toString());
    const totalSupply = await deployedContract.totalSupply!(); // 加上 ! ，强制告诉TS不会是undefined
    console.log("Total Supply:", totalSupply.toString());

    transferTokens(deployedContract, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", 1000000000n);


}

main().catch((error) => {
    console.error(error);
})