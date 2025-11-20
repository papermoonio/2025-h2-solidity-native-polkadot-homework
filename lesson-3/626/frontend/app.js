const state = {
  provider: null,
  signer: null,
  account: null,
  contract: null,
  info: null,
};

async function loadContractInfo() {
  const res = await fetch('./contract-info.json');
  const json = await res.json();
  state.info = json;
  document.getElementById('addr').textContent = json.address;
  document.getElementById('token').textContent = `${json.name} (${json.symbol})`;
}

async function connect() {
  if (!window.ethereum) {
    setStatus('请安装或打开 MetaMask');
    return;
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  state.provider = new ethers.BrowserProvider(window.ethereum);
  state.signer = await state.provider.getSigner();
  state.account = await state.signer.getAddress();
  document.getElementById('account').textContent = state.account;

  const { address, abi } = state.info;
  state.contract = new ethers.Contract(address, abi, state.signer);

  await refresh();
}

function setStatus(msg) {
  const el = document.getElementById('status');
  el.textContent = msg || '';
}

async function refresh() {
  if (!state.contract || !state.account) return;
  try {
    const bal = await state.contract.balanceOf(state.account);
    const ts = await state.contract.totalSupply();
    document.getElementById('balance').textContent = ethers.formatUnits(bal, 18);
    document.getElementById('totalSupply').textContent = ethers.formatUnits(ts, 18);
    setStatus('');
  } catch (e) {
    setStatus('读取失败：' + (e.info?.error?.message || e.message));
  }
}

async function mintSelf() {
  if (!state.contract || !state.account) {
    setStatus('请先连接钱包');
    return;
  }
  const v = document.getElementById('amount').value;
  if (!v || Number(v) <= 0) {
    setStatus('请输入正确的数量');
    return;
  }
  try {
    setStatus('交易提交中…');
    const amt = ethers.parseUnits(v, 18);
    const tx = await state.contract.mint(state.account, amt);
    await tx.wait();
    setStatus('铸造成功：' + tx.hash);
    await refresh();
  } catch (e) {
    // 非所有者会报错
    setStatus('铸造失败：' + (e.info?.error?.message || e.message));
  }
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('mintSelf').addEventListener('click', mintSelf);
document.getElementById('refresh').addEventListener('click', refresh);

loadContractInfo().catch(err => setStatus('加载合约信息失败：' + err.message));