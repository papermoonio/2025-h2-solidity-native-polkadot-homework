import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deployContract, polkaDev } from "../scripts/depLib.ts";
import { network } from "hardhat";


describe("Counter", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient({chain: polkaDev});
  const [client] = await viem.getWalletClients({chain: polkaDev});

  it("Should increment the counter by 1 when calling the inc() function", async function () {
    const [counterAddress] = await deployContract(client, publicClient, "Counter");
    
    const counter = await viem.getContractAt("Counter", counterAddress, {
      client: {
        wallet: client,
        public: publicClient,
      },
    });
    
    const beforeInc = await counter.read.x();
    console.log("beforeInc", beforeInc);
    assert.equal(beforeInc, 0n, "initial counter should be 0");
    
    const txHash = await counter.write.inc();
    console.log("inc tx hash:", txHash);
  });
});

// describe("DelegateCall", async function () {
//   const { viem } = await network.connect();
//   const publicClient = await viem.getPublicClient({chain: polkaDev});
//   const [client] = await viem.getWalletClients({chain: polkaDev});


//   it("Should increment the counter by 1 when calling the callInc() function", async function () {
//     const [logicAddress] = await deployContract(client, publicClient, "Logic");
//     const [proxyAddress, contract] = await deployContract(client, publicClient, "Proxy", [logicAddress]);
    
//     const proxy = await viem.getContractAt("Proxy", proxyAddress, {
//       client: {
//         wallet: client,
//         public: publicClient,
//       },
//     });
    
    
//     // 读取初始 counter 值（应该是 100，因为构造函数中设置了 counter = 100）
//     const beforeInc = await proxy.read.counter();
//     console.log("beforeInc", beforeInc);
//     assert.equal(beforeInc, 100n, "initial counter should be 100");
    
//     // 调用 callInc
//     const txHash = await proxy.write.callInc();
//     console.log("callInc tx hash:", txHash);
    
//     // 等待交易确认
//     await publicClient.waitForTransactionReceipt({ hash: txHash });
    
//     // 读取更新后的 counter 值
//     const counter = await proxy.read.counter();
//     console.log("afterInc", counter);
//     assert.equal(counter, beforeInc + 1n, "counter should increment by 1");
//   });

// });
