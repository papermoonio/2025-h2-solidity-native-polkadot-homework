import web3 from "./web3.js";
import { ethers } from "ethers";
import mintableERC20 from "./abi/mintableERC20.json";
// Create provider
const provider = web3();

// Create signer from private key and connect to provider
const signer = new ethers.Wallet(
  "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
  provider
);

const tokenInstance = (address) => {
  return new ethers.Contract(address, mintableERC20.abi, provider.getSigner());
};

export default tokenInstance;
