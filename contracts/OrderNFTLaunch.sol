// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./OrderNFTCollection.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IERC20Burnable {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IOrderNFTCollection {
    function setActiveFromFactory(bool _active) external;
}

/**
 * @title OrderNFTLaunch
 * @notice Factory contract for creating NFT collections with marketplace functionality
 * @dev Users burn ORDER tokens to create custom NFT collections
 * Each collection supports custom ERC20 tokens for minting
 * @dev Security: ReentrancyGuard for reentrancy protection, Pausable for emergency control
 * @dev Pausable: Factory pause affects new collection creation, existing collections independent
 */
contract OrderNFTLaunch is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    // ORDER token address (to be burned for collection creation)
    IERC20Burnable public constant ORDER_TOKEN = IERC20Burnable(0x1BEd077195307229FcCBC719C5f2ce6416A58180);
    uint256 public burnAmount = 1_000_000 * 10**18; // 1M ORDER tokens (adjustable)
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Factory admin
    address public admin;
    
    // Collection tracking
    address[] public allCollections;
    mapping(address => address[]) public collectionsByCreator;
    mapping(string => bool) public usedCollectionUrls; // Prevent duplicate URLs
    
    // Collection creation parameters struct
    struct CreateParams {
        string name;
        string symbol;
        string baseURI;
        uint256 maxSupply;
        address mintToken; // SafeERC20 token for minting
        uint256 mintPrice; // Price per NFT in mintToken
        uint256 marketplaceFeePercent; // Owner's marketplace fee (max 10%)
        string description;
        string collectionImageUrl;
    }
    
    // Collection info for frontend
    struct CollectionInfo {
        address collectionAddress;
        address creator;
        string name;
        string symbol;
        string baseURI;
        uint256 maxSupply;
        address mintToken;
        uint256 mintPrice;
        uint256 marketplaceFeePercent;
        uint256 createdAt;
        uint256 totalMinted;
        bool isActive;
    }
    
    mapping(address => CollectionInfo) public collectionInfo;
    
    // Events
    event CollectionCreated(
        address indexed collectionAddress,
        address indexed creator,
        string name,
        string symbol,
        string baseURI,
        uint256 maxSupply,
        address mintToken,
        uint256 mintPrice,
        uint256 marketplaceFeePercent
    );
    event BurnAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event CollectionStatusUpdated(address indexed collection, bool isActive);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier validCollectionAddress(address _collection) {
        require(_collection != address(0), "Invalid collection address");
        require(collectionInfo[_collection].collectionAddress != address(0), "Collection not found");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @notice Update burn amount for collection creation
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
     * @notice Pause the factory (prevents new collection creation)
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @notice Unpause the factory
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @notice Sync pause status to all collections (batch operation)
     * @param _start Start index for batch sync
     * @param _end End index for batch sync (exclusive)
     */
    function syncPauseToCollections(uint256 _start, uint256 _end) external onlyAdmin {
        require(_start < _end, "Invalid range");
        require(_end <= allCollections.length, "End index out of bounds");
        
        bool currentStatus = !paused();
        
        for (uint256 i = _start; i < _end; i++) {
            try IOrderNFTCollection(allCollections[i]).setActiveFromFactory(currentStatus) {
                // Success
            } catch {
                // Skip failed collections (might be destroyed or incompatible)
            }
        }
    }
    
    /**
     * @notice Normalize base URI for uniqueness check
     * @param _baseURI Original base URI
     * @return Normalized base URI
     */
    function _normalizeBaseURI(string memory _baseURI) internal pure returns (string memory) {
        bytes memory uri = bytes(_baseURI);
        
        // Convert to lowercase
        for (uint i = 0; i < uri.length; i++) {
            if (uri[i] >= 0x41 && uri[i] <= 0x5A) { // A-Z
                uri[i] = bytes1(uint8(uri[i]) + 32); // Convert to lowercase
            }
        }
        
        // Ensure trailing slash for consistency
        if (uri.length > 0 && uri[uri.length - 1] != 0x2F) { // Not ending with '/'
            return string(abi.encodePacked(uri, "/"));
        }
        
        return string(uri);
    }
    
    /**
     * @notice Create a new NFT collection
     * @dev Burns ORDER tokens from creator
     * Creates a new NFT contract with marketplace functionality
     * @param params Collection creation parameters
     */
    function createNFTCollection(CreateParams calldata params) external nonReentrant whenNotPaused returns (address) {
        // Validate parameters
        require(bytes(params.name).length > 0 && bytes(params.name).length <= 100, "Invalid name length");
        require(bytes(params.symbol).length > 0 && bytes(params.symbol).length <= 20, "Invalid symbol length");
        require(bytes(params.baseURI).length > 0, "Base URI required");
        
        // Normalize and check URI uniqueness
        string memory normalizedURI = _normalizeBaseURI(params.baseURI);
        require(!usedCollectionUrls[normalizedURI], "Base URI already used");
        
        require(params.maxSupply > 0 && params.maxSupply <= 100000, "Invalid max supply");
        require(params.mintToken != address(0), "Invalid mint token");
        require(params.mintPrice > 0, "Invalid mint price");
        require(params.marketplaceFeePercent <= 1000, "Marketplace fee too high"); // Max 10%
        require(bytes(params.description).length <= 1000, "Description too long");
        
        // Verify mint token has 18 decimals
        try IERC20Metadata(params.mintToken).decimals() returns (uint8 decimals) {
            require(decimals == 18, "Mint token must have 18 decimals");
        } catch {
            revert("Invalid mint token metadata");
        }
        
        // Burn ORDER tokens (transfer to dead address) with verification
        uint256 deadBalanceBefore = ORDER_TOKEN.balanceOf(DEAD_ADDRESS);
        IERC20(address(ORDER_TOKEN)).safeTransferFrom(msg.sender, DEAD_ADDRESS, burnAmount);
        uint256 deadBalanceAfter = ORDER_TOKEN.balanceOf(DEAD_ADDRESS);
        require(deadBalanceAfter >= deadBalanceBefore + burnAmount, "ORDER burn verification failed");
        
        // Mark normalized URL as used
        usedCollectionUrls[normalizedURI] = true;
        
        // Deploy new NFT collection contract
        OrderNFTCollection collection = new OrderNFTCollection(
            params.name,
            params.symbol,
            params.baseURI,
            params.maxSupply,
            params.mintToken,
            params.mintPrice,
            params.marketplaceFeePercent,
            msg.sender,
            address(this)
        );
        
        address collectionAddress = address(collection);
        
        // Store collection info
        collectionInfo[collectionAddress] = CollectionInfo({
            collectionAddress: collectionAddress,
            creator: msg.sender,
            name: params.name,
            symbol: params.symbol,
            baseURI: params.baseURI,
            maxSupply: params.maxSupply,
            mintToken: params.mintToken,
            mintPrice: params.mintPrice,
            marketplaceFeePercent: params.marketplaceFeePercent,
            createdAt: block.timestamp,
            totalMinted: 0,
            isActive: true
        });
        
        allCollections.push(collectionAddress);
        collectionsByCreator[msg.sender].push(collectionAddress);
        
        emit CollectionCreated(
            collectionAddress,
            msg.sender,
            params.name,
            params.symbol,
            params.baseURI,
            params.maxSupply,
            params.mintToken,
            params.mintPrice,
            params.marketplaceFeePercent
        );
        
        return collectionAddress;
    }
    
    /**
     * @notice Update collection status (active/inactive)
     * @dev Only factory admin can change this
     * @param _collection Collection address
     * @param _isActive New status
     */
    function setCollectionStatus(address _collection, bool _isActive) external onlyAdmin validCollectionAddress(_collection) {
        collectionInfo[_collection].isActive = _isActive;
        emit CollectionStatusUpdated(_collection, _isActive);
    }
    
    /**
     * @notice Update minted count for a collection (called by collection contract)
     * @param _newMintedCount New total minted count
     */
    function updateMintedCount(uint256 _newMintedCount) external {
        require(collectionInfo[msg.sender].collectionAddress != address(0), "Only collections can call");
        collectionInfo[msg.sender].totalMinted = _newMintedCount;
    }
    
    /**
     * @notice Get total number of collections
     */
    function collectionCount() external view returns (uint256) {
        return allCollections.length;
    }
    
    /**
     * @notice Get all collections array length (helper for some SDKs)
     */
    function allCollectionsLength() external view returns (uint256) {
        return allCollections.length;
    }
    
    /**
     * @notice Get collections created by a specific user
     */
    function getCollectionsByCreator(address _creator) external view returns (address[] memory) {
        return collectionsByCreator[_creator];
    }
    
    /**
     * @notice Get collection info by address
     */
    function getCollectionInfo(address _collection) external view returns (CollectionInfo memory) {
        return collectionInfo[_collection];
    }
    
    /**
     * @notice Get all collections (paginated)
     * @param _offset Starting index
     * @param _limit Number of collections to return
     * @param _activeOnly If true, only return active collections
     */
    function getAllNFTMarketplaces(uint256 _offset, uint256 _limit, bool _activeOnly) external view returns (CollectionInfo[] memory) {
        uint256 total = allCollections.length;
        if (_offset >= total) {
            return new CollectionInfo[](0);
        }
        
        // Count valid collections
        uint256 validCount = 0;
        for (uint256 i = _offset; i < total && validCount < _limit; i++) {
            address collectionAddr = allCollections[i];
            if (!_activeOnly || collectionInfo[collectionAddr].isActive) {
                validCount++;
            }
        }
        
        CollectionInfo[] memory result = new CollectionInfo[](validCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = _offset; i < total && resultIndex < _limit; i++) {
            address collectionAddr = allCollections[i];
            CollectionInfo memory info = collectionInfo[collectionAddr];
            
            if (!_activeOnly || info.isActive) {
                result[resultIndex] = info;
                resultIndex++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get collections with search filters
     * @param _offset Starting index
     * @param _limit Number of collections to return
     * @param _creator Filter by creator (address(0) for all)
     * @param _mintToken Filter by mint token (address(0) for all)
     * @param _activeOnly If true, only return active collections
     */
    function getFilteredCollections(
        uint256 _offset,
        uint256 _limit,
        address _creator,
        address _mintToken,
        bool _activeOnly
    ) external view returns (CollectionInfo[] memory) {
        uint256 total = allCollections.length;
        if (_offset >= total) {
            return new CollectionInfo[](0);
        }
        
        // First pass: count valid collections to determine exact array size
        uint256 validCount = 0;
        
        for (uint256 i = _offset; i < total && validCount < _limit; i++) {
            address collectionAddr = allCollections[i];
            CollectionInfo memory info = collectionInfo[collectionAddr];
            
            if ((_creator == address(0) || info.creator == _creator) &&
                (_mintToken == address(0) || info.mintToken == _mintToken) &&
                (!_activeOnly || info.isActive)) {
                validCount++;
            }
        }
        
        // Create exact size array and fill it
        CollectionInfo[] memory result = new CollectionInfo[](validCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = _offset; i < total && resultIndex < validCount; i++) {
            address collectionAddr = allCollections[i];
            CollectionInfo memory info = collectionInfo[collectionAddr];
            
            if ((_creator == address(0) || info.creator == _creator) &&
                (_mintToken == address(0) || info.mintToken == _mintToken) &&
                (!_activeOnly || info.isActive)) {
                result[resultIndex] = info;
                resultIndex++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Check if a collection URL is already used
     */
    function isUrlUsed(string calldata _url) external view returns (bool) {
        return usedCollectionUrls[_normalizeBaseURI(_url)];
    }
}