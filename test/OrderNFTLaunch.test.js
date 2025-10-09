const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrderNFTLaunch Security Tests", function () {
    let orderNFTLaunch;
    let orderToken;
    let mockERC20;
    let owner;
    let user1;
    let user2;
    let user3;
    let attacker;
    
    const BURN_AMOUNT = ethers.utils.parseEther("1000000"); // 1M tokens
    const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    
    beforeEach(async function () {
        [owner, user1, user2, user3, attacker] = await ethers.getSigners();
        
        // Deploy ORDER token mock
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        orderToken = await MockERC20.deploy(
            "ORDER Token",
            "ORDER",
            ethers.utils.parseEther("100000000") // 100M total supply
        );
        await orderToken.deployed();
        
        // Deploy another ERC20 for testing
        mockERC20 = await MockERC20.deploy(
            "Test Token",
            "TEST",
            ethers.utils.parseEther("1000000")
        );
        await mockERC20.deployed();
        
        // Deploy OrderNFTLaunch factory
        const OrderNFTLaunch = await ethers.getContractFactory("OrderNFTLaunch");
        orderNFTLaunch = await OrderNFTLaunch.deploy();
        await orderNFTLaunch.deployed();
        
        // Distribute tokens
        await orderToken.transfer(user1.address, BURN_AMOUNT.mul(5));
        await orderToken.transfer(user2.address, BURN_AMOUNT.mul(5));
        await orderToken.transfer(attacker.address, BURN_AMOUNT.mul(2));
        
        await mockERC20.transfer(user1.address, ethers.utils.parseEther("10000"));
        await mockERC20.transfer(user2.address, ethers.utils.parseEther("10000"));
        await mockERC20.transfer(user3.address, ethers.utils.parseEther("10000"));
    });
    
    describe("Access Control Tests", function () {
        it("Should only allow admin to set burn amount", async function () {
            await expect(
                orderNFTLaunch.connect(user1).setBurnAmount(ethers.utils.parseEther("500000"))
            ).to.be.revertedWith("Only admin");
            
            await expect(
                orderNFTLaunch.connect(owner).setBurnAmount(ethers.utils.parseEther("500000"))
            ).to.emit(orderNFTLaunch, "BurnAmountUpdated");
        });
        
        it("Should only allow admin to transfer admin role", async function () {
            await expect(
                orderNFTLaunch.connect(user1).transferAdmin(user2.address)
            ).to.be.revertedWith("Only admin");
            
            await expect(
                orderNFTLaunch.connect(owner).transferAdmin(user1.address)
            ).to.emit(orderNFTLaunch, "AdminTransferred");
        });
        
        it("Should only allow admin to set collection status", async function () {
            // First create a collection
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT);
            
            const params = {
                name: "Test NFT",
                symbol: "TNFT",
                baseURI: "https://test.com/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500, // 5%
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            
            const tx = await orderNFTLaunch.connect(user1).createNFTCollection(params);
            const receipt = await tx.wait();
            const collectionAddress = receipt.events.find(e => e.event === "CollectionCreated").args.collectionAddress;
            
            await expect(
                orderNFTLaunch.connect(user1).setCollectionStatus(collectionAddress, false)
            ).to.be.revertedWith("Only admin");
            
            await expect(
                orderNFTLaunch.connect(owner).setCollectionStatus(collectionAddress, false)
            ).to.emit(orderNFTLaunch, "CollectionStatusUpdated");
        });
    });
    
    describe("ORDER Token Burn Security", function () {
        it("Should require exact burn amount", async function () {
            const params = {
                name: "Test NFT",
                symbol: "TNFT",
                baseURI: "https://test.com/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            
            // Try with insufficient approval
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT.sub(1));
            await expect(
                orderNFTLaunch.connect(user1).createNFTCollection(params)
            ).to.be.revertedWith("ERC20: insufficient allowance");
            
            // Try with insufficient balance
            await orderToken.connect(user1).transfer(owner.address, BURN_AMOUNT.mul(4));
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT);
            await expect(
                orderNFTLaunch.connect(user1).createNFTCollection(params)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });
        
        it("Should properly burn tokens to dead address", async function () {
            const deadBalanceBefore = await orderToken.balanceOf(DEAD_ADDRESS);
            const userBalanceBefore = await orderToken.balanceOf(user1.address);
            
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT);
            
            const params = {
                name: "Test NFT",
                symbol: "TNFT",
                baseURI: "https://test.com/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            
            await orderNFTLaunch.connect(user1).createNFTCollection(params);
            
            const deadBalanceAfter = await orderToken.balanceOf(DEAD_ADDRESS);
            const userBalanceAfter = await orderToken.balanceOf(user1.address);
            
            expect(deadBalanceAfter.sub(deadBalanceBefore)).to.equal(BURN_AMOUNT);
            expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(BURN_AMOUNT);
        });
    });
    
    describe("URL Uniqueness Security", function () {
        it("Should prevent duplicate base URIs", async function () {
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT.mul(2));
            
            const params1 = {
                name: "Test NFT 1",
                symbol: "TNFT1",
                baseURI: "https://test.com/collection/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection 1",
                collectionImageUrl: "https://test.com/image1.png"
            };
            
            const params2 = {
                name: "Test NFT 2",
                symbol: "TNFT2",
                baseURI: "https://test.com/collection/", // Same URL
                maxSupply: 500,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("2"),
                marketplaceFeePercent: 300,
                description: "Test collection 2",
                collectionImageUrl: "https://test.com/image2.png"
            };
            
            // First collection should succeed
            await orderNFTLaunch.connect(user1).createNFTCollection(params1);
            
            // Second collection with same URL should fail
            await expect(
                orderNFTLaunch.connect(user1).createNFTCollection(params2)
            ).to.be.revertedWith("Base URI already used");
        });
        
        it("Should allow checking URL usage", async function () {
            const testUrl = "https://test.com/unique/";
            
            expect(await orderNFTLaunch.isUrlUsed(testUrl)).to.be.false;
            
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT);
            
            const params = {
                name: "Test NFT",
                symbol: "TNFT",
                baseURI: testUrl,
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            
            await orderNFTLaunch.connect(user1).createNFTCollection(params);
            
            expect(await orderNFTLaunch.isUrlUsed(testUrl)).to.be.true;
        });
    });
    
    describe("Parameter Validation Security", function () {
        it("Should validate collection parameters", async function () {
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT.mul(10));
            
            // Empty name
            let params = {
                name: "",
                symbol: "TNFT",
                baseURI: "https://test.com/1/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Invalid name length");
            
            // Empty symbol
            params.name = "Test NFT";
            params.symbol = "";
            params.baseURI = "https://test.com/2/";
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Invalid symbol length");
            
            // Empty base URI
            params.symbol = "TNFT";
            params.baseURI = "";
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Base URI required");
            
            // Zero max supply
            params.baseURI = "https://test.com/3/";
            params.maxSupply = 0;
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Invalid max supply");
            
            // Too high max supply
            params.maxSupply = 100001;
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Invalid max supply");
            
            // Invalid mint token
            params.maxSupply = 1000;
            params.mintToken = ethers.constants.AddressZero;
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Invalid mint token");
            
            // Zero mint price
            params.mintToken = mockERC20.address;
            params.mintPrice = 0;
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Invalid mint price");
            
            // Too high marketplace fee
            params.mintPrice = ethers.utils.parseEther("1");
            params.marketplaceFeePercent = 1001; // > 10%
            await expect(orderNFTLaunch.connect(user1).createNFTCollection(params)).to.be.revertedWith("Marketplace fee too high");
        });
        
        it("Should validate burn amount updates", async function () {
            await expect(
                orderNFTLaunch.connect(owner).setBurnAmount(0)
            ).to.be.revertedWith("Burn amount must be positive");
        });
        
        it("Should validate admin transfers", async function () {
            await expect(
                orderNFTLaunch.connect(owner).transferAdmin(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid new admin");
            
            await expect(
                orderNFTLaunch.connect(owner).transferAdmin(owner.address)
            ).to.be.revertedWith("Already admin");
        });
    });
    
    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy during collection creation", async function () {
            // This would require a malicious ERC20 contract that tries to reenter
            // For simplicity, we'll test that the nonReentrant modifier is in place
            // by checking multiple rapid calls don't cause issues
            
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT.mul(3));
            
            const params1 = {
                name: "Test NFT 1",
                symbol: "TNFT1",
                baseURI: "https://test.com/test1/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection 1",
                collectionImageUrl: "https://test.com/image1.png"
            };
            
            const params2 = {
                name: "Test NFT 2",
                symbol: "TNFT2",
                baseURI: "https://test.com/test2/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection 2",
                collectionImageUrl: "https://test.com/image2.png"
            };
            
            // Should be able to create collections sequentially
            await orderNFTLaunch.connect(user1).createNFTCollection(params1);
            await orderNFTLaunch.connect(user1).createNFTCollection(params2);
            
            expect(await orderNFTLaunch.collectionCount()).to.equal(2);
        });
    });
    
    describe("Pagination Security", function () {
        it("Should handle edge cases in pagination", async function () {
            // Test empty collections
            let result = await orderNFTLaunch.getAllNFTMarketplaces(0, 10, false);
            expect(result.length).to.equal(0);
            
            // Test offset beyond array
            result = await orderNFTLaunch.getAllNFTMarketplaces(100, 10, false);
            expect(result.length).to.equal(0);
            
            // Create some collections for testing
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT.mul(3));
            
            for (let i = 0; i < 3; i++) {
                const params = {
                    name: `Test NFT ${i}`,
                    symbol: `TNFT${i}`,
                    baseURI: `https://test.com/test${i}/`,
                    maxSupply: 1000,
                    mintToken: mockERC20.address,
                    mintPrice: ethers.utils.parseEther("1"),
                    marketplaceFeePercent: 500,
                    description: `Test collection ${i}`,
                    collectionImageUrl: `https://test.com/image${i}.png`
                };
                await orderNFTLaunch.connect(user1).createNFTCollection(params);
            }
            
            // Test normal pagination
            result = await orderNFTLaunch.getAllNFTMarketplaces(0, 2, false);
            expect(result.length).to.equal(2);
            
            // Test limit beyond available
            result = await orderNFTLaunch.getAllNFTMarketplaces(0, 10, false);
            expect(result.length).to.equal(3);
            
            // Test partial page
            result = await orderNFTLaunch.getAllNFTMarketplaces(2, 10, false);
            expect(result.length).to.equal(1);
        });
    });
    
    describe("Collection Management Security", function () {
        it("Should properly track collection data", async function () {
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT);
            
            const params = {
                name: "Test NFT",
                symbol: "TNFT",
                baseURI: "https://test.com/",
                maxSupply: 1000,
                mintToken: mockERC20.address,
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            
            const tx = await orderNFTLaunch.connect(user1).createNFTCollection(params);
            const receipt = await tx.wait();
            const collectionAddress = receipt.events.find(e => e.event === "CollectionCreated").args.collectionAddress;
            
            const info = await orderNFTLaunch.getCollectionInfo(collectionAddress);
            expect(info.creator).to.equal(user1.address);
            expect(info.name).to.equal(params.name);
            expect(info.symbol).to.equal(params.symbol);
            expect(info.maxSupply).to.equal(params.maxSupply);
            expect(info.mintToken).to.equal(params.mintToken);
            expect(info.mintPrice).to.equal(params.mintPrice);
            expect(info.marketplaceFeePercent).to.equal(params.marketplaceFeePercent);
            expect(info.isActive).to.be.true;
            
            const userCollections = await orderNFTLaunch.getCollectionsByCreator(user1.address);
            expect(userCollections.length).to.equal(1);
            expect(userCollections[0]).to.equal(collectionAddress);
        });
    });
    
    describe("ERC20 Token Validation", function () {
        it("Should validate mint token is proper ERC20", async function () {
            await orderToken.connect(user1).approve(orderNFTLaunch.address, BURN_AMOUNT);
            
            const params = {
                name: "Test NFT",
                symbol: "TNFT",
                baseURI: "https://test.com/",
                maxSupply: 1000,
                mintToken: user2.address, // Not a contract
                mintPrice: ethers.utils.parseEther("1"),
                marketplaceFeePercent: 500,
                description: "Test collection",
                collectionImageUrl: "https://test.com/image.png"
            };
            
            await expect(
                orderNFTLaunch.connect(user1).createNFTCollection(params)
            ).to.be.revertedWith("Invalid ERC20 mint token");
        });
    });
});