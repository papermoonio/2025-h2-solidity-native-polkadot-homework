import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from "url";

// 等价于 CommonJS 的 __filename / __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.resolve(__dirname, '../artifacts/contracts/MintableERC20.sol/MintableERC20.json');
const destPath = path.resolve(__dirname, '../../Web/abi/MintableERC20.json');

if (!fs.existsSync(sourcePath)) {
  console.error('Error: Contract ABI not found. Please compile the contracts first:');
  console.error('  cd Contracts && npm run compile');
  process.exit(1);
}

// Ensure destination directory exists
const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy the file
fs.copyFileSync(sourcePath, destPath);
console.log('✓ ABI file copied successfully to Web/abi/MintableERC20.json');

