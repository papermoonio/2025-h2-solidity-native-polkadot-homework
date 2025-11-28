require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.28",
    networks: {
        hardhat: {
            chainId: 1337
        },
        passethub: {
            url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
            chainId: 420420422,
            accounts: [
                "fd66e3b4fa7ccd17eac97851d2bfb48b21288a4964947aaea1b3608cfbcea973",
                "2be7c402d4a3be09eed1828db5e78adfe542e4676de27b5a29231e5776245679"
            ],
            type: "http",
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
