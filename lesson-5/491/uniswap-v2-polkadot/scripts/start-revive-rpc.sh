#!/usr/bin/env zsh

pkill rpc-node
pkill revive-dev-node

SCRIPT_PATH="${(%):-%N}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
echo "Script dir:  $SCRIPT_DIR"

rm -rf "${SCRIPT_DIR}/logs/*"
mkdir -p "${SCRIPT_DIR}/logs"

${SCRIPT_DIR}/../bin/revive-dev-node --dev --tmp --unsafe-rpc-external &> ${SCRIPT_DIR}/logs/revive-dev-node.log &
${SCRIPT_DIR}/../bin/eth-rpc --log eth-rpc=TRACE &> ${SCRIPT_DIR}/logs/rpc.log &
