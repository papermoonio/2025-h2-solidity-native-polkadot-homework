const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const solc = require("solc");

function compileContract(sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "MintableERC20.sol": { content: source }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };

  function findImports(importPath) {
    // Handle node_modules imports like @openzeppelin/... and local relative imports
    try {
      const possiblePaths = [
        path.resolve(__dirname, "../", importPath),
        path.resolve(__dirname, "../contracts", importPath),
        path.resolve(__dirname, "../node_modules", importPath),
        path.resolve(__dirname, "../node_modules", importPath.replace(/^@/, "")),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          return { contents: fs.readFileSync(p, "utf8") };
        }
      }
      // Try resolving within node_modules for scoped packages
      const nmPath = path.resolve(__dirname, "../node_modules", importPath);
      if (fs.existsSync(nmPath)) {
        return { contents: fs.readFileSync(nmPath, "utf8") };
      }
    } catch (e) {
      return { error: e.message };
    }
    return { error: "File not found: " + importPath };
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (output.errors) {
    const fatal = output.errors.find((e) => e.severity === "error");
    if (fatal) {
      throw new Error(fatal.formattedMessage || fatal.message);
    }
  }

  const contractOutput = output.contracts["MintableERC20.sol"]["MintableERC20"];
  return {
    abi: contractOutput.abi,
    bytecode: "0x" + contractOutput.evm.bytecode.object
  };
}

async function main() {
  const name = process.env.TOKEN_NAME || "Mintable Token";
  const symbol = process.env.TOKEN_SYMBOL || "MTK";

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0); // Use first unlocked Hardhat account
  console.log("Deploying from:", await signer.getAddress());

  const sourcePath = path.resolve(__dirname, "../contracts/MintableERC20.sol");
  const { abi, bytecode } = compileContract(sourcePath);

  const Factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await Factory.deploy(name, symbol);
  const receipt = await contract.deploymentTransaction().wait();
  const address = await contract.getAddress();
  console.log(`MintableERC20 deployed at: ${address}`);
  console.log("Deployment tx:", receipt.hash);

  const output = { address, abi, name, symbol };
  const outDir = path.resolve(__dirname, "../../frontend");
  const outFile = path.resolve(outDir, "contract-info.json");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log("Wrote frontend contract info:", outFile);
}

main().catch((err) => {
  console.error("Deploy error:", err);
  process.exitCode = 1;
});