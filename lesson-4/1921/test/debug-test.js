import hre from "hardhat";

console.log("hre:", typeof hre);
console.log("hre keys:", Object.keys(hre));
console.log("hre.ethers:", typeof hre.ethers);

if (hre.ethers) {
  console.log("ethers keys:", Object.keys(hre.ethers));
}
