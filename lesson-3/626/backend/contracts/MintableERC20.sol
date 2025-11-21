// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MintableERC20 is ERC20 {
    mapping(address => uint256) public lastMintTime;
    uint256 public interval;
    address public owner;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _mint(msg.sender, 100000000000000000000000); // 100,000 tokens with 18 decimals
        owner = msg.sender;
        interval = 3600; // 1 hour
    }

    function mintToken() public {
        require(
            lastMintTime[msg.sender] == 0 ||
                block.timestamp > lastMintTime[msg.sender] + interval,
            "You need to wait an hour between mints"
        );
        _mint(msg.sender, 100000000000000000000); // 100 tokens with 18 decimals
        lastMintTime[msg.sender] = block.timestamp;
    }

    function ownerMint(address _target, uint256 _amount) public onlyOwner {
        _mint(_target, _amount);
    }

    // Backward-compatible alias for frontend calls
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function canMint(address _address) public view returns (bool) {
        return lastMintTime[_address] == 0 || block.timestamp > lastMintTime[_address] + interval;
    }

    function setInterval(uint256 _newInterval) public onlyOwner {
        interval = _newInterval;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}