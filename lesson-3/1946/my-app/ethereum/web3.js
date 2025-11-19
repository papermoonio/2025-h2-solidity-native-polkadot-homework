const ethers = require("ethers");

const web3 = () => {
  if (typeof ethereum !== "undefined") {
    return new ethers.providers.Web3Provider(ethereum);
  }
  // We are on the server *OR* the user is not running metamask
  // return new ethers.providers.StaticJsonRpcProvider("http://10.0.0.11:8545", {
  //   chainId: 420420420,
  //   name: "local",
  // });
};

export default web3;
