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

    // 获取签名者（连接的钱包）
    // 注意：getSigner() 在 ethers v5 中是同步的，但需要用户已连接钱包
    let signer;
    try {
      signer = provider.getSigner();
    } catch (error) {
      console.error("No signer available - user may not be connected:", error.message);
      return null;
    }

    const contract = new ethers.Contract(address, mintableERC20.abi, signer);
    console.log("Contract instance created for address:", address);

    // 异步检查网络连接（不阻塞函数返回）
    provider.getNetwork().then(network => {
      console.log("Network:", network.name, "Chain ID:", network.chainId);
    }).catch(error => {
      console.error("Failed to get network info:", error.message);
    });

    return contract;
  } catch (error) {
    console.error("Failed to create contract instance:", error);
    return null;
  }
};

export default tokenInstance;
