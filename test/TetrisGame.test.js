const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TetrisGame", function () {
    let tetrisGame;
    let orderToken;
    let owner, player1, player2;
    let orderTokenAddress;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Mock ORDER token kontratı oluştur
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        orderToken = await MockERC20.deploy(
            "ORDER Token",
            "ORDER",
            ethers.parseEther("1000000") // 1M token
        );
        await orderToken.waitForDeployment();
        orderTokenAddress = await orderToken.getAddress();

        // TetrisGame kontratını deploy et
        const TetrisGame = await ethers.getContractFactory("TetrisGame");
        tetrisGame = await TetrisGame.deploy(orderTokenAddress);
        await tetrisGame.waitForDeployment();

        // Oyunculara token ver
        await orderToken.transfer(player1.address, ethers.parseEther("1000"));
        await orderToken.transfer(player2.address, ethers.parseEther("1000"));
    });

    describe("Kredi satın alma", function () {
        it("ORDER token karşılığında kredi satın alabilmeli", async function () {
            const tokenAmount = ethers.parseEther("10"); // 10 ORDER token
            
            // Token onayı ver
            await orderToken.connect(player1).approve(await tetrisGame.getAddress(), tokenAmount);
            
            // Kredi satın al
            await tetrisGame.connect(player1).buyCredits(tokenAmount);
            
            // Kredi bakiyesini kontrol et
            const playerInfo = await tetrisGame.getPlayerInfo(player1.address);
            expect(playerInfo.credits).to.equal(10); // 10 kredi
            expect(playerInfo.isActive).to.be.true;
        });

        it("Token yakma ve ödül havuzu güncellemesi yapmalı", async function () {
            const tokenAmount = ethers.parseEther("100"); // 100 ORDER token
            
            await orderToken.connect(player1).approve(await tetrisGame.getAddress(), tokenAmount);
            await tetrisGame.connect(player1).buyCredits(tokenAmount);
            
            const stats = await tetrisGame.getGameStats();
            expect(stats._rewardPool).to.equal(ethers.parseEther("50")); // %50 ödül havuzu
            expect(stats._totalBurned).to.equal(ethers.parseEther("50")); // %50 yakıldı
        });
    });

    describe("Ödül havuzuna ekleme", function () {
        it("Herkes ödül havuzuna token ekleyebilmeli", async function () {
            const tokenAmount = ethers.parseEther("50");
            
            await orderToken.connect(player2).approve(await tetrisGame.getAddress(), tokenAmount);
            await tetrisGame.connect(player2).addRewardToPool(tokenAmount);
            
            const stats = await tetrisGame.getGameStats();
            expect(stats._rewardPool).to.equal(tokenAmount);
        });
    });

    describe("Oyun oturumu", function () {
        beforeEach(async function () {
            // Player1'e kredi ver
            const tokenAmount = ethers.parseEther("10");
            await orderToken.connect(player1).approve(await tetrisGame.getAddress(), tokenAmount);
            await tetrisGame.connect(player1).buyCredits(tokenAmount);
        });

        it("Oyun başlatabilmeli", async function () {
            await tetrisGame.connect(player1).startGame();
            
            const playerInfo = await tetrisGame.getPlayerInfo(player1.address);
            expect(playerInfo.credits).to.equal(9); // 1 kredi harcandı
            
            const stats = await tetrisGame.getGameStats();
            expect(stats._gameSessionCounter).to.equal(1);
        });

        it("Kredi olmadan oyun başlatamamalı", async function () {
            // Tüm kredileri harca
            for (let i = 0; i < 10; i++) {
                await tetrisGame.connect(player1).startGame();
            }
            
            await expect(
                tetrisGame.connect(player1).startGame()
            ).to.be.revertedWith("Insufficient credits");
        });
    });

    describe("Ödül hesaplama", function () {
        beforeEach(async function () {
            // Ödül havuzuna token ekle
            const tokenAmount = ethers.parseEther("1000");
            await orderToken.connect(owner).approve(await tetrisGame.getAddress(), tokenAmount);
            await tetrisGame.connect(owner).addRewardToPool(tokenAmount);
        });

        it("Seviye 50+ için %50 ödül hesaplamalı", async function () {
            const reward = await tetrisGame.calculateReward(50);
            expect(reward).to.equal(ethers.parseEther("500")); // %50 of 1000
        });

        it("Seviye 25+ için %25 ödül hesaplamalı", async function () {
            const reward = await tetrisGame.calculateReward(25);
            expect(reward).to.equal(ethers.parseEther("250")); // %25 of 1000
        });

        it("Seviye 10+ için %10 ödül hesaplamalı", async function () {
            const reward = await tetrisGame.calculateReward(10);
            expect(reward).to.equal(ethers.parseEther("100")); // %10 of 1000
        });

        it("Seviye 5+ için %5 ödül hesaplamalı", async function () {
            const reward = await tetrisGame.calculateReward(5);
            expect(reward).to.equal(ethers.parseEther("50")); // %5 of 1000
        });

        it("Seviye 1+ için %1 ödül hesaplamalı", async function () {
            const reward = await tetrisGame.calculateReward(1);
            expect(reward).to.equal(ethers.parseEther("10")); // %1 of 1000
        });
    });

    describe("Oyun bitirme ve ödül talep etme", function () {
        let sessionId;

        beforeEach(async function () {
            // Ödül havuzuna token ekle
            const tokenAmount = ethers.parseEther("1000");
            await orderToken.connect(owner).approve(await tetrisGame.getAddress(), tokenAmount);
            await tetrisGame.connect(owner).addRewardToPool(tokenAmount);

            // Player1'e kredi ver ve oyun başlat
            const creditAmount = ethers.parseEther("10");
            await orderToken.connect(player1).approve(await tetrisGame.getAddress(), creditAmount);
            await tetrisGame.connect(player1).buyCredits(creditAmount);
            
            await tetrisGame.connect(player1).startGame();
            sessionId = 1;
        });

        it("Oyun bitirip ödül talep edebilmeli", async function () {
            const score = 10000;
            const level = 25;
            const lines = 100;
            
            // Oyun hash'i oluştur
            const gameHash = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["uint256", "uint256", "uint256", "uint256", "address"],
                    [sessionId, score, level, lines, player1.address]
                )
            );

            // Oyunu bitir
            await tetrisGame.connect(player1).endGame(
                sessionId, score, level, lines, gameHash, 0, ethers.ZeroHash, ethers.ZeroHash
            );

            // Oyun oturumu bilgilerini kontrol et
            const session = await tetrisGame.getGameSession(sessionId);
            expect(session.score).to.equal(score);
            expect(session.level).to.equal(level);
            expect(session.rewardAmount).to.equal(ethers.parseEther("250")); // %25 ödül

            // Ödül talep et
            const balanceBefore = await orderToken.balanceOf(player1.address);
            await tetrisGame.connect(player1).claimReward(sessionId);
            const balanceAfter = await orderToken.balanceOf(player1.address);

            expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("250"));
        });

        it("Aynı ödülü iki kez talep edememeli", async function () {
            const score = 10000;
            const level = 25;
            const lines = 100;
            
            const gameHash = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["uint256", "uint256", "uint256", "uint256", "address"],
                    [sessionId, score, level, lines, player1.address]
                )
            );

            await tetrisGame.connect(player1).endGame(
                sessionId, score, level, lines, gameHash, 0, ethers.ZeroHash, ethers.ZeroHash
            );
            
            await tetrisGame.connect(player1).claimReward(sessionId);
            
            await expect(
                tetrisGame.connect(player1).claimReward(sessionId)
            ).to.be.revertedWith("Reward already claimed");
        });
    });

    describe("İstatistikler", function () {
        it("Oyun istatistiklerini doğru göstermeli", async function () {
            const stats = await tetrisGame.getGameStats();
            expect(stats._rewardPool).to.equal(0);
            expect(stats._totalBurned).to.equal(0);
            expect(stats._totalPlayers).to.equal(0);
            expect(stats._gameSessionCounter).to.equal(0);
        });

        it("Oyuncu bilgilerini doğru göstermeli", async function () {
            const playerInfo = await tetrisGame.getPlayerInfo(player1.address);
            expect(playerInfo.credits).to.equal(0);
            expect(playerInfo.highScore).to.equal(0);
            expect(playerInfo.gamesPlayed).to.equal(0);
            expect(playerInfo.totalEarnings).to.equal(0);
            expect(playerInfo.isActive).to.be.false;
        });
    });
});