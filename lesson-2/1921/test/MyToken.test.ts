import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData } from "viem";

describe("KKToken", () => {
  const NAME = "KKToken";
  const SYMBOL = "KKJUSDOIT";
  const DECIMALS = 18;
  const INITIAL_SUPPLY = "1000";

  let owner: string;
  let addr1: string;
  let addr2: string;
  let ownerClient: any;
  let addr1Client: any;
  let addr2Client: any;
  let token: any;
  let viem: any;

  beforeEach(async () => {
    const conn = await network.connect();
    viem = conn.viem;
    const publicClient = await viem.getPublicClient();
    const wallets = await viem.getWalletClients();
    [ownerClient, addr1Client, addr2Client] = wallets;
    owner = ownerClient.account.address;
    addr1 = addr1Client.account.address;
    addr2 = addr2Client.account.address;

    token = await viem.deployContract("KKToken", [
      NAME,
      SYMBOL,
      DECIMALS,
      INITIAL_SUPPLY,
    ]);
  });

  const initial = BigInt(INITIAL_SUPPLY) * 10n ** BigInt(DECIMALS);

  it("初始化 name/symbol/decimals/totalSupply 并把余额给部署者", async () => {
    const expectedTotal = BigInt(INITIAL_SUPPLY) * 10n ** BigInt(DECIMALS);

    assert.strictEqual(await token.read.name(), NAME);
    assert.strictEqual(await token.read.symbol(), SYMBOL);
    assert.strictEqual(Number(await token.read.decimals()), DECIMALS);

    const totalSupply = await token.read.totalSupply();
    assert.strictEqual(totalSupply.toString(), expectedTotal.toString());

    const balanceOfOwner = await token.read.balanceOf([owner]);
    assert.strictEqual(balanceOfOwner.toString(), expectedTotal.toString());
  });

  it("ERC20: moves tokens from one account to another", async () => {
    const amount = BigInt(100) * 10n ** BigInt(DECIMALS);
    await token.write.transfer([addr1, amount]);
    const balanceOfOwner = await token.read.balanceOf([owner]);
    assert.strictEqual(balanceOfOwner.toString(), (initial - amount).toString());

    const balanceOfAddr1 = await token.read.balanceOf([addr1]);
    assert.strictEqual(balanceOfAddr1.toString(), amount.toString());


  });

  it("ERC20: transfer to the zero address", async () => {
    const amount = BigInt(100) * 10n ** BigInt(DECIMALS);

    await assert.rejects(
    
      token.write.transfer(["0x0000000000000000000000000000000000000000", amount]),
        /ERC20: transfer to the zero address/

    );
  });

  it("ERC20: insufficient balance", async () => {
    const largeAmount = BigInt(10000) * 10n ** BigInt(DECIMALS);

    await assert.rejects(async () => {
      await token.write.transfer([addr2, largeAmount], { walletClient: addr1Client });
    }, /ERC20: insufficient balance/);

  });

  it("ERC20: transferFrom", async () => {
    
    // 定义转账金额：100个代币（乘以10^18得到最小单位）
    const amount = BigInt(100) * 10n ** BigInt(DECIMALS);
    
    // 第1步：owner 授权 addr1 可以代理转账 amount 数量的代币
    await token.write.approve([addr1, amount]);
    
    // 第2步：使用 encodeFunctionData 手动构造交易数据
    // 这确保交易是由 addr1Client 发送的（而不是默认的 owner）
    const data = encodeFunctionData({
      abi: token.abi,                    // 合约ABI，包含函数签名
      functionName: "transferFrom",      // 要调用的函数名
      args: [owner, addr2, amount],      // 函数参数：从owner转给addr2，数量amount
    });
    
    // 第3步：addr1Client 发送交易到合约地址
    // 这等同于 addr1 调用 transferFrom(owner, addr2, amount)
    await addr1Client.sendTransaction({ to: token.address, data });
    
    // 验证1：owner 的余额应该减少了 amount
    const balanceOfOwner = await token.read.balanceOf([owner]);
    assert.strictEqual(balanceOfOwner.toString(), (initial - amount).toString());

    // 验证2：addr2 的余额应该增加了 amount（从0变成amount）
    const balanceOfAddr2 = await token.read.balanceOf([addr2]);
    assert.strictEqual(balanceOfAddr2.toString(), amount.toString());

    // 验证3：授权额度应该被消耗完，变成0
    // （因为 transferFrom 会扣减 allowance）
    const allowance = await token.read.allowance([owner, addr1]);
    assert.strictEqual(allowance.toString(), "0");
  });

});