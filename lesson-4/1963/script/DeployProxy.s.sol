   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {LogicV1} from "../src/LogicV1.sol";
import {ERC1967Proxy} from "../src/ERC1967Proxy.sol";

   contract DeployProxy is Script {
       function run() external {
           // Start broadcast - private key will be provided via --private-key flag
           // This avoids issues with envUint parsing
           vm.startBroadcast();

           // Deploy LogicV1 implementation
           LogicV1 v1 = new LogicV1();
           console.log("LogicV1 deployed at:", address(v1));

          // Deploy proxy pointing to v1
          ERC1967Proxy proxy = new ERC1967Proxy(address(v1));
          console.log("Proxy deployed at:", address(proxy));
          console.log("Proxy admin:", proxy.admin());
          console.log("Proxy implementation:", proxy.implementation());

           vm.stopBroadcast();
       }
   }