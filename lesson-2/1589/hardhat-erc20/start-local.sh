pkill substrate-node
pkill eth-rpc
rm local-logs/node.log
rm local-logs/rpc.log
../polkadot-sdk/target/release/substrate-node --dev --tmp --unsafe-rpc-external &>local-logs/node.log &
sleep 1
../polkadot-sdk/target/release/eth-rpc &>local-logs/rpc.log &

