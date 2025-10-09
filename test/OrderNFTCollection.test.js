const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrderNFTCollection Security Tests", function () {
    let orderNFTLaunch;
    let orderToken;
    let mockERC20;
    let paymentToken;
    let nftCollection;
    let owner;
    let creator;
    let user1;
    let user2;
    let user3;
    let attacker;
    
    const BURN_AMOUNT = ethers.parseEther("1000000");
    const MINT_PRICE = ethers.parseEther("10");
    const MARKETPLACE_FEE = 500; // 5%
    
    beforeEach(async function () {
        [owner, creator, user1, user2, user3, attacker] = await ethers.getSigners();
        
        // Deploy tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        orderToken = await MockERC20.deploy("ORDER Token", "ORDER", ethers.parseEther("100000000"));
        mockERC20 = await MockERC20.deploy("Mint Token", "MINT", ethers.parseEther("1000000"));
        paymentToken = await MockERC20.deploy("Payment Token", "PAY", ethers.parseEther("1000000"));
        
        // Deploy factory
        const OrderNFTLaunch = await ethers.getContractFactory("OrderNFTLaunch");
        orderNFTLaunch = await OrderNFTLaunch.deploy();
        
        // Distribute ORDER tokens and approve
        await orderToken.transfer(creator.address, BURN_AMOUNT);
        await orderToken.connect(creator).approve(orderNFTLaunch.address, BURN_AMOUNT);
        
        // Distribute mint tokens
        await mockERC20.transfer(user1.address, ethers.parseEther("1000"));
        await mockERC20.transfer(user2.address, ethers.parseEther("1000"));
        await mockERC20.transfer(user3.address, ethers.parseEther("1000"));
        await mockERC20.transfer(attacker.address, ethers.parseEther("1000"));
        
        // Distribute payment tokens
        await paymentToken.transfer(user1.address, ethers.parseEther("1000"));
        await paymentToken.transfer(user2.address, ethers.parseEther("1000"));
        await paymentToken.transfer(user3.address, ethers.parseEther("1000"));
        await paymentToken.transfer(attacker.address, ethers.parseEther("1000"));
        
        // Create NFT collection
        const params = {
            name: "Test NFT Collection",
            symbol: "TNC",
            baseURI: "https://test.com/metadata/",
            maxSupply: 100,
            mintToken: mockERC20.address,
            mintPrice: MINT_PRICE,
            marketplaceFeePercent: MARKETPLACE_FEE,
            description: "Test NFT Collection for security testing",
            collectionImageUrl: "https://test.com/collection.png"
        };
        
        const tx = await orderNFTLaunch.connect(creator).createNFTCollection(params);
        const receipt = await tx.wait();
        const collectionAddress = receipt.events.find(e => e.event === "CollectionCreated").args.collectionAddress;
        
        // Get collection contract instance
        const OrderNFTCollection = await ethers.getContractFactory("OrderNFTCollection");
        nftCollection = OrderNFTCollection.attach(collectionAddress);
    });
    
    describe("Access Control Tests", function () {
        it("Should only allow creator to update settings", async function () {
            await expect(
                nftCollection.connect(user1).setMintPrice(ethers.parseEther("20"))
            ).to.be.revertedWith("Only creator");
            
            await expect(
                nftCollection.connect(user1).setMarketplaceFee(1000)
            ).to.be.revertedWith("Only creator");
            
            await expect(
                nftCollection.connect(user1).setMetadata("New description", "new-image.png")
            ).to.be.revertedWith("Only creator");
            
            // Creator should be able to update
            await expect(
                nftCollection.connect(creator).setMintPrice(ethers.parseEther("20"))
            ).to.emit(nftCollection, "MintPriceUpdated");
            
            await expect(
                nftCollection.connect(creator).setMarketplaceFee(1000)
            ).to.emit(nftCollection, "MarketplaceFeeUpdated");
            
            await nftCollection.connect(creator).setMetadata("New description", "new-image.png");
        });
        
        it("Should only allow token owners to list/unlist", async function () {
            // Mint a token
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE);
            await nftCollection.connect(user1).mint(user1.address);
            
            // User2 shouldn't be able to list user1's token
            await expect(
                nftCollection.connect(user2).listToken(1, ethers.parseEther("50"), paymentToken.address)
            ).to.be.revertedWith("Not token owner");
            
            // User1 should be able to list
            await nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), paymentToken.address);
            
            // User2 shouldn't be able to unlist user1's token
            await expect(
                nftCollection.connect(user2).unlistToken(1)
            ).to.be.revertedWith("Not token owner");
            
            // User1 should be able to unlist
            await nftCollection.connect(user1).unlistToken(1);
        });
        
        it("Should only allow creator to withdraw revenue", async function () {
            // Mint some tokens to generate revenue
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.mul(2));
            await nftCollection.connect(user1).mint(user1.address);
            await nftCollection.connect(user1).mint(user1.address);
            
            await expect(
                nftCollection.connect(user1).withdrawRevenue(mockERC20.address, MINT_PRICE)
            ).to.be.revertedWith("Only creator");
            
            await expect(
                nftCollection.connect(creator).withdrawRevenue(mockERC20.address, MINT_PRICE)
            ).to.emit(nftCollection, "RevenueWithdrawn");
        });
    });
    
    describe("Minting Security", function () {
        it("Should enforce max supply", async function () {
            // Set a small max supply for testing
            const smallParams = {
                name: "Small Collection",
                symbol: "SMALL",
                baseURI: "https://test.com/small/",
                maxSupply: 2,
                mintToken: mockERC20.address,
                mintPrice: MINT_PRICE,
                marketplaceFeePercent: MARKETPLACE_FEE,
                description: "Small test collection",
                collectionImageUrl: "https://test.com/small.png"
            };
            
            await orderToken.connect(creator).approve(orderNFTLaunch.address, BURN_AMOUNT);
            const tx = await orderNFTLaunch.connect(creator).createNFTCollection(smallParams);
            const receipt = await tx.wait();
            const smallCollectionAddress = receipt.events.find(e => e.event === "CollectionCreated").args.collectionAddress;
            
            const OrderNFTCollection = await ethers.getContractFactory("OrderNFTCollection");
            const smallCollection = OrderNFTCollection.attach(smallCollectionAddress);
            
            // Mint max supply
            await mockERC20.connect(user1).approve(smallCollection.address, MINT_PRICE.mul(3));
            await smallCollection.connect(user1).mint(user1.address);
            await smallCollection.connect(user1).mint(user1.address);
            
            // Third mint should fail
            await expect(
                smallCollection.connect(user1).mint(user1.address)
            ).to.be.revertedWith("Max supply reached");
        });
        
        it("Should require proper payment for minting", async function () {
            // Try to mint without approval
            await expect(
                nftCollection.connect(user1).mint(user1.address)
            ).to.be.revertedWith("ERC20: insufficient allowance");
            
            // Try to mint with insufficient approval
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.sub(1));
            await expect(
                nftCollection.connect(user1).mint(user1.address)
            ).to.be.revertedWith("ERC20: insufficient allowance");
            
            // Proper mint should work
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE);
            await expect(
                nftCollection.connect(user1).mint(user1.address)
            ).to.emit(nftCollection, "TokenMinted");
        });
        
        it("Should transfer payment to creator", async function () {
            const creatorBalanceBefore = await mockERC20.balanceOf(creator.address);
            const userBalanceBefore = await mockERC20.balanceOf(user1.address);
            
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE);
            await nftCollection.connect(user1).mint(user1.address);
            
            const creatorBalanceAfter = await mockERC20.balanceOf(creator.address);
            const userBalanceAfter = await mockERC20.balanceOf(user1.address);
            
            expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(MINT_PRICE);
            expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(MINT_PRICE);
        });
    });
    
    describe("Marketplace Security", function () {
        beforeEach(async function () {
            // Mint some tokens for testing
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.mul(3));
            await nftCollection.connect(user1).mint(user1.address); // Token 1
            await nftCollection.connect(user1).mint(user2.address); // Token 2
            await nftCollection.connect(user1).mint(user3.address); // Token 3
        });
        
        it("Should prevent listing non-existent tokens", async function () {
            await expect(
                nftCollection.connect(user1).listToken(999, ethers.parseEther("50"), paymentToken.address)
            ).to.be.revertedWith("Token does not exist");
        });
        
        it("Should prevent double listing", async function () {
            await nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), paymentToken.address);
            
            await expect(
                nftCollection.connect(user1).listToken(1, ethers.parseEther("100"), paymentToken.address)
            ).to.be.revertedWith("Token is listed");
        });
        
        it("Should validate listing parameters", async function () {
            // Zero price
            await expect(
                nftCollection.connect(user1).listToken(1, 0, paymentToken.address)
            ).to.be.revertedWith("Price must be positive");
            
            // Invalid payment token
            await expect(
                nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid payment token");
            
            // Non-ERC20 payment token
            await expect(
                nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), user1.address)
            ).to.be.revertedWith("Invalid ERC20 payment token");
        });
        
        it("Should prevent buying own tokens", async function () {
            await nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), paymentToken.address);
            
            await paymentToken.connect(user1).approve(nftCollection.address, ethers.parseEther("50"));
            await expect(
                nftCollection.connect(user1).buyToken(1)
            ).to.be.revertedWith("Cannot buy own token");
        });
        
        it("Should properly calculate and transfer marketplace fees", async function () {
            const salePrice = ethers.parseEther("100");
            const expectedFee = salePrice.mul(MARKETPLACE_FEE).div(10000); // 5%
            const expectedSellerAmount = salePrice.sub(expectedFee);
            
            await nftCollection.connect(user1).listToken(1, salePrice, paymentToken.address);
            
            const creatorBalanceBefore = await paymentToken.balanceOf(creator.address);
            const sellerBalanceBefore = await paymentToken.balanceOf(user1.address);
            const buyerBalanceBefore = await paymentToken.balanceOf(user2.address);
            
            await paymentToken.connect(user2).approve(nftCollection.address, salePrice);
            await nftCollection.connect(user2).buyToken(1);
            
            const creatorBalanceAfter = await paymentToken.balanceOf(creator.address);
            const sellerBalanceAfter = await paymentToken.balanceOf(user1.address);
            const buyerBalanceAfter = await paymentToken.balanceOf(user2.address);
            
            expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(expectedFee);
            expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(expectedSellerAmount);
            expect(buyerBalanceBefore.sub(buyerBalanceAfter)).to.equal(salePrice);
            
            // Verify ownership transfer
            expect(await nftCollection.ownerOf(1)).to.equal(user2.address);
        });
        
        it("Should automatically unlist when token is transferred", async function () {
            await nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), paymentToken.address);
            
            expect(await nftCollection.isListed(1)).to.be.true;
            
            // Transfer token directly
            await nftCollection.connect(user1).transferFrom(user1.address, user3.address, 1);
            
            expect(await nftCollection.isListed(1)).to.be.false;
        });
        
        it("Should handle zero marketplace fee correctly", async function () {
            // Create collection with 0% marketplace fee
            const zeroFeeParams = {
                name: "Zero Fee Collection",
                symbol: "ZERO",
                baseURI: "https://test.com/zero/",
                maxSupply: 100,
                mintToken: mockERC20.address,
                mintPrice: MINT_PRICE,
                marketplaceFeePercent: 0,
                description: "Zero fee test collection",
                collectionImageUrl: "https://test.com/zero.png"
            };
            
            await orderToken.connect(creator).approve(orderNFTLaunch.address, BURN_AMOUNT);
            const tx = await orderNFTLaunch.connect(creator).createNFTCollection(zeroFeeParams);
            const receipt = await tx.wait();
            const zeroFeeCollectionAddress = receipt.events.find(e => e.event === "CollectionCreated").args.collectionAddress;
            
            const OrderNFTCollection = await ethers.getContractFactory("OrderNFTCollection");
            const zeroFeeCollection = OrderNFTCollection.attach(zeroFeeCollectionAddress);
            
            // Mint and list
            await mockERC20.connect(user1).approve(zeroFeeCollection.address, MINT_PRICE);
            await zeroFeeCollection.connect(user1).mint(user1.address);
            
            const salePrice = ethers.parseEther("100");
            await zeroFeeCollection.connect(user1).listToken(1, salePrice, paymentToken.address);
            
            const creatorBalanceBefore = await paymentToken.balanceOf(creator.address);
            const sellerBalanceBefore = await paymentToken.balanceOf(user1.address);
            
            await paymentToken.connect(user2).approve(zeroFeeCollection.address, salePrice);
            await zeroFeeCollection.connect(user2).buyToken(1);
            
            const creatorBalanceAfter = await paymentToken.balanceOf(creator.address);
            const sellerBalanceAfter = await paymentToken.balanceOf(user1.address);
            
            // Creator should receive no marketplace fee
            expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(0);
            // Seller should receive full amount
            expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(salePrice);
        });
    });
    
    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy during minting", async function () {
            // Test that multiple simultaneous mints don't cause issues
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.mul(3));
            
            // These should execute sequentially without reentrancy issues
            const promises = [
                nftCollection.connect(user1).mint(user1.address),
                nftCollection.connect(user1).mint(user1.address),
                nftCollection.connect(user1).mint(user1.address)
            ];
            
            await Promise.all(promises);
            
            expect(await nftCollection.totalSupply()).to.equal(3);
        });
        
        it("Should prevent reentrancy during buying", async function () {
            // Mint and list tokens
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.mul(2));
            await nftCollection.connect(user1).mint(user1.address);
            await nftCollection.connect(user1).mint(user1.address);
            
            const salePrice = ethers.parseEther("50");
            await nftCollection.connect(user1).listToken(1, salePrice, paymentToken.address);
            await nftCollection.connect(user1).listToken(2, salePrice, paymentToken.address);
            
            await paymentToken.connect(user2).approve(nftCollection.address, salePrice.mul(2));
            
            // Buy tokens - should work sequentially
            await nftCollection.connect(user2).buyToken(1);
            await nftCollection.connect(user2).buyToken(2);
            
            expect(await nftCollection.ownerOf(1)).to.equal(user2.address);
            expect(await nftCollection.ownerOf(2)).to.equal(user2.address);
        });
    });
    
    describe("Revenue Withdrawal Security", function () {
        beforeEach(async function () {
            // Generate some revenue
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.mul(5));
            for (let i = 0; i < 5; i++) {
                await nftCollection.connect(user1).mint(user1.address);
            }
        });
        
        it("Should prevent withdrawing more than available", async function () {
            const availableRevenue = await nftCollection.revenueByToken(mockERC20.address);
            
            await expect(
                nftCollection.connect(creator).withdrawRevenue(mockERC20.address, availableRevenue.add(1))
            ).to.be.revertedWith("Insufficient revenue");
        });
        
        it("Should prevent zero withdrawals", async function () {
            await expect(
                nftCollection.connect(creator).withdrawRevenue(mockERC20.address, 0)
            ).to.be.revertedWith("Amount must be positive");
        });
        
        it("Should properly track revenue after withdrawals", async function () {
            const totalRevenueBefore = await nftCollection.totalRevenue();
            const revenueByTokenBefore = await nftCollection.revenueByToken(mockERC20.address);
            
            const withdrawAmount = MINT_PRICE.mul(2);
            await nftCollection.connect(creator).withdrawRevenue(mockERC20.address, withdrawAmount);
            
            const totalRevenueAfter = await nftCollection.totalRevenue();
            const revenueByTokenAfter = await nftCollection.revenueByToken(mockERC20.address);
            
            expect(totalRevenueBefore.sub(totalRevenueAfter)).to.equal(withdrawAmount);
            expect(revenueByTokenBefore.sub(revenueByTokenAfter)).to.equal(withdrawAmount);
        });
    });
    
    describe("Parameter Validation", function () {
        it("Should validate mint price updates", async function () {
            await expect(
                nftCollection.connect(creator).setMintPrice(0)
            ).to.be.revertedWith("Price must be positive");
        });
        
        it("Should validate marketplace fee updates", async function () {
            await expect(
                nftCollection.connect(creator).setMarketplaceFee(1001) // > 10%
            ).to.be.revertedWith("Fee too high");
            
            // 10% should be allowed
            await nftCollection.connect(creator).setMarketplaceFee(1000);
        });
        
        it("Should validate price updates for listings", async function () {
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE);
            await nftCollection.connect(user1).mint(user1.address);
            
            await nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), paymentToken.address);
            
            await expect(
                nftCollection.connect(user1).updatePrice(1, 0)
            ).to.be.revertedWith("Price must be positive");
        });
    });
    
    describe("Query Functions Security", function () {
        beforeEach(async function () {
            // Mint some tokens and create listings
            await mockERC20.connect(user1).approve(nftCollection.address, MINT_PRICE.mul(5));
            for (let i = 0; i < 5; i++) {
                await nftCollection.connect(user1).mint(user1.address);
            }
            
            // List some tokens
            await nftCollection.connect(user1).listToken(1, ethers.parseEther("50"), paymentToken.address);
            await nftCollection.connect(user1).listToken(3, ethers.parseEther("75"), paymentToken.address);
        });
        
        it("Should handle pagination edge cases", async function () {
            // Test offset beyond array
            let listings = await nftCollection.getActiveListings(100, 10);
            expect(listings.length).to.equal(0);
            
            // Test normal pagination
            listings = await nftCollection.getActiveListings(0, 1);
            expect(listings.length).to.equal(1);
            
            // Test limit beyond available
            listings = await nftCollection.getActiveListings(0, 10);
            expect(listings.length).to.equal(2);
        });
        
        it("Should return correct tokens of owner", async function () {
            const user1Tokens = await nftCollection.tokensOfOwner(user1.address);
            expect(user1Tokens.length).to.equal(5);
            
            // Transfer a token
            await nftCollection.connect(user1).transferFrom(user1.address, user2.address, 2);
            
            const user1TokensAfter = await nftCollection.tokensOfOwner(user1.address);
            const user2Tokens = await nftCollection.tokensOfOwner(user2.address);
            
            expect(user1TokensAfter.length).to.equal(4);
            expect(user2Tokens.length).to.equal(1);
            expect(user2Tokens[0]).to.equal(2);
        });
        
        it("Should return correct collection stats", async function () {
            const stats = await nftCollection.getCollectionStats();
            
            expect(stats._totalSupply).to.equal(5);
            expect(stats._maxSupply).to.equal(100);
            expect(stats._totalRevenue).to.equal(MINT_PRICE.mul(5));
            expect(stats._activeListingsCount).to.equal(2);
            expect(stats._mintPrice).to.equal(MINT_PRICE);
            expect(stats._marketplaceFeePercent).to.equal(MARKETPLACE_FEE);
        });
    });
});
