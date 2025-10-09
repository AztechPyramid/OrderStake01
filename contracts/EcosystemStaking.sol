// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title EcosystemStaking
 * @notice Individual staking contract created by the factory
 * @dev Supports single reward token with block-based rewards
 * @dev Security: ReentrancyGuard for reentrancy protection
 * @dev No pause functionality - Users always have access to their funds
 */
contract EcosystemStaking is ReentrancyGuard {
    // Staking token info
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    // Staking parameters
    uint256 public startBlock;
    uint256 public endBlock;
    uint256 public rewardPerBlock;
    uint256 public lastRewardBlock;
    uint256 public accRewardPerShare;
    
    // Staking state
    uint256 public totalStaked;
    uint256 public totalRewardDebt;
    
    // User info
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }
    
    mapping(address => UserInfo) public userInfo;
    
    // Creator and Factory
    address public creator;
    address public factory;
    
    // Store metadata in mapping to avoid stack issues
    mapping(uint256 => string) private metadata;
    // 0: poolName, 1: poolDescription, 2: stakingSymbol, 3: rewardSymbol, 4: stakingLogo, 5: rewardLogo
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event PoolUpdated(uint256 lastRewardBlock, uint256 accRewardPerShare);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    
    // Precision factor for calculations
    uint256 private constant PRECISION_FACTOR = 1e12;
    
    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _endBlock,
        address _creator
    ) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        require(_startBlock < _endBlock, "Invalid block range");
        require(_rewardPerBlock > 0, "Invalid reward rate");
        require(_creator != address(0), "Invalid creator");
        require(_startBlock > block.number, "Start block must be in future");
        require(_endBlock - _startBlock >= 100, "Pool duration too short");
        
        // Verify token decimals (only 18-decimal tokens supported)
        uint8 stakingDecimals = IERC20(_stakingToken).decimals();
        uint8 rewardDecimals = IERC20(_rewardToken).decimals();
        require(stakingDecimals == 18, "Staking token must have 18 decimals");
        require(rewardDecimals == 18, "Reward token must have 18 decimals");
        
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
        endBlock = _endBlock;
        lastRewardBlock = _startBlock;
        creator = _creator;
        factory = msg.sender; // Factory is the deployer
    }
    
    /**
     * @notice Set pool metadata (called by factory after deployment)
     * @dev Split into separate function to avoid stack too deep
     * Can only be called once by creator or factory
     */
    function setMetadata(
        string calldata _poolName,
        string calldata _poolDescription,
        string calldata _stakingSymbol,
        string calldata _rewardSymbol,
        string calldata _stakingLogo,
        string calldata _rewardLogo
    ) external {
        require(msg.sender == creator || msg.sender == factory, "Only creator or factory");
        require(bytes(metadata[0]).length == 0, "Metadata already set");
        metadata[0] = _poolName;
        metadata[1] = _poolDescription;
        metadata[2] = _stakingSymbol;
        metadata[3] = _rewardSymbol;
        metadata[4] = _stakingLogo;
        metadata[5] = _rewardLogo;
    }
    
    /**
     * @notice Update pool rewards
     */
    function updatePool() public {
        if (block.number <= lastRewardBlock) {
            return;
        }
        
        if (totalStaked == 0) {
            lastRewardBlock = block.number;
            return;
        }
        
        uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
        uint256 reward = multiplier * rewardPerBlock;
        
        accRewardPerShare = accRewardPerShare + (reward * PRECISION_FACTOR / totalStaked);
        lastRewardBlock = block.number;
        
        emit PoolUpdated(lastRewardBlock, accRewardPerShare);
    }
    
    /**
     * @notice Stake tokens
     * @dev Protected by ReentrancyGuard
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        require(block.number >= startBlock, "Staking not started");
        require(block.number < endBlock, "Staking ended");
        
        UserInfo storage user = userInfo[msg.sender];
        
        updatePool();
        
        if (user.amount > 0) {
            uint256 pending = user.amount * accRewardPerShare / PRECISION_FACTOR - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards = user.pendingRewards + pending;
            }
        }
        
        // CHECKS-EFFECTS-INTERACTIONS PATTERN
        // State değişiklikleri önce, external call sonra (reentrancy koruması)
        user.amount = user.amount + _amount;
        totalStaked = totalStaked + _amount;
        user.rewardDebt = user.amount * accRewardPerShare / PRECISION_FACTOR;
        
        // External call en sonda
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        emit Staked(msg.sender, _amount);
    }
    
    /**
     * @notice Unstake tokens
     * @dev Protected by ReentrancyGuard
     */
    function unstake(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "Insufficient balance");
        require(_amount > 0, "Cannot unstake 0");
        
        updatePool();
        
        uint256 pending = user.amount * accRewardPerShare / PRECISION_FACTOR - user.rewardDebt;
        if (pending > 0) {
            user.pendingRewards = user.pendingRewards + pending;
        }
        
        // CHECKS-EFFECTS-INTERACTIONS PATTERN
        // State değişiklikleri önce, external call sonra (reentrancy koruması)
        user.amount = user.amount - _amount;
        totalStaked = totalStaked - _amount;
        user.rewardDebt = user.amount * accRewardPerShare / PRECISION_FACTOR;
        
        // External call en sonda
        require(stakingToken.transfer(msg.sender, _amount), "Transfer failed");
        
        emit Unstaked(msg.sender, _amount);
    }
    
    /**
     * @notice Claim pending rewards
     * @dev Protected by ReentrancyGuard
     */
    function claimReward() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        
        updatePool();
        
        uint256 pending = user.amount * accRewardPerShare / PRECISION_FACTOR - user.rewardDebt;
        uint256 totalReward = user.pendingRewards + pending;
        
        require(totalReward > 0, "No rewards");
        
        // Check if pool has sufficient reward balance
        uint256 availableBalance = rewardToken.balanceOf(address(this));
        
        // If staking and reward token are the same, reserve staked tokens
        if (address(stakingToken) == address(rewardToken)) {
            availableBalance = availableBalance - totalStaked;
        }
        
        require(availableBalance >= totalReward, "Pool has insufficient rewards");
        
        // CHECKS-EFFECTS-INTERACTIONS PATTERN
        // State değişiklikleri önce, external call sonra (reentrancy koruması)
        user.pendingRewards = 0;
        user.rewardDebt = user.amount * accRewardPerShare / PRECISION_FACTOR;
        
        // External call en sonda
        require(rewardToken.transfer(msg.sender, totalReward), "Transfer failed");
        
        emit RewardClaimed(msg.sender, totalReward);
    }
    
    /**
     * @notice Emergency withdraw without caring about rewards
     * @dev Protected by ReentrancyGuard - Always available to users
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        
        require(amount > 0, "No stake");
        
        // CHECKS-EFFECTS-INTERACTIONS PATTERN
        // State değişiklikleri önce, external call sonra (reentrancy koruması)
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        totalStaked = totalStaked - amount;
        
        // External call en sonda
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit EmergencyWithdraw(msg.sender, amount);
    }
    
    /**
     * @notice Get multiplier between two blocks
     */
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= endBlock) {
            return _to - _from;
        } else if (_from >= endBlock) {
            return 0;
        } else {
            return endBlock - _from;
        }
    }
    
    /**
     * @notice Get pending rewards for a user
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo memory user = userInfo[_user];
        uint256 _accRewardPerShare = accRewardPerShare;
        
        if (block.number > lastRewardBlock && totalStaked != 0) {
            uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
            uint256 reward = multiplier * rewardPerBlock;
            _accRewardPerShare = _accRewardPerShare + (reward * PRECISION_FACTOR / totalStaked);
        }
        
        return user.amount * _accRewardPerShare / PRECISION_FACTOR - user.rewardDebt + user.pendingRewards;
    }
    
    /**
     * @notice Get pool information
     */
    function getPoolInfo() external view returns (
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _endBlock,
        uint256 _totalStaked,
        uint256 _lastRewardBlock,
        address _creator
    ) {
        return (
            address(stakingToken),
            address(rewardToken),
            rewardPerBlock,
            startBlock,
            endBlock,
            totalStaked,
            lastRewardBlock,
            creator
        );
    }
    
    /**
     * @notice Get pool metadata
     */
    function getPoolMetadata() external view returns (
        string memory poolName,
        string memory poolDescription,
        string memory stakingSymbol,
        string memory rewardSymbol,
        string memory stakingLogo,
        string memory rewardLogo
    ) {
        return (
            metadata[0],
            metadata[1],
            metadata[2],
            metadata[3],
            metadata[4],
            metadata[5]
        );
    }
}
