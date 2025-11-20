// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Library.sol";

/**
 * @title Caller
 * @notice This contract demonstrates the difference between call and delegatecall
 *         When using call: Library's storage is modified
 *         When using delegatecall: Caller's storage is modified
 */
contract Caller {
    // Storage variable in the Caller contract
    uint256 public callerValue;

    Library public libraryContract;

    // Events to track which storage was modified
    event CallExecuted(uint256 libraryValue, uint256 callerValue);
    event DelegateCallExecuted(uint256 libraryValue, uint256 callerValue);

    /**
     * @notice Constructor that sets the library contract address
     * @param _libraryAddress The address of the Library contract
     */
    constructor(address _libraryAddress) {
        libraryContract = Library(_libraryAddress);
    }

    /**
     * @notice Uses call to execute setValue on Library contract
     * @param _value The value to set
     * @dev With call, Library's storage (libraryValue) is modified, not Caller's
     */
    function executeCall(uint256 _value) public {
        // Using call - executes in Library's context
        (bool success, ) = address(libraryContract).call(
            abi.encodeWithSignature("setValue(uint256)", _value)
        );
        require(success, "Call failed");

        // After call: Library's libraryValue changes, Caller's callerValue does NOT
        emit CallExecuted(libraryContract.getValue(), callerValue);
    }

    /**
     * @notice Uses delegatecall to execute setValue on Library contract
     * @param _value The value to set
     * @dev With delegatecall, Caller's storage (callerValue) is modified, not Library's
     *      This is because delegatecall uses the calling contract's storage context
     */
    function executeDelegateCall(uint256 _value) public {
        // Using delegatecall - executes in Caller's context
        // The library code runs but uses Caller's storage
        (bool success, ) = address(libraryContract).delegatecall(
            abi.encodeWithSignature("setValue(uint256)", _value)
        );
        require(success, "DelegateCall failed");

        // After delegatecall: Caller's callerValue changes (because storage slot matches),
        // Library's libraryValue does NOT change
        emit DelegateCallExecuted(libraryContract.getValue(), callerValue);
    }

    /**
     * @notice Gets the caller's value
     * @return The current callerValue
     */
    function getCallerValue() public view returns (uint256) {
        return callerValue;
    }

    /**
     * @notice Gets the library's value
     * @return The current libraryValue from Library contract
     */
    function getLibraryValue() public view returns (uint256) {
        return libraryContract.getValue();
    }
}
