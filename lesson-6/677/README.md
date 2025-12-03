
## 漏洞及攻擊方式的解釋說明

### 測試 screencap
![](https://github.com/MartinYeung5/2025-h2-solidity-native-polkadot-homework/blob/main/lesson-6/677/task6_screencap.png)

### 漏洞合約：VulnerableBank.sol
* 這是一個存在重入漏洞的銀行合約。漏洞核心在於 withdraw() 函數的執行順序錯誤。

#### 有漏洞的代碼邏輯
```
function withdraw() external {
    // 1. 檢查：確認用戶有餘額
    uint256 balance = balances[msg.sender];
    require(balance > 0, "Insufficient balance");
    
    // 2. 交互：先發送資金給用戶
    (bool success, ) = msg.sender.call{value: balance}("");
    require(success, "Transfer failed");
    
    // 3. 效果：後更新用戶餘額為0
    balances[msg.sender] = 0;
}
```

#### 漏洞分析: 正常的智能合約安全模式應該是 "檢查-效果-交互" (Checks-Effects-Interactions)：
* 檢查：驗證所有前提條件
* 效果：更新合約內部狀態
* 交互：與外部合約或地址交互

但 VulnerableBank 的執行順序是 "檢查-交互-效果"，這種順序錯誤導致了致命漏洞。

### 攻擊合約：AttackContract.sol
* 攻擊原理: 攻擊者創建一個惡意合約，利用以太坊的兩個關鍵特性：
1. 當合約接收以太幣時，會自動執行 receive() 或 fallback() 函數
2. 合約可以在函數執行期間調用其他合約

#### 攻擊流程圖解
```
開始攻擊 (存入0.1 ETH)
    │
    ▼
VulnerableBank.withdraw() 第一次調用
    │
    ├─ 檢查：攻擊者有0.1 ETH餘額 ✓
    │
    ├─ 交互：發送0.1 ETH給攻擊合約
    │   │
    │   └─ 觸發攻擊合約的 receive() 函數
    │       │
    │       ├─ 攻擊計數+1
    │       │
    │       └─ 條件檢查：銀行餘額≥1 ETH？✓
    │           │
    │           └─ 再次調用 VulnerableBank.withdraw()
    │               │
    │               ├─ 檢查：攻擊者餘額仍為0.1 ETH（未更新）✓
    │               │
    │               ├─ 交互：再次發送0.1 ETH
    │               │   └─ 再次觸發 receive()...
    │               │
    │               └─ 循環繼續...
    │
    └─ 效果：餘額設為0（但永遠不會執行到這裡）
```

#### 逐步攻擊說明
第一步：初始設置
1. 攻擊者部署 AttackContract
2. 攻擊者向 AttackContract 傳入 VulnerableBank 地址
3. 其他用戶向 VulnerableBank 存入資金（假設共存入3 ETH）

第二步：發動攻擊
```
// 攻擊者執行：
attackContract.startAttack{value: 0.1 ETH}();

// 攻擊合約內部：
1. 向 VulnerableBank 存入 0.1 ETH
2. 調用 VulnerableBank.withdraw()
```

第三步：重入循環開始
```
第1輪：
- VulnerableBank 檢查：攻擊者餘額 = 0.1 ETH ✓
- VulnerableBank 發送 0.1 ETH → 觸發 AttackContract.receive()
- AttackContract.receive()：攻擊次數+1，檢查銀行餘額(3 ETH)≥1 ETH ✓
- AttackContract 再次調用 VulnerableBank.withdraw()

第2輪：
- VulnerableBank 檢查：攻擊者餘額 = 0.1 ETH（仍未更新）✓
- VulnerableBank 發送 0.1 ETH → 再次觸發 receive()
- AttackContract.receive()：攻擊次數+1，檢查銀行餘額(2.9 ETH)≥1 ETH ✓
- AttackContract 再次調用 VulnerableBank.withdraw()

...循環繼續...

第21輪：
- VulnerableBank 檢查：攻擊者餘額 = 0.1 ETH ✓
- VulnerableBank 發送 0.1 ETH → 觸發 receive()
- AttackContract.receive()：攻擊次數+1，檢查銀行餘額(0.9 ETH)≥1 ETH ✗
- 停止調用 withdraw()，攻擊結束
```

第四步：提取盜取資金
* 攻擊者調用 withdrawStolenFunds() 提取所有盜取的資金。

### 為什麼這個攻擊能成功？
1. 狀態更新的時機問題
* 關鍵在於 balances[msg.sender] = 0 這行程式碼在資金轉賬 之後 才執行。這給了攻擊者一個時間窗口，在餘額被清零之前多次提款。

2. 以太幣轉賬的副作用
當使用 call{value: amount}("") 發送以太幣時：
* 如果接收方是普通地址：什麼都不會發生
* 如果接收方是合約地址：會自動觸發該合約的 receive() 或 fallback() 函數

攻擊者正是利用了這個特性，在 receive() 函數中編寫了惡意代碼。

3. 合約的遞歸調用
攻擊合約在 receive() 函數中再次調用 VulnerableBank.withdraw()，形成了遞歸調用。由於每次調用時，攻擊者的餘額都還沒被清零，所以可以不斷重複提取。

4. Gas 限制的逃避
攻擊者通過條件判斷 if (address(targetBank).balance >= 1 ether) 確保在銀行資金不足時停止攻擊，避免因 Gas 耗盡而失敗。

### 攻擊的數學結果
假設初始狀態：
* 銀行總資金：3 ETH
* 攻擊者初始存款：0.1 ETH
* 每次提款金額：0.1 ETH

攻擊過程：
```
攻擊次數  銀行餘額  累計盜取
1        2.9 ETH   0.1 ETH
2        2.8 ETH   0.2 ETH
3        2.7 ETH   0.3 ETH
...
20       1.0 ETH   2.0 ETH
21       0.9 ETH   2.1 ETH（停止）
```

最終結果：
* 攻擊者僅存入 0.1 ETH
* 攻擊者盜取 2.1 ETH
* 銀行損失 2.1 ETH
* 銀行剩餘 0.9 ETH
* 攻擊次數：21次

### 安全修復：SafeBank.sol
修復方案1：互斥鎖
```
bool private _locked;

modifier noReentrant() {
    require(!_locked, "No reentrancy");
    _locked = true;
    _;
    _locked = false;
}

function withdraw() external noReentrant {
    uint256 balance = balances[msg.sender];
    require(balance > 0, "Insufficient balance");
    
    // 先更新狀態
    balances[msg.sender] = 0;
    
    // 後發送資金
    (bool success, ) = msg.sender.call{value: balance}("");
    require(success, "Transfer failed");
}
```

#### 為什麼修復後能防止攻擊？
1. 互斥鎖機制：設置一個布爾鎖，確保同一時間只能執行一次關鍵操作。
2. 先更新狀態：在發送資金之前先將餘額設為0，即使攻擊者嘗試重入，餘額檢查也會失敗。
3. 控制流安全：確保外部調用發生在狀態更新之後，攻擊者無法利用未更新的狀態。


### 開發安全建議
1. 代碼層面
* 始終遵循檢查-效果-交互模式
* 限制外部調用：儘量避免在關鍵操作中進行外部調用

2. 測試層面
* 編寫專門的重入攻擊測試
* 使用靜態分析工具：Slither、Mythril
* 進行安全審計：尤其是涉及資金操作的合約

3. 架構層面
* 推拉支付模式：讓用戶主動提取，而不是合約主動發送
* 速率限制：限制單個地址的操作頻率
* 總額限制：限制單次操作的最大金額
