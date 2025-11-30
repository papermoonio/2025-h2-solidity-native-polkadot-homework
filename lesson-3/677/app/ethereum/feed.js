import web3 from './web3.js';
const MintableERC20 = require('./abi/MintableERC20.json');
const ethers = require('ethers');

const tokenInstace = (address) => {
   return new ethers.Contract(address, MintableERC20.abi, web3().getSigner());
};

export default tokenInstace;
