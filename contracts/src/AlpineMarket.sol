// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AlpinePool, IAlpineOracle} from "./AlpinePool.sol";

contract AlpineWrappedAVAX is ERC20, ReentrancyGuard {
    constructor() ERC20("Alpine Test Wrapped AVAX", "awAVAX") {
        require(block.chainid == 43113 || block.chainid == 31337, "TESTNET_ONLY");
    }

    function deposit() external payable {
        require(msg.value > 0, "ZERO_AMOUNT");
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
        _burn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "TRANSFER_FAILED");
    }
}

contract AlpineDemoVault is ERC4626 {
    using SafeERC20 for IERC20;

    constructor(IERC20 asset_) ERC20("Alpine Demo Vault Receipts", "vaDEMO") ERC4626(asset_) {
        require(block.chainid == 43113 || block.chainid == 31337, "TESTNET_ONLY");
    }

    function _decimalsOffset() internal pure virtual override returns (uint8) {
        return 12;
    }

    function depositBounded(uint256 assets, address receiver, uint256 minShares, uint256 deadline)
        external
        returns (uint256 result)
    {
        require(block.timestamp <= deadline, "DEADLINE");
        result = deposit(assets, receiver);
        require(result >= minShares, "MIN_SHARES");
    }

    function redeemBounded(uint256 shares, address receiver, address owner, uint256 minAssets, uint256 deadline)
        external
        returns (uint256 result)
    {
        require(block.timestamp <= deadline, "DEADLINE");
        result = redeem(shares, receiver, owner);
        require(result >= minAssets, "MIN_ASSETS");
    }

    function donate(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
    }
}

contract AlpineBackingVault is AlpineDemoVault {
    function name() public pure override returns (string memory) {
        return "Alpine Backing Vault";
    }

    function symbol() public pure override returns (string memory) {
        return "bvaDEMO";
    }
    constructor(IERC20 asset_) AlpineDemoVault(asset_) {}

    function _decimalsOffset() internal pure override returns (uint8) {
        return 0;
    }
}

contract AlpineBackingOracle {
    IAlpineOracle public immutable base;
    AlpineBackingVault public immutable vault;

    constructor(IAlpineOracle base_, AlpineBackingVault vault_) {
        base = base_;
        vault = vault_;
    }

    function price() external view returns (uint256) {
        return vault.convertToShares(base.price());
    }
}

contract AlpineVaultOracle {
    AlpineDemoVault public immutable vault;

    constructor(AlpineDemoVault vault_) {
        vault = vault_;
    }

    function price() external view returns (uint256) {
        return vault.convertToAssets(1 ether);
    }
}

