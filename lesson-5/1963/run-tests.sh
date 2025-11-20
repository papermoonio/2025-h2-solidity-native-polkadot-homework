#!/usr/bin/env bash
# Helper to run different test modes for uniswap-v2-polkadot
# Usage examples:
#   ./run-tests.sh localNode
#   ./run-tests.sh evm
#   ./run-tests.sh passetHub
#   ./run-tests.sh revm

MODE="$1"

if [ -z "$MODE" ]; then
  echo "Usage: $0 {localNode|evm|passetHub|revm|polkavm}"
  exit 1
fi

# ensure .env is loaded
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

case "$MODE" in
  localNode)
    echo "Running tests against localNode (Hardhat will spawn node if POLKA_NODE=true)"
    POLKA_NODE=true npx hardhat test --network localNode 2>&1 | tee test-results-localnode.txt
    ;;
  evm)
    echo "Running plain EVM tests (no polka node)"
    npx hardhat test 2>&1 | tee test-results-evm.txt
    ;;
  passetHub)
    echo "Running tests against passetHub (remote). Make sure AH_PRIV_KEY set in .env"
    POLKA_NODE=true RESOLC_VERSION=${RESOLC_VERSION:-0.8.28} npx hardhat test --network passetHub 2>&1 | tee test-results-passetHub.txt
    ;;
  revm)
    echo "Running tests with REVM + local polka node"
    POLKA_NODE=true REVM=true npx hardhat test 2>&1 | tee test-results-revm.txt
    ;;
  polkavm)
    echo "Running polkavm tests (POLKA_NODE=true)"
    POLKA_NODE=true npx hardhat test 2>&1 | tee test-results-polkavm.txt
    ;;
  *)
    echo "Unknown mode: $MODE"
    exit 2
    ;;
esac
