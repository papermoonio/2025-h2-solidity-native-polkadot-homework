const ethers = require("ethers");

const web3 = () => {
  if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
    try {
      // 检查网络连接
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log("Web3 provider created successfully");
      return provider;
    } catch (error) {
      console.error("Error creating Web3 provider:", error);
      return null;
    }
  }
  // We are on the server *OR* the user is not running metamask
  console.log("No Ethereum provider found");
  return null;
};

export default web3;