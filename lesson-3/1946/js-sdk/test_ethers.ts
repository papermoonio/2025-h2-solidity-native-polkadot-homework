import { ethers } from "ethers";
import { ABI, BYTECODE } from "./erc20";
async function main() {
  const url = "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(url);
  const blockNumber = await provider.getBlockNumber();
  const privateKey =
    "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133";
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = wallet.address;
  //   const balance = await provider.getBalance(address);
  //   console.log(`balance is ${balance}`);

  //   const nonce = await provider.getTransactionCount(address);
  //   console.log(`nonce is ${nonce}`);

  //   const transfer = {
  //     to: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
  //     value: ethers.parseEther("1.0"),
  //   };
  //   const tx = await wallet.sendTransaction(transfer);
  //   await tx.wait();
  //   console.log(`Transaction hash: ${tx.hash}`);

  //   const receiverBalance = await provider.getBalance(
  //     "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2"
  //   );
  //   console.log(`receiverBalance is ${receiverBalance}`);

  //   const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
  //   const contract = await factory.deploy("name", "symbol", 18, 10000000);
  //   await contract.waitForDeployment();
  //   const contractAddress = contract.target.toString();
  //   console.log(`contractAddress is ${contractAddress}`);

  //   const deployedContract = new ethers.Contract(contractAddress, ABI, wallet);
  //   const tx = await deployedContract.transfer(
  //     "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
  //     1000000
  //   );
  //   await tx.wait();

  //   const receiverBalance = await deployedContract.balanceOf(
  //     "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2"
  //   );
  //   console.log(`receiverBalance is ${receiverBalance}`);

  provider.on("block", (blockNumber) => {
    console.log(`blockNumber is ${blockNumber}`);
    if (blockNumber >= 700) {
      provider.off("block");
    }
  });
}

main().catch((error) => {
  console.error(error);
});
