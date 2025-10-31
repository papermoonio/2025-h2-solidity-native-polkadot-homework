import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';

async function main(): Promise<void> {
  // 等待 crypto 初始化
  await cryptoWaitReady();

  // 创建 Keyring 实例，使用 sr25519 类型
  const keyring = new Keyring({ type: 'sr25519' });

  // 方法1：从 known dev URI（//Alice）
  const pair = keyring.addFromUri('//Alice');

  console.log('address:', pair.address);
  console.log('publicKey (hex):', u8aToHex(pair.publicKey));

  // 使用 pair.toRaw() 获取原始的密钥数据，包含私钥和公钥
  const raw = pair.toRaw();

  // raw.secretKey 是原始私钥的 Uint8Array，转成 hex 格式
  console.log('secretKey (hex):', u8aToHex(raw.secretKey));

  // 如果你有 seed hex（例如 subkey inspect 输出的 Secret seed），也可以：
  // const seedHex: string = '0x9c22ff5f...';  // 例如 Secret seed
  // const seedU8 = Uint8Array.from(Buffer.from(seedHex.slice(2), 'hex'));
  // const pair2 = keyring.addFromSeed(seedU8); 
  // console.log('secretKey2 (hex):', u8aToHex(pair2.toRaw().secretKey));
}

main().catch(console.error);
