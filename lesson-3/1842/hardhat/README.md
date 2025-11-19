# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

-   A simple Hardhat configuration file.
-   TypeScript integration tests using `mocha` and ethers.js
-   Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can run`mocha` tests:

```shell
npx hardhat test mocha
```

### Make a deployment to Paseo

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Paseo.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/MintableERC20.ts
```

To run the deployment to Paseo, you need an account with funds to send the transaction.

You need to set the `PASEO_RPC_URL` and `PASEO_PRIVATE_KEY` variables in .env file as environment variables.

After setting the variables, you can run the deployment with the Paseo network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/MintableERC20.ts

```
