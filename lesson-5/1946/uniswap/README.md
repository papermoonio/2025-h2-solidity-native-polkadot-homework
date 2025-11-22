# Sample Polkadot Hardhat Project

This project demonstrates how to use Hardhat with Polkadot. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

1) Create a binary of the [`eth-rpc-adapter`](https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/revive/rpc) and move it to `bin` folder at the root of your project. Alternatively, update your configuration file's `adapterConfig.adapterBinaryPath` to point to your local binary. For instructions, check [Polkadot Hardhat docs](https://papermoonio.github.io/polkadot-mkdocs/develop/smart-contracts/dev-environments/hardhat/#testing-your-contract).

2) Try running some of the following tasks:

```shell
npx hardhat test
npx hardhat node
npx hardhat node && npx hardhat ignition deploy ./ignition/modules/MyToken.js --network localhost
```
npx hardhat test  --network localNode



  UniswapV2ERC20
    ✔ name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH
    ✔ approve
    ✔ transfer
    ✔ transfer:fail
    ✔ transferFrom
    ✔ transferFrom:max

  UniswapV2Factory
    ✔ feeTo, feeToSetter, allPairsLength
    ✔ createPair
    ✔ createPair:reverse
    ✔ setFeeTo
    ✔ setFeeToSetter

  UniswapV2Pair
    ✔ mint (44ms)
    ✔ getInputPrice:0 (47ms)
    ✔ getInputPrice:1 (38ms)
    ✔ getInputPrice:2 (45ms)
    ✔ getInputPrice:3 (41ms)
    ✔ getInputPrice:4 (43ms)
    ✔ getInputPrice:5 (40ms)
    ✔ getInputPrice:6 (38ms)
    ✔ optimistic:0
    ✔ optimistic:1
    ✔ optimistic:2
    ✔ optimistic:3
    ✔ swap:token0 (48ms)
    ✔ swap:token1 (38ms)
    ✔ burn (52ms)
    ✔ feeTo:off (50ms)
    ✔ feeTo:on (56ms)


  28 passing (3s)