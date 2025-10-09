// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IOrderNFTLaunch {
    function updateMintedCount(uint256 _newMintedCount) external;
}

/**
 * @title OrderNFTCollection
 * @notice Individual NFT collection contract created by the factory
 * @dev Supports custom ERC20 tokens for minting with marketplace functionality
 * @dev Security: ReentrancyGuard for reentrancy protection, SafeERC20 for token transfers
 */
contract OrderNFTCollection is ERC721, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;
    
    // Collection parameters
    string private baseTokenURI;
    uint256 public maxSupply;
    address public mintToken; // ERC20 token for minting
    uint256 public mintPrice; // Price per NFT in mintToken
    uint256 public marketplaceFeePercent; // Fee percentage (basis points, max 1000 = 10%)
    
    // Token-specific URIs
    mapping(uint256 => string) private customTokenURI;
    mapping(bytes32 => bool) private usedURIHash;
    mapping(uint256 => bool) private hasCustomURI;
    
    // Collection management
    address public creator;
    address public factory;
    Counters.Counter private _tokenIdCounter;
    
    // Marketplace functionality
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        address paymentToken;
        uint256 listedAt;
        bool active;
    }
    
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => bool) public isListed;
    uint256[] public activeListings;
    mapping(uint256 => uint256) private listingIndex; // tokenId => index in activeListings
    
    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public totalMarketplaceFees;
    mapping(address => uint256) public revenueByToken;
    mapping(address => uint256) public marketplaceFeesByToken;
    
    // Collection metadata
    string public description;
    string public collectionImageUrl;
    
    // Events
    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 price, address paymentToken);
    event TokenMintedWithURI(address indexed to, uint256 indexed tokenId, string customURI, uint256 price, address paymentToken);
    event TokenListed(uint256 indexed tokenId, address indexed seller, uint256 price, address paymentToken);
    event TokenUnlisted(uint256 indexed tokenId, address indexed seller);
    event TokenSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, address paymentToken, uint256 marketplaceFee);
    event PriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    event RevenueWithdrawn(address indexed creator, uint256 amount, address token);
    event MarketplaceFeeWithdrawn(address indexed creator, uint256 amount, address token);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event ERC20Recovered(address indexed token, address indexed to, uint256 amount);
    event CreatorTransferred(address indexed previousCreator, address indexed newCreator);
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }
    
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "Not token owner");
        _;
    }
    
    modifier validTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Token does not exist");
        _;
    }
    
    modifier notListed(uint256 _tokenId) {
        require(!isListed[_tokenId], "Token is listed");
        _;
    }
    
    modifier isListedToken(uint256 _tokenId) {
        require(isListed[_tokenId], "Token not listed");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        uint256 _maxSupply,
        address _mintToken,
        uint256 _mintPrice,
        uint256 _marketplaceFeePercent,
        address _creator,
        address _factory
    ) ERC721(_name, _symbol) {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_symbol).length > 0, "Symbol required");
        require(bytes(_baseTokenURI).length > 0, "Base URI required");
        require(_maxSupply > 0, "Max supply must be positive");
        require(_mintToken != address(0), "Invalid mint token");
        require(_mintPrice > 0, "Mint price must be positive");
        require(_marketplaceFeePercent <= 1000, "Fee too high"); // Max 10%
        require(_creator != address(0), "Invalid creator");
        require(_factory != address(0), "Invalid factory");
        
        // Verify mint token has 18 decimals
        try IERC20Metadata(_mintToken).decimals() returns (uint8 decimals) {
            require(decimals == 18, "Mint token must have 18 decimals");
        } catch {
            revert("Invalid mint token metadata");
        }
        
        baseTokenURI = _baseTokenURI;
        maxSupply = _maxSupply;
        mintToken = _mintToken;
        mintPrice = _mintPrice;
        marketplaceFeePercent = _marketplaceFeePercent;
        creator = _creator;
        factory = _factory;
        
        // Start token IDs from 1
        _tokenIdCounter.increment();
    }
    
    /**
     * @notice Pause contract functions
     * @dev Only creator can pause
     */
    function pause() external onlyCreator {
        _pause();
    }
    
    /**
     * @notice Unpause contract functions
     * @dev Only creator can unpause
     */
    function unpause() external onlyCreator {
        _unpause();
    }
    
    /**
     * @notice Set collection metadata
     * @param _description Collection description
     * @param _collectionImageUrl Collection image URL
     */
    function setMetadata(string calldata _description, string calldata _collectionImageUrl) external onlyCreator {
        require(bytes(_description).length <= 1000, "Description too long");
        require(bytes(_collectionImageUrl).length <= 500, "Image URL too long");
        
        description = _description;
        collectionImageUrl = _collectionImageUrl;
    }
    
    /**
     * @notice Transfer creator role to a new address
     * @param _newCreator Address of the new creator
     */
    function transferCreator(address _newCreator) external onlyCreator {
        require(_newCreator != address(0), "Invalid new creator");
        require(_newCreator != creator, "Already creator");
        
        address previousCreator = creator;
        creator = _newCreator;
        
        emit CreatorTransferred(previousCreator, _newCreator);
    }
    
    /**
     * @notice Set active status from factory
     * @param _active New active status
     */
    function setActiveFromFactory(bool _active) external {
        require(msg.sender == factory, "Only factory");
        if (_active) {
            _unpause();
        } else {
            _pause();
        }
    }
    
    /**
     * @notice Update mint price
     * @param _newPrice New mint price
     */
    function setMintPrice(uint256 _newPrice) external onlyCreator {
        require(_newPrice > 0, "Price must be positive");
        uint256 oldPrice = mintPrice;
        mintPrice = _newPrice;
        emit MintPriceUpdated(oldPrice, _newPrice);
    }
    
    /**
     * @notice Update marketplace fee percentage
     * @param _newFeePercent New fee percentage (max 1000 = 10%)
     */
    function setMarketplaceFee(uint256 _newFeePercent) external onlyCreator {
        require(_newFeePercent <= 1000, "Fee too high");
        uint256 oldFee = marketplaceFeePercent;
        marketplaceFeePercent = _newFeePercent;
        emit MarketplaceFeeUpdated(oldFee, _newFeePercent);
    }
    
    /**
     * @notice Mint new NFT
     * @param _to Address to receive the NFT
     */
    function mint(address _to) external nonReentrant whenNotPaused returns (uint256) {
        require(_to != address(0), "Invalid recipient");
        require(_tokenIdCounter.current() <= maxSupply, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter.current();
        
        // Transfer payment from sender to contract first (to handle fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(mintToken).balanceOf(address(this));
        IERC20(mintToken).safeTransferFrom(msg.sender, address(this), mintPrice);
        uint256 balanceAfter = IERC20(mintToken).balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;
        
        // Mint the NFT
        _safeMint(_to, tokenId);
        _tokenIdCounter.increment();
        
        // Update revenue tracking with actual received amount
        totalRevenue += actualReceived;
        revenueByToken[mintToken] += actualReceived;
        
        // Update factory minted count
        IOrderNFTLaunch(factory).updateMintedCount(_tokenIdCounter.current() - 1);
        
        emit TokenMinted(_to, tokenId, actualReceived, mintToken);
        
        return tokenId;
    }
    
    /**
     * @notice Mint new NFT with custom URI
     * @param _to Address to receive the NFT
     * @param _customURI Custom URI for this specific token (must be unique)
     */
    function mintWithURI(address _to, string calldata _customURI) external nonReentrant whenNotPaused returns (uint256) {
        require(_to != address(0), "Invalid recipient");
        require(_tokenIdCounter.current() <= maxSupply, "Max supply reached");
        require(bytes(_customURI).length > 0, "URI cannot be empty");
        require(bytes(_customURI).length <= 500, "URI too long"); // Reasonable limit
        
        bytes32 uriHash = keccak256(bytes(_customURI));
        require(!usedURIHash[uriHash], "URI already used");
        
        uint256 tokenId = _tokenIdCounter.current();
        
        // Transfer payment from sender to contract first (to handle fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(mintToken).balanceOf(address(this));
        IERC20(mintToken).safeTransferFrom(msg.sender, address(this), mintPrice);
        uint256 balanceAfter = IERC20(mintToken).balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;
        
        // Mint the NFT
        _safeMint(_to, tokenId);
        _tokenIdCounter.increment();
        
        // Set custom URI
        customTokenURI[tokenId] = _customURI;
        hasCustomURI[tokenId] = true;
        usedURIHash[uriHash] = true;
        
        // Update revenue tracking with actual received amount
        totalRevenue += actualReceived;
        revenueByToken[mintToken] += actualReceived;
        
        // Update factory minted count
        IOrderNFTLaunch(factory).updateMintedCount(_tokenIdCounter.current() - 1);
        
        emit TokenMintedWithURI(_to, tokenId, _customURI, actualReceived, mintToken);
        
        return tokenId;
    }
    
    /**
     * @notice List NFT for sale
     * @param _tokenId Token ID to list
     * @param _price Sale price
     * @param _paymentToken Token to accept as payment
     */
    function listToken(uint256 _tokenId, uint256 _price, address _paymentToken) external nonReentrant whenNotPaused validTokenId(_tokenId) onlyTokenOwner(_tokenId) notListed(_tokenId) {
        require(_price > 0, "Price must be positive");
        require(_paymentToken != address(0), "Invalid payment token");
        
        // Verify payment token is valid ERC20 with 18 decimals
        try IERC20Metadata(_paymentToken).decimals() returns (uint8 decimals) {
            require(decimals == 18, "Payment token must have 18 decimals");
        } catch {
            revert("Invalid payment token metadata");
        }
        
        listings[_tokenId] = Listing({
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            paymentToken: _paymentToken,
            listedAt: block.timestamp,
            active: true
        });
        
        isListed[_tokenId] = true;
        listingIndex[_tokenId] = activeListings.length;
        activeListings.push(_tokenId);
        
        emit TokenListed(_tokenId, msg.sender, _price, _paymentToken);
    }
    
    /**
     * @notice Unlist NFT from sale
     * @param _tokenId Token ID to unlist
     */
    function unlistToken(uint256 _tokenId) external whenNotPaused validTokenId(_tokenId) onlyTokenOwner(_tokenId) isListedToken(_tokenId) {
        _removeListing(_tokenId);
        emit TokenUnlisted(_tokenId, msg.sender);
    }
    
    /**
     * @notice Update listing price
     * @param _tokenId Token ID
     * @param _newPrice New price
     */
    function updatePrice(uint256 _tokenId, uint256 _newPrice) external validTokenId(_tokenId) onlyTokenOwner(_tokenId) isListedToken(_tokenId) {
        require(_newPrice > 0, "Price must be positive");
        uint256 oldPrice = listings[_tokenId].price;
        listings[_tokenId].price = _newPrice;
        emit PriceUpdated(_tokenId, oldPrice, _newPrice);
    }
    
    /**
     * @notice Buy listed NFT
     * @param _tokenId Token ID to buy
     */
    function buyToken(uint256 _tokenId) external nonReentrant whenNotPaused validTokenId(_tokenId) isListedToken(_tokenId) {
        Listing memory listing = listings[_tokenId];
        require(listing.active, "Listing not active");
        require(msg.sender != listing.seller, "Cannot buy own token");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        address paymentToken = listing.paymentToken;
        
        // Remove listing before transfers (prevent reentrancy)
        _removeListing(_tokenId);
        
        // Transfer full payment from buyer to contract first (to handle fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(paymentToken).balanceOf(address(this));
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), price);
        uint256 balanceAfterBuy = IERC20(paymentToken).balanceOf(address(this));
        uint256 actualReceived = balanceAfterBuy - balanceBefore;
        
        // Recalculate amounts based on actual received
        uint256 actualMarketplaceFee = (actualReceived * marketplaceFeePercent) / 10000;
        uint256 actualSellerAmount = actualReceived - actualMarketplaceFee;
        
        // Transfer payments from contract
        if (actualSellerAmount > 0) {
            IERC20(paymentToken).safeTransfer(seller, actualSellerAmount);
        }
        
        // Calculate actual marketplace fee that remains in contract (handles exit tax)
        uint256 balanceAfterSellerPay = IERC20(paymentToken).balanceOf(address(this));
        uint256 actualFeeLeft = balanceAfterSellerPay - balanceBefore;
        
        if (actualFeeLeft > 0) {
            // Keep marketplace fee in contract for withdrawal
            totalMarketplaceFees += actualFeeLeft;
            marketplaceFeesByToken[paymentToken] += actualFeeLeft;
        }
        
        // Transfer NFT
        _transfer(seller, msg.sender, _tokenId);
        
        emit TokenSold(_tokenId, seller, msg.sender, actualReceived, paymentToken, actualFeeLeft);
    }
    
    /**
     * @notice Creator withdraws accumulated revenue
     * @param _token Token address to withdraw
     * @param _amount Amount to withdraw
     */
    function withdrawRevenue(address _token, uint256 _amount) external onlyCreator nonReentrant {
        require(_token != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be positive");
        require(revenueByToken[_token] >= _amount, "Insufficient revenue");
        
        revenueByToken[_token] -= _amount;
        totalRevenue -= _amount;
        
        IERC20(_token).safeTransfer(creator, _amount);
        
        emit RevenueWithdrawn(creator, _amount, _token);
    }
    
    /**
     * @notice Creator withdraws accumulated marketplace fees
     * @param _token Token address to withdraw
     * @param _amount Amount to withdraw
     */
    function withdrawMarketplaceFees(address _token, uint256 _amount) external onlyCreator nonReentrant {
        require(_token != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be positive");
        require(marketplaceFeesByToken[_token] >= _amount, "Insufficient fees");
        
        marketplaceFeesByToken[_token] -= _amount;
        totalMarketplaceFees -= _amount;
        
        IERC20(_token).safeTransfer(creator, _amount);
        
        emit MarketplaceFeeWithdrawn(creator, _amount, _token);
    }
    
    /**
     * @notice Emergency function to recover accidentally sent ERC20 tokens
     * @param _token Token address to recover
     * @param _to Address to send recovered tokens
     * @param _amount Amount to recover
     */
    function recoverERC20(address _token, address _to, uint256 _amount) external onlyCreator nonReentrant {
        require(_token != address(0), "Invalid token address");
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be positive");
        
        // Cannot recover tracked revenue or marketplace fees
        uint256 protectedAmount = revenueByToken[_token] + marketplaceFeesByToken[_token];
        uint256 availableBalance = IERC20(_token).balanceOf(address(this));
        require(availableBalance >= protectedAmount + _amount, "Cannot recover protected funds");
        
        IERC20(_token).safeTransfer(_to, _amount);
        
        emit ERC20Recovered(_token, _to, _amount);
    }
    
    /**
     * @notice Get current total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }
    
    /**
     * @notice Get active listings with pagination
     * @param _offset Starting index
     * @param _limit Number of listings to return
     */
    function getActiveListings(uint256 _offset, uint256 _limit) external view returns (Listing[] memory) {
        uint256 total = activeListings.length;
        if (_offset >= total) {
            return new Listing[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > total) {
            end = total;
        }
        
        uint256 size = end - _offset;
        Listing[] memory result = new Listing[](size);
        
        for (uint256 i = 0; i < size; i++) {
            uint256 tokenId = activeListings[_offset + i];
            result[i] = listings[tokenId];
        }
        
        return result;
    }
    
    /**
     * @notice Get listings by seller
     * @param _seller Seller address
     */
    function getListingsBySeller(address _seller) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count seller's listings
        for (uint256 i = 0; i < activeListings.length; i++) {
            uint256 tokenId = activeListings[i];
            if (listings[tokenId].seller == _seller) {
                count++;
            }
        }
        
        // Create result array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeListings.length; i++) {
            uint256 tokenId = activeListings[i];
            if (listings[tokenId].seller == _seller) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get all tokens owned by an address
     * @param _owner Owner address
     */
    function tokensOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        }
        
        uint256[] memory result = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId < _tokenIdCounter.current(); tokenId++) {
            if (_exists(tokenId) && ownerOf(tokenId) == _owner) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Override tokenURI to support custom URIs
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        // If token has custom URI, return it
        if (hasCustomURI[tokenId]) {
            return customTokenURI[tokenId];
        }
        
        // Otherwise return base URI + token ID
        return super.tokenURI(tokenId);
    }
    
    /**
     * @notice Check if a URI is already used
     * @param _uri URI to check
     */
    function isURIUsed(string calldata _uri) external view returns (bool) {
        return usedURIHash[keccak256(bytes(_uri))];
    }
    
    /**
     * @notice Get custom URI for a token (if any)
     * @param tokenId Token ID to check
     */
    function getCustomURI(uint256 tokenId) external view returns (string memory) {
        if (hasCustomURI[tokenId]) {
            return customTokenURI[tokenId];
        }
        return "";
    }
    
    /**
     * @notice Override _baseURI function
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    /**
     * @notice Remove listing from active listings array
     * @param _tokenId Token ID to remove
     */
    function _removeListing(uint256 _tokenId) internal {
        require(isListed[_tokenId], "Token not listed");
        
        uint256 index = listingIndex[_tokenId];
        uint256 lastTokenId = activeListings[activeListings.length - 1];
        
        // Move last element to deleted spot
        activeListings[index] = lastTokenId;
        listingIndex[lastTokenId] = index;
        
        // Remove last element
        activeListings.pop();
        
        // Clean up mappings
        delete listings[_tokenId];
        delete isListed[_tokenId];
        delete listingIndex[_tokenId];
    }
    
    /**
     * @notice Override _beforeTokenTransfer to handle listing cleanup
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // If token is listed and being transferred (not minting), remove listing
        if (from != address(0) && isListed[tokenId]) {
            _removeListing(tokenId);
            emit TokenUnlisted(tokenId, from);
        }
    }
    
    /**
     * @notice Get collection statistics
     */
    function getCollectionStats() external view returns (
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _totalRevenue,
        uint256 _totalMarketplaceFees,
        uint256 _activeListingsCount,
        uint256 _mintPrice,
        uint256 _marketplaceFeePercent
    ) {
        return (
            _tokenIdCounter.current() - 1,
            maxSupply,
            totalRevenue,
            totalMarketplaceFees,
            activeListings.length,
            mintPrice,
            marketplaceFeePercent
        );
    }
}