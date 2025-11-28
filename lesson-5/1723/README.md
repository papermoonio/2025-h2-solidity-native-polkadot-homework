 - 缺少依赖
pnpm install hardhat@2.27.0

 - gas费问题
在UniswapV2ERC20.js、UniswapV2Factory.js、UniswapV2Pair.js中增加代码
```javascript
other = ethers.Wallet.createRandom().connect(ethers.provider);
await wallet.sendTransaction({
    to: other.address,
    value: ethers.parseEther("10")
});
```

