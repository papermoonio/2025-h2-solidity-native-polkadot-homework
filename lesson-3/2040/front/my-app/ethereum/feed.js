import web3 from "./web3.js";
import { ethers } from "ethers";
import mintableERC20 from "./abi/mintableERC20.json";

const tokenInstance = (address) => {
  try {
    const provider = web3();
    if (!provider) {
      console.error("No provider available");
      return null;
    }
    
    // 检查是否已连接到网络
    const network = provider.network;
    if (!network) {
      console.error("Provider not connected to network");
      return null;
    }
    
    // Use the provider's signer (connected wallet) for transactions
    const signer = provider.getSigner();
    if (!signer) {
      console.error("No signer available");
      return null;
    }
    
    const contract = new ethers.Contract(address, mintableERC20.abi, signer);
    console.log("Contract instance created for address:", address);
    return contract;
  } catch (error) {
    console.error("Failed to create contract instance:", error);
    return null;
  }
};

export default tokenInstance;