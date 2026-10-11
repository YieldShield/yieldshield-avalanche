// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IAlpineOracle { function price() external view returns (uint256); }

/// @notice Experimental single-market Fuji AVAX exposure and first-loss capital.
/// @dev Prices and backing use 6 decimals. All pilot assets have no monetary value.
contract AlpinePool is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable backing;
    IAlpineOracle public immutable oracle;
    address public immutable creator;
    address public immutable protocol;
    uint256 public constant EXIT_DELAY = 60;
    uint256 public constant MAX_POSITIONS = 100;
    uint256 public constant JUNIOR_NOTICE = 120;
    uint256 public immutable maturity = block.timestamp + 7 days;
    uint256 public totalClaimableBacking;
    mapping(address => uint256) public claimableBacking;
    uint256 public constant COLLATERAL_BPS = 15000;
    uint256 public totalBacking;
    uint256 public reservedBacking;
    uint256 public protectedAvax;
    uint256 public juniorAvax;
    uint256 public totalShares;
    uint256 public nextPositionId = 1;
    mapping(address => uint256) public shares;
    mapping(address => uint256) public withdrawalReadyAt;
    struct Position { address owner; uint256 amount; uint256 floor; uint256 openedAt; }
    mapping(uint256 => Position) public positions;
    event Protected(uint256 indexed id, address indexed owner, uint256 amount, uint256 floor);
    event Exited(uint256 indexed id, address indexed owner, bool backingExit, uint256 received);
    event Expired(uint256 indexed id, address indexed owner, uint256 backingCredited);
    event BackingClaimed(address indexed owner, uint256 amount);
    event JuniorDeposited(address indexed owner, uint256 backingAmount, uint256 sharesMinted);
    event JuniorWithdrawalRequested(address indexed owner, uint256 readyAt);
    event JuniorWithdrawn(address indexed owner, uint256 sharesBurned, uint256 backingAmount, uint256 avaxAmount);
    error InvalidAmount(); error InsufficientBacking(); error Slippage(); error NotReady(); error NotOwner(); error TransferFailed(); error ActiveExposure(); error EpochClosed();

    constructor(address backing_, address oracle_, address creator_, address protocol_) {
        require(block.chainid == 43113 || block.chainid == 31337, "TESTNET_ONLY");
        require(creator_ != address(0) && protocol_ != address(0), "ZERO_RECIPIENT");
        require(IERC20Metadata(backing_).decimals() == 6, "BACKING_DECIMALS");
        backing = IERC20(backing_); oracle = IAlpineOracle(oracle_); creator = creator_; protocol = protocol_;
    }
    function requiredBacking(uint256 reserved) public pure returns (uint256) {
        return Math.mulDiv(reserved, COLLATERAL_BPS, 10000, Math.Rounding.Ceil);
    }
    function capacity() external view returns (uint256) {
        uint256 maxReserved = totalBacking * 10000 / COLLATERAL_BPS;
        return maxReserved > reservedBacking ? maxReserved - reservedBacking : 0;
    }
    function juniorValue() public view returns (uint256) {
        return totalBacking + (juniorAvax == 0 ? 0 : Math.mulDiv(juniorAvax, oracle.price(), 1 ether));
    }
    function depositJunior(uint256 amount, uint256 minShares) external nonReentrant returns (uint256 minted) {
        if (reservedBacking != 0) revert ActiveExposure();
        if (block.timestamp >= maturity) revert EpochClosed();
        if (amount == 0) revert InvalidAmount();
        uint256 nav = juniorValue();
        minted = totalShares == 0 ? amount * 1e12 : (nav == 0 ? 0 : Math.mulDiv(amount, totalShares, nav));
        if (minted == 0 || minted < minShares) revert Slippage();
        uint256 beforeBalance = backing.balanceOf(address(this));
        backing.safeTransferFrom(msg.sender, address(this), amount);
        require(backing.balanceOf(address(this)) - beforeBalance == amount, "EXACT_TRANSFER_ONLY");
        totalBacking += amount; totalShares += minted; shares[msg.sender] += minted;
        withdrawalReadyAt[msg.sender] = 0;
        emit JuniorDeposited(msg.sender, amount, minted);
    }
    function requestJuniorWithdrawal() external {
        if (shares[msg.sender] == 0) revert InvalidAmount();
        withdrawalReadyAt[msg.sender] = block.timestamp + JUNIOR_NOTICE;
        emit JuniorWithdrawalRequested(msg.sender, withdrawalReadyAt[msg.sender]);
    }
    function withdrawJunior(uint256 burn, uint256 minBacking, uint256 minAvax) external nonReentrant {
        if (reservedBacking != 0) revert ActiveExposure();
        uint256 ready = withdrawalReadyAt[msg.sender];
        if (ready == 0 || block.timestamp < ready) revert NotReady();
        if (burn == 0 || burn > shares[msg.sender]) revert InvalidAmount();
        uint256 stableOut = Math.mulDiv(totalBacking, burn, totalShares);
        uint256 avaxOut = Math.mulDiv(juniorAvax, burn, totalShares);
        if (stableOut < minBacking || avaxOut < minAvax) revert Slippage();
        if (totalBacking - stableOut < requiredBacking(reservedBacking)) revert InsufficientBacking();
        shares[msg.sender] -= burn; totalShares -= burn; totalBacking -= stableOut; juniorAvax -= avaxOut;
        withdrawalReadyAt[msg.sender] = 0;
        backing.safeTransfer(msg.sender, stableOut); _send(msg.sender, avaxOut);
        emit JuniorWithdrawn(msg.sender, burn, stableOut, avaxOut);
    }
    function protect(uint256 minFloor, uint256 deadline) external payable nonReentrant returns (uint256 id) {
        if (block.timestamp + EXIT_DELAY >= maturity || nextPositionId > MAX_POSITIONS) revert EpochClosed();
        if (msg.value == 0 || msg.value > 10 ether) revert InvalidAmount();
        require(block.timestamp <= deadline, "DEADLINE");
        uint256 floor = Math.mulDiv(msg.value, oracle.price(), 1 ether);
        if (floor == 0 || floor < minFloor) revert Slippage();
        if (totalBacking < requiredBacking(reservedBacking + floor)) revert InsufficientBacking();
        id = nextPositionId++;
        positions[id] = Position(msg.sender, msg.value, floor, block.timestamp);
        reservedBacking += floor; protectedAvax += msg.value;
        emit Protected(id, msg.sender, msg.value, floor);
    }
    function previewExit(uint256 id) public view returns (uint256 avaxOut, uint256 feeAvax) {
        Position memory p = positions[id];
        if (p.owner == address(0)) revert NotOwner();
        uint256 spot = oracle.price();
        uint256 nowValue = Math.mulDiv(p.amount, spot, 1 ether);
        uint256 gainAvax = nowValue > p.floor ? Math.mulDiv(nowValue - p.floor, 1 ether, spot) : 0;
        // Round each recipient separately, matching the actual transfers.
        feeAvax = gainAvax * 1000 / 10000 + 2 * (gainAvax * 100 / 10000);
        avaxOut = p.amount - feeAvax;
    }
    function exitAvax(uint256 id, uint256 minAvax) external nonReentrant {
        if (block.timestamp >= maturity) revert EpochClosed();
        Position memory p = _position(id);
        (uint256 out,) = previewExit(id);
        if (out < minAvax) revert Slippage();
        uint256 spot = oracle.price();
        uint256 nowValue = Math.mulDiv(p.amount, spot, 1 ether);
        uint256 gain = nowValue > p.floor ? Math.mulDiv(nowValue - p.floor, 1 ether, spot) : 0;
        uint256 juniorFee = gain * 1000 / 10000;
        uint256 fee = gain * 100 / 10000;
        _close(id, p); juniorAvax += juniorFee;
        _send(creator, fee); _send(protocol, fee); _send(msg.sender, out);
        emit Exited(id, msg.sender, false, out);
    }
    /// @notice Surrender ALL AVAX for the fixed entry backing amount. No fresh oracle needed.
    function exitBacking(uint256 id) external nonReentrant {
        Position memory p = _position(id);
        _close(id, p); totalBacking -= p.floor; juniorAvax += p.amount;
        backing.safeTransfer(msg.sender, p.floor);
        emit Exited(id, msg.sender, true, p.floor);
    }
    /// @notice Anyone can settle after epoch maturity. Owner cooperation is not needed.
    /// @dev Expiry always surrenders AVAX for entry backing, even when AVAX has appreciated.
    function settleExpired(uint256 id) external nonReentrant {
        if (block.timestamp < maturity) revert NotReady();
        Position memory p = positions[id];
        if (p.owner == address(0)) revert NotOwner();
        _close(id, p); totalBacking -= p.floor; juniorAvax += p.amount;
        claimableBacking[p.owner] += p.floor; totalClaimableBacking += p.floor;
        emit Expired(id, p.owner, p.floor);
    }
    function claimBacking() external nonReentrant {
        uint256 amount = claimableBacking[msg.sender];
        if (amount == 0) revert InvalidAmount();
        claimableBacking[msg.sender] = 0; totalClaimableBacking -= amount;
        backing.safeTransfer(msg.sender, amount);
        emit BackingClaimed(msg.sender, amount);
    }
    function _position(uint256 id) private view returns (Position memory p) {
        p = positions[id];
        if (p.owner != msg.sender) revert NotOwner();
        if (block.timestamp < p.openedAt + EXIT_DELAY) revert NotReady();
    }
    function _close(uint256 id, Position memory p) private {
        delete positions[id]; reservedBacking -= p.floor; protectedAvax -= p.amount;
    }
    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
