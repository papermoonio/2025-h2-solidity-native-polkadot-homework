const { task, types } = require("hardhat/config");
const { TASK_TEST } = require("hardhat/builtin-tasks/task-names");
const { spawn } = require("child_process");
const chalk = require("chalk");
const path = require("path");

// Task to manually start PVM node when REVM=true
task("start-pvm-node", "Start PVM node for EVM bytecode testing")
  .addOptionalParam("nodePort", "Node RPC port", 8000, types.int)
  .addOptionalParam("adapterPort", "Adapter RPC port", 8545, types.int)
  .setAction(async ({ nodePort, adapterPort }, hre) => {
    if (process.env.REVM !== "true" || process.env.POLKA_NODE !== "true") {
      console.log(chalk.yellow("This task is only for POLKA_NODE=true REVM=true mode"));
      return;
    }

    // Read from hardhat config
    const networkConfig = hre.config.networks.hardhat;
    const projectRoot = hre.config.paths.root;
    
    // Get paths from config or use defaults
    const nodeBinaryPath = networkConfig.nodeConfig?.nodeBinaryPath 
      ? path.resolve(projectRoot, networkConfig.nodeConfig.nodeBinaryPath)
      : path.resolve(projectRoot, "./bin/revive-dev-node");
    
    const adapterBinaryPath = networkConfig.adapterConfig?.adapterBinaryPath
      ? path.resolve(projectRoot, networkConfig.adapterConfig.adapterBinaryPath)
      : path.resolve(projectRoot, "../eth-rpc-darwin-arm64");
    
    // Use configured ports or provided parameters
    const finalNodePort = networkConfig.nodeConfig?.rpcPort || nodePort;
    const finalAdapterPort = adapterPort;

    console.log(chalk.blue("Starting PVM node for EVM mode..."));
    console.log(chalk.gray(`Node binary: ${nodeBinaryPath}`));
    console.log(chalk.gray(`Adapter binary: ${adapterBinaryPath}`));

    // Start substrate node
    const nodeArgs = [
      "--dev",
      "--rpc-port", finalNodePort.toString(),
      "--rpc-cors", "all", 
      "--rpc-methods", "unsafe",
    ];

    console.log(chalk.blue(`Starting Substrate node on port ${finalNodePort}...`));
    const nodeProcess = spawn(nodeBinaryPath, nodeArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false
    });

    nodeProcess.stdout.on('data', (data) => {
      console.log(chalk.gray(`[NODE] ${data.toString().trim()}`));
    });

    nodeProcess.stderr.on('data', (data) => {
      console.log(chalk.yellow(`[NODE] ${data.toString().trim()}`));
    });

    // Wait for node to start
    console.log(chalk.blue("Waiting for node to initialize..."));
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Start eth-rpc adapter
    const adapterArgs = [
      "--node-rpc-url", `ws://localhost:${finalNodePort}`,
      "--listen-addr", `0.0.0.0:${finalAdapterPort}`,
      "--dev"
    ];

    console.log(chalk.blue(`Starting ETH RPC adapter on port ${finalAdapterPort}...`));
    const adapterProcess = spawn(adapterBinaryPath, adapterArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false
    });

    adapterProcess.stdout.on('data', (data) => {
      console.log(chalk.gray(`[ADAPTER] ${data.toString().trim()}`));
    });

    adapterProcess.stderr.on('data', (data) => {
      console.log(chalk.yellow(`[ADAPTER] ${data.toString().trim()}`));
    });

    // Wait for adapter to start
    console.log(chalk.blue("Waiting for adapter to initialize..."));
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(chalk.green(`✅ PVM node running on ws://localhost:${finalNodePort}`));
    console.log(chalk.green(`✅ ETH RPC adapter running on http://localhost:${finalAdapterPort}`));
    console.log(chalk.blue("You can now run tests with: npx hardhat test"));
    console.log(chalk.gray("Press Ctrl+C to stop both services"));

    // Handle cleanup
    const cleanup = () => {
      console.log(chalk.yellow("Shutting down services..."));
      nodeProcess.kill('SIGTERM');
      adapterProcess.kill('SIGTERM');
      setTimeout(() => {
        nodeProcess.kill('SIGKILL');
        adapterProcess.kill('SIGKILL');
        process.exit(0);
      }, 3000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep the process alive
    await new Promise(() => {});
  });

// Check if PVM services are running
async function checkPVMServices(adapterPort = 8545) {
  try {
    const response = await fetch(`http://localhost:${adapterPort}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1
      })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Auto-start PVM node for tests when REVM=true
if (process.env.REVM === "true" && process.env.POLKA_NODE === "true") {
  task(TASK_TEST, async (args, hre, runSuper) => {
    // Force use of pvmevm network when REVM=true
    if (hre.network.name === "hardhat") {
      console.log(chalk.yellow("⚠️  Detected hardhat network in EVM mode"));
      console.log(chalk.yellow("🔄 Auto-switching to pvmevm network for PVM testing"));
      
      // Update network configuration properly
      Object.assign(hre.network.config, hre.config.networks.pvmevm);
      hre.network.name = "pvmevm";
      
      // Create a new provider with the pvmevm config
      const { createProvider } = require("hardhat/internal/core/providers/construction");
      hre.network.provider = await createProvider(
        hre.config,
        "pvmevm",
        hre.artifacts
      );
    }
    
    const isRunning = await checkPVMServices(8545);
    
    let nodeProcess, adapterProcess;
    
    if (!isRunning) {
      console.log(chalk.yellow("🚀 Starting PVM node for EVM mode..."));
      
      // Start the services
      const services = await startPVMServices(hre);
      nodeProcess = services.nodeProcess;
      adapterProcess = services.adapterProcess;
      
      // Wait for services to be ready
      console.log(chalk.blue("⏳ Waiting for services to be ready..."));
      let attempts = 0;
      const maxAttempts = 15; // Reduced from 30
      
      while (attempts < maxAttempts) {
        if (await checkPVMServices(8545)) {
          console.log(chalk.green("✅ PVM services are ready!"));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        if (nodeProcess) nodeProcess.kill();
        if (adapterProcess) adapterProcess.kill();
        throw new Error("PVM services failed to start within 15 seconds");
      }
    } else {
      console.log(chalk.green("✅ PVM node already running, using existing instance..."));
    }

    // Network config should already be set in hardhat.config.js
    console.log(chalk.gray(`Network URL: ${hre.network.config.url}`));
    console.log(chalk.gray(`Network name: ${hre.network.name}`));

    try {
      console.log(chalk.blue("🧪 Running tests with EVM artifacts on PVM..."));
      console.log(chalk.yellow("NOTE: Tests should be run with --network pvmevm to use PVM node"));
      console.log(chalk.yellow("Example: POLKA_NODE=true REVM=true npx hardhat test --network pvmevm"));
      
      const result = await runSuper(args);
      return result;
    } finally {
      // Clean up only if we started the services
      if (nodeProcess || adapterProcess) {
        console.log(chalk.yellow("🧹 Cleaning up PVM services..."));
        if (nodeProcess) nodeProcess.kill('SIGTERM');
        if (adapterProcess) adapterProcess.kill('SIGTERM');
        
        // Force kill after 3 seconds if needed
        setTimeout(() => {
          if (nodeProcess) nodeProcess.kill('SIGKILL');
          if (adapterProcess) adapterProcess.kill('SIGKILL');
        }, 3000);
      }
    }
  });
}

// Helper function to start PVM services
async function startPVMServices(hre, nodePort = 8000, adapterPort = 8545) {
  const networkConfig = hre.config.networks.hardhat;
  const projectRoot = hre.config.paths.root;
  
  // Read from config or use defaults
  const nodeBinaryPath = networkConfig.nodeConfig?.nodeBinaryPath 
    ? path.resolve(projectRoot, networkConfig.nodeConfig.nodeBinaryPath)
    : path.resolve(projectRoot, "../revive-dev-node-darwin-arm64");
  
  const adapterBinaryPath = networkConfig.adapterConfig?.adapterBinaryPath
    ? path.resolve(projectRoot, networkConfig.adapterConfig.adapterBinaryPath)
    : path.resolve(projectRoot, "../eth-rpc-darwin-arm64");
  
  // Use configured ports or provided parameters
  const finalNodePort = networkConfig.nodeConfig?.rpcPort || nodePort;
  const finalAdapterPort = adapterPort;

  console.log(chalk.gray(`Node binary: ${nodeBinaryPath}`));
  console.log(chalk.gray(`Adapter binary: ${adapterBinaryPath}`));

  // Check if binaries exist
  const fs = require('fs');
  if (!fs.existsSync(nodeBinaryPath)) {
    throw new Error(`Node binary not found: ${nodeBinaryPath}`);
  }
  if (!fs.existsSync(adapterBinaryPath)) {
    throw new Error(`Adapter binary not found: ${adapterBinaryPath}`);
  }

  // Start substrate node  
  const nodeArgs = [
    "--dev",
    "--rpc-port", finalNodePort.toString(),
    "--rpc-cors", "all", 
    "--rpc-methods", "unsafe"
  ];

  console.log(chalk.blue(`Starting Substrate node on port ${finalNodePort}...`));
  const nodeProcess = spawn(nodeBinaryPath, nodeArgs, {
    stdio: ["ignore", "ignore", "ignore"], // Silent mode
    detached: false
  });

  // Wait for node to initialize - reduced time
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start eth-rpc adapter
  const adapterArgs = [
    "--node-rpc-url", `ws://localhost:${finalNodePort}`,
    "--rpc-port", finalAdapterPort.toString(),
    "--rpc-cors", "all",
    "--dev"
  ];

  console.log(chalk.blue(`Starting ETH RPC adapter on port ${finalAdapterPort}...`));
  const adapterProcess = spawn(adapterBinaryPath, adapterArgs, {
    stdio: ["ignore", "ignore", "ignore"], // Silent mode
    detached: false
  });

  // Wait for adapter to initialize - reduced time
  await new Promise(resolve => setTimeout(resolve, 2000));

  return { nodeProcess, adapterProcess };
}

module.exports = {};