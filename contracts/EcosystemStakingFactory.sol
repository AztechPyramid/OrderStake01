// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EcosystemStaking.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20Burnable {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title EcosystemStakingFactory
 * @notice Factory contract for creating ecosystem staking pools
 * @dev Users burn ORDER tokens to create custom staking pools
 * Whitelisted addresses can create pools without burning ORDER
 * @dev Security: ReentrancyGuard for reentrancy protection
 * @dev No pause functionality - Pool creation always available
 */
contract EcosystemStakingFactory is ReentrancyGuard {
    // ORDER token (to be burned for pool creation)
    IERC20Burnable public orderToken;
    uint256 public burnAmount = 1_000_000 * 10**18; // 1M ORDER tokens (adjustable)
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Whitelist for addresses that don't need to burn ORDER
    mapping(address => bool) public whitelistedCreators;
    address public admin;
    
    // Pool tracking
    address[] public allPools;
    mapping(address => address[]) public poolsByCreator;
    
    // Pool creation parameters struct
    struct CreateParams {
        address stakingToken;
        address rewardToken;
        uint256 rewardPerBlock;
        uint256 startBlock;
        uint256 endBlock;
        uint256 totalRewardAmount; // Toplam reward token miktarı
        string poolName;
        string poolDescription;
        string stakingSymbol;
        string rewardSymbol;
        string stakingLogo;
        string rewardLogo;
    }
    
    // Pool info for frontend
    struct PoolInfo {
        address poolAddress;
        address stakingToken;
        address rewardToken;
        uint256 rewardPerBlock;
        uint256 startBlock;
        uint256 endBlock;
        address creator;
        uint256 createdAt;
    }
    
    mapping(address => PoolInfo) public poolInfo;
    
    // Events
    event PoolCreated(
        address indexed poolAddress,
        address indexed creator,
        address stakingToken,
        address rewardToken,
        uint256 rewardPerBlock,
        uint256 startBlock,
        uint256 endBlock
    );
    event WhitelistUpdated(address indexed account, bool status);
    event BurnAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor(address _orderToken) {
        require(_orderToken != address(0), "Invalid ORDER token");
        orderToken = IERC20Burnable(_orderToken);
        admin = msg.sender;
        
        // Whitelist the specified address
        whitelistedCreators[0x3fa6df8357DC58935360833827a9762433488C83] = true;
        emit WhitelistUpdated(0x3fa6df8357DC58935360833827a9762433488C83, true);
    }
    
    /**
     * @notice Update whitelist status for an address
     * @param _account Address to update
     * @param _status New whitelist status
     */
    function setWhitelist(address _account, bool _status) external onlyAdmin {
        whitelistedCreators[_account] = _status;
        emit WhitelistUpdated(_account, _status);
    }
    
    /**
     * @notice Update burn amount for pool creation
     * @dev Only admin can change this (to adjust for ORDER token price changes)
     * @param _newBurnAmount New amount of ORDER tokens to burn (in wei)
     */
    function setBurnAmount(uint256 _newBurnAmount) external onlyAdmin {
        require(_newBurnAmount > 0, "Burn amount must be positive");
        uint256 oldAmount = burnAmount;
        burnAmount = _newBurnAmount;
        emit BurnAmountUpdated(oldAmount, _newBurnAmount);
    }
    
    /**
     * @notice Transfer admin role to a new address
     * @dev Only current admin can transfer ownership
     * @param _newAdmin Address of the new admin
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid new admin");
        require(_newAdmin != admin, "Already admin");
        address previousAdmin = admin;
        admin = _newAdmin;
        emit AdminTransferred(previousAdmin, _newAdmin);
    }
    
    /**
     * @notice Create a new staking pool
     * @dev Burns ORDER tokens from creator (unless whitelisted)
     * Whitelisted addresses can create pools without burning ORDER
     * Automatically transfers reward tokens to the pool contract
     * @dev Protected by ReentrancyGuard - No pause functionality
     */
    function createStakingPool(CreateParams calldata params) external nonReentrant returns (address) {
        require(params.stakingToken != address(0), "Invalid staking token");
        require(params.rewardToken != address(0), "Invalid reward token");
        require(params.stakingToken != params.rewardToken || params.totalRewardAmount > burnAmount, "Reward amount too low for same token");
        require(params.startBlock > block.number, "Start block must be in future");
        require(params.startBlock < params.endBlock, "Invalid block range");
        require(params.endBlock - params.startBlock >= 100, "Pool duration too short");
        require(params.endBlock - params.startBlock <= 52560000, "Pool duration too long"); // ~2 years max
        require(params.rewardPerBlock > 0, "Invalid reward rate");
        require(params.totalRewardAmount > 0, "Invalid total reward amount");
        require(bytes(params.poolName).length > 0 && bytes(params.poolName).length <= 100, "Pool name invalid");
        require(bytes(params.stakingSymbol).length > 0 && bytes(params.stakingSymbol).length <= 20, "Staking symbol invalid");
        require(bytes(params.rewardSymbol).length > 0 && bytes(params.rewardSymbol).length <= 20, "Reward symbol invalid");
        
        // Verify total reward amount makes sense
        uint256 totalBlocks = params.endBlock - params.startBlock;
        uint256 calculatedTotal = params.rewardPerBlock * totalBlocks;
        require(params.totalRewardAmount >= calculatedTotal, "Insufficient reward amount");
        
        // Burn ORDER tokens (transfer to dead address) unless whitelisted
        if (!whitelistedCreators[msg.sender]) {
            require(orderToken.transferFrom(msg.sender, DEAD_ADDRESS, burnAmount), "ORDER burn failed");
        }
        
        // Deploy new staking contract
        EcosystemStaking pool = new EcosystemStaking(
            params.stakingToken,
            params.rewardToken,
            params.rewardPerBlock,
            params.startBlock,
            params.endBlock,
            msg.sender
        );
        
        address poolAddress = address(pool);
        
        // Transfer reward tokens to the pool contract
        IERC20Burnable rewardToken = IERC20Burnable(params.rewardToken);
        require(
            rewardToken.transferFrom(msg.sender, poolAddress, params.totalRewardAmount),
            "Reward token transfer failed"
        );
        
        // Set metadata in separate transaction to avoid stack issues
        pool.setMetadata(
            params.poolName,
            params.poolDescription,
            params.stakingSymbol,
            params.rewardSymbol,
            params.stakingLogo,
            params.rewardLogo
        );
        
        // Store pool info
        poolInfo[poolAddress] = PoolInfo({
            poolAddress: poolAddress,
            stakingToken: params.stakingToken,
            rewardToken: params.rewardToken,
            rewardPerBlock: params.rewardPerBlock,
            startBlock: params.startBlock,
            endBlock: params.endBlock,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        allPools.push(poolAddress);
        poolsByCreator[msg.sender].push(poolAddress);
        
        emit PoolCreated(
            poolAddress,
            msg.sender,
            params.stakingToken,
            params.rewardToken,
            params.rewardPerBlock,
            params.startBlock,
            params.endBlock
        );
        
        return poolAddress;
    }
    
    /**
     * @notice Get total number of pools
     */
    function poolCount() external view returns (uint256) {
        return allPools.length;
    }
    
    /**
     * @notice Get pools created by a specific user
     */
    function getPoolsByCreator(address _creator) external view returns (address[] memory) {
        return poolsByCreator[_creator];
    }
    
    /**
     * @notice Get pool info by address
     */
    function getPoolInfo(address _pool) external view returns (PoolInfo memory) {
        return poolInfo[_pool];
    }
    
    /**
     * @notice Get all pools (paginated)
     */
    function getAllPools(uint256 _offset, uint256 _limit) external view returns (address[] memory) {
        uint256 total = allPools.length;
        if (_offset >= total) {
            return new address[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > total) {
            end = total;
        }
        
        uint256 size = end - _offset;
        address[] memory result = new address[](size);
        
        for (uint256 i = 0; i < size; i++) {
            result[i] = allPools[_offset + i];
        }
        
        return result;
    }
}
