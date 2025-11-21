// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Library
 * @notice This contract demonstrates a library that modifies storage
 *         Used to show the difference between call and delegatecall
 */
contract Library {
    // Storage variable in the Library contract
    uint256 public libraryValue;

    /**
     * @notice Sets a value in storage
     * @param _value The value to set
     * @dev This function modifies storage variable libraryValue
     */
    function setValue(uint256 _value) public {
        libraryValue = _value;
    }

    /**
     * @notice Gets the current value
     * @return The current libraryValue
     */
    function getValue() public view returns (uint256) {
        return libraryValue;
    }
}
