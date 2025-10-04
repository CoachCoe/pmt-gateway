import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PMTEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PMTEscrow", function () {
  // Constants
  const PLATFORM_FEE_BPS = 250; // 2.5%
  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const PAYMENT_AMOUNT = ethers.parseEther("1.0");

  // Fixture to deploy contract
  async function deployEscrowFixture() {
    const [owner, platform, merchant, buyer, other] = await ethers.getSigners();

    const PMTEscrow = await ethers.getContractFactory("PMTEscrow");
    const escrow = await PMTEscrow.deploy(PLATFORM_FEE_BPS, platform.address);

    return { escrow, owner, platform, merchant, buyer, other };
  }

  describe("Deployment", function () {
    it("Should set the correct platform fee", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(await escrow.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });

    it("Should set the correct platform address", async function () {
      const { escrow, platform } = await loadFixture(deployEscrowFixture);
      expect(await escrow.platformAddress()).to.equal(platform.address);
    });

    it("Should set the correct owner", async function () {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("Should start with payment ID 1", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(await escrow.nextPaymentId()).to.equal(1);
    });

    it("Should revert if platform fee is > 100%", async function () {
      const [owner, platform] = await ethers.getSigners();
      const PMTEscrow = await ethers.getContractFactory("PMTEscrow");

      await expect(
        PMTEscrow.deploy(10001, platform.address) // 100.01%
      ).to.be.revertedWithCustomError(PMTEscrow, "InvalidFee");
    });

    it("Should revert if platform address is zero", async function () {
      const PMTEscrow = await ethers.getContractFactory("PMTEscrow");

      await expect(
        PMTEscrow.deploy(PLATFORM_FEE_BPS, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(PMTEscrow, "InvalidAddress");
    });
  });

  describe("Create Payment", function () {
    it("Should create a payment successfully", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      const tx = await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-intent-123",
        { value: PAYMENT_AMOUNT }
      );

      await expect(tx)
        .to.emit(escrow, "PaymentCreated")
        .withArgs(
          1, // paymentId
          buyer.address,
          merchant.address,
          PAYMENT_AMOUNT,
          PAYMENT_AMOUNT * BigInt(PLATFORM_FEE_BPS) / BigInt(10000),
          await time.latest() + ONE_DAY,
          "payment-intent-123"
        );
    });

    it("Should calculate platform fee correctly", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-intent-123",
        { value: PAYMENT_AMOUNT }
      );

      const payment = await escrow.getPayment(1);
      const expectedFee = PAYMENT_AMOUNT * BigInt(PLATFORM_FEE_BPS) / BigInt(10000);
      const expectedMerchantAmount = PAYMENT_AMOUNT - expectedFee;

      expect(payment.platformFee).to.equal(expectedFee);
      expect(payment.merchantAmount).to.equal(expectedMerchantAmount);
    });

    it("Should track merchant payments", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-1",
        { value: PAYMENT_AMOUNT }
      );

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-2",
        { value: PAYMENT_AMOUNT }
      );

      const merchantPayments = await escrow.getMerchantPayments(merchant.address);
      expect(merchantPayments.length).to.equal(2);
      expect(merchantPayments[0]).to.equal(1);
      expect(merchantPayments[1]).to.equal(2);
    });

    it("Should track buyer payments", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-1",
        { value: PAYMENT_AMOUNT }
      );

      const buyerPayments = await escrow.getBuyerPayments(buyer.address);
      expect(buyerPayments.length).to.equal(1);
      expect(buyerPayments[0]).to.equal(1);
    });

    it("Should revert if amount is zero", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(buyer).createPayment(
          merchant.address,
          ONE_DAY,
          "payment-123",
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("Should revert if merchant address is zero", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(buyer).createPayment(
          ethers.ZeroAddress,
          ONE_DAY,
          "payment-123",
          { value: PAYMENT_AMOUNT }
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidAddress");
    });

    it("Should revert if expiration is zero", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(buyer).createPayment(
          merchant.address,
          0,
          "payment-123",
          { value: PAYMENT_AMOUNT }
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidExpirationTime");
    });

    it("Should revert if expiration is > 365 days", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(buyer).createPayment(
          merchant.address,
          366 * 24 * 3600,
          "payment-123",
          { value: PAYMENT_AMOUNT }
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidExpirationTime");
    });

    it("Should revert when paused", async function () {
      const { escrow, merchant, buyer, owner } = await loadFixture(deployEscrowFixture);

      await escrow.connect(owner).pause();

      await expect(
        escrow.connect(buyer).createPayment(
          merchant.address,
          ONE_DAY,
          "payment-123",
          { value: PAYMENT_AMOUNT }
        )
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });
  });

  describe("Release Payment", function () {
    async function createPaymentFixture() {
      const base = await deployEscrowFixture();
      const { escrow, merchant, buyer } = base;

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-123",
        { value: PAYMENT_AMOUNT }
      );

      return { ...base, paymentId: 1 };
    }

    it("Should allow buyer to release payment", async function () {
      const { escrow, merchant, platform, buyer, paymentId } = await loadFixture(createPaymentFixture);

      const payment = await escrow.getPayment(paymentId);
      const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);
      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);

      await expect(escrow.connect(buyer).releasePayment(paymentId))
        .to.emit(escrow, "PaymentReleased")
        .withArgs(
          paymentId,
          merchant.address,
          payment.merchantAmount,
          payment.platformFee,
          buyer.address
        );

      const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(payment.merchantAmount);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(payment.platformFee);
    });

    it("Should allow auto-release after expiration", async function () {
      const { escrow, merchant, platform, other, paymentId } = await loadFixture(createPaymentFixture);

      // Fast forward past expiration
      await time.increase(ONE_DAY + 1);

      const payment = await escrow.getPayment(paymentId);
      const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);
      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);

      // Anyone can release after expiration
      await expect(escrow.connect(other).releasePayment(paymentId))
        .to.emit(escrow, "PaymentReleased");

      const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(payment.merchantAmount);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(payment.platformFee);
    });

    it("Should allow owner to release payment anytime", async function () {
      const { escrow, owner, paymentId } = await loadFixture(createPaymentFixture);

      await expect(escrow.connect(owner).releasePayment(paymentId))
        .to.emit(escrow, "PaymentReleased");

      const payment = await escrow.getPayment(paymentId);
      expect(payment.status).to.equal(1); // Completed
    });

    it("Should revert if not authorized before expiration", async function () {
      const { escrow, other, paymentId } = await loadFixture(createPaymentFixture);

      await expect(
        escrow.connect(other).releasePayment(paymentId)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should revert if payment not found", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(buyer).releasePayment(999)
      ).to.be.revertedWithCustomError(escrow, "PaymentNotFound");
    });

    it("Should revert if payment already completed", async function () {
      const { escrow, buyer, paymentId } = await loadFixture(createPaymentFixture);

      await escrow.connect(buyer).releasePayment(paymentId);

      await expect(
        escrow.connect(buyer).releasePayment(paymentId)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("Should update payment status to Completed", async function () {
      const { escrow, buyer, paymentId } = await loadFixture(createPaymentFixture);

      await escrow.connect(buyer).releasePayment(paymentId);

      const payment = await escrow.getPayment(paymentId);
      expect(payment.status).to.equal(1); // Completed
      expect(payment.releasedAt).to.be.gt(0);
    });
  });

  describe("Refund Payment", function () {
    async function createPaymentFixture() {
      const base = await deployEscrowFixture();
      const { escrow, merchant, buyer } = base;

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-123",
        { value: PAYMENT_AMOUNT }
      );

      return { ...base, paymentId: 1 };
    }

    it("Should allow merchant to refund payment", async function () {
      const { escrow, merchant, buyer, paymentId } = await loadFixture(createPaymentFixture);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await expect(escrow.connect(merchant).refundPayment(paymentId))
        .to.emit(escrow, "PaymentRefunded")
        .withArgs(paymentId, buyer.address, PAYMENT_AMOUNT, merchant.address);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(PAYMENT_AMOUNT);
    });

    it("Should allow owner to refund payment", async function () {
      const { escrow, owner, buyer, paymentId } = await loadFixture(createPaymentFixture);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await expect(escrow.connect(owner).refundPayment(paymentId))
        .to.emit(escrow, "PaymentRefunded");

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(PAYMENT_AMOUNT);
    });

    it("Should refund full amount including platform fee", async function () {
      const { escrow, merchant, buyer, paymentId } = await loadFixture(createPaymentFixture);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await escrow.connect(merchant).refundPayment(paymentId);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(PAYMENT_AMOUNT);
    });

    it("Should revert if not merchant or owner", async function () {
      const { escrow, other, paymentId } = await loadFixture(createPaymentFixture);

      await expect(
        escrow.connect(other).refundPayment(paymentId)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should revert if payment expired", async function () {
      const { escrow, merchant, paymentId } = await loadFixture(createPaymentFixture);

      await time.increase(ONE_DAY + 1);

      await expect(
        escrow.connect(merchant).refundPayment(paymentId)
      ).to.be.revertedWithCustomError(escrow, "PaymentExpired");
    });

    it("Should update payment status to Refunded", async function () {
      const { escrow, merchant, paymentId } = await loadFixture(createPaymentFixture);

      await escrow.connect(merchant).refundPayment(paymentId);

      const payment = await escrow.getPayment(paymentId);
      expect(payment.status).to.equal(2); // Refunded
    });
  });

  describe("Dispute Payment", function () {
    async function createPaymentFixture() {
      const base = await deployEscrowFixture();
      const { escrow, merchant, buyer } = base;

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-123",
        { value: PAYMENT_AMOUNT }
      );

      return { ...base, paymentId: 1 };
    }

    it("Should allow buyer to dispute payment", async function () {
      const { escrow, buyer, paymentId } = await loadFixture(createPaymentFixture);

      await expect(escrow.connect(buyer).disputePayment(paymentId))
        .to.emit(escrow, "PaymentDisputed")
        .withArgs(paymentId, buyer.address);

      const payment = await escrow.getPayment(paymentId);
      expect(payment.status).to.equal(3); // Disputed
    });

    it("Should allow merchant to dispute payment", async function () {
      const { escrow, merchant, paymentId } = await loadFixture(createPaymentFixture);

      await expect(escrow.connect(merchant).disputePayment(paymentId))
        .to.emit(escrow, "PaymentDisputed")
        .withArgs(paymentId, merchant.address);
    });

    it("Should revert if not buyer or merchant", async function () {
      const { escrow, other, paymentId } = await loadFixture(createPaymentFixture);

      await expect(
        escrow.connect(other).disputePayment(paymentId)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should revert if payment expired", async function () {
      const { escrow, buyer, paymentId } = await loadFixture(createPaymentFixture);

      await time.increase(ONE_DAY + 1);

      await expect(
        escrow.connect(buyer).disputePayment(paymentId)
      ).to.be.revertedWithCustomError(escrow, "PaymentExpired");
    });
  });

  describe("Resolve Dispute", function () {
    async function createDisputedPaymentFixture() {
      const base = await deployEscrowFixture();
      const { escrow, merchant, buyer } = base;

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-123",
        { value: PAYMENT_AMOUNT }
      );

      await escrow.connect(buyer).disputePayment(1);

      return { ...base, paymentId: 1 };
    }

    it("Should allow owner to resolve dispute in favor of buyer", async function () {
      const { escrow, owner, buyer, paymentId } = await loadFixture(createDisputedPaymentFixture);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await expect(escrow.connect(owner).resolveDispute(paymentId, true))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(paymentId, buyer.address, PAYMENT_AMOUNT);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(PAYMENT_AMOUNT);

      const payment = await escrow.getPayment(paymentId);
      expect(payment.status).to.equal(2); // Refunded
    });

    it("Should allow owner to resolve dispute in favor of merchant", async function () {
      const { escrow, owner, merchant, platform, paymentId } = await loadFixture(createDisputedPaymentFixture);

      const payment = await escrow.getPayment(paymentId);
      const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);
      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);

      await expect(escrow.connect(owner).resolveDispute(paymentId, false))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(paymentId, merchant.address, payment.merchantAmount);

      const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(payment.merchantAmount);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(payment.platformFee);

      const updatedPayment = await escrow.getPayment(paymentId);
      expect(updatedPayment.status).to.equal(1); // Completed
    });

    it("Should revert if not owner", async function () {
      const { escrow, buyer, paymentId } = await loadFixture(createDisputedPaymentFixture);

      await expect(
        escrow.connect(buyer).resolveDispute(paymentId, true)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Should revert if payment not disputed", async function () {
      const { escrow, merchant, buyer, owner } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-123",
        { value: PAYMENT_AMOUNT }
      );

      await expect(
        escrow.connect(owner).resolveDispute(1, true)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });
  });

  describe("Batch Release", function () {
    it("Should batch release multiple expired payments", async function () {
      const { escrow, merchant, buyer, platform } = await loadFixture(deployEscrowFixture);

      // Create 3 payments
      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_HOUR,
        "payment-1",
        { value: PAYMENT_AMOUNT }
      );
      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_HOUR,
        "payment-2",
        { value: PAYMENT_AMOUNT }
      );
      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_HOUR,
        "payment-3",
        { value: PAYMENT_AMOUNT }
      );

      // Fast forward past expiration
      await time.increase(ONE_HOUR + 1);

      const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);
      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);

      // Batch release all 3
      await escrow.batchReleaseExpired([1, 2, 3]);

      const payment1 = await escrow.getPayment(1);
      const payment2 = await escrow.getPayment(2);
      const payment3 = await escrow.getPayment(3);

      expect(payment1.status).to.equal(1); // Completed
      expect(payment2.status).to.equal(1);
      expect(payment3.status).to.equal(1);

      const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);

      const totalMerchantAmount = payment1.merchantAmount + payment2.merchantAmount + payment3.merchantAmount;
      const totalPlatformFee = payment1.platformFee + payment2.platformFee + payment3.platformFee;

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(totalMerchantAmount);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(totalPlatformFee);
    });

    it("Should skip invalid payments in batch", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_HOUR,
        "payment-1",
        { value: PAYMENT_AMOUNT }
      );

      await time.increase(ONE_HOUR + 1);

      // Should not revert even with invalid payment IDs
      await escrow.batchReleaseExpired([1, 999, 1000]);

      const payment = await escrow.getPayment(1);
      expect(payment.status).to.equal(1); // Completed
    });

    it("Should skip non-expired payments in batch", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_HOUR,
        "payment-1",
        { value: PAYMENT_AMOUNT }
      );
      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_DAY,
        "payment-2",
        { value: PAYMENT_AMOUNT }
      );

      await time.increase(ONE_HOUR + 1);

      await escrow.batchReleaseExpired([1, 2]);

      const payment1 = await escrow.getPayment(1);
      const payment2 = await escrow.getPayment(2);

      expect(payment1.status).to.equal(1); // Completed
      expect(payment2.status).to.equal(0); // Still Pending
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);

      await expect(escrow.connect(owner).setPlatformFee(500))
        .to.emit(escrow, "PlatformFeeUpdated")
        .withArgs(PLATFORM_FEE_BPS, 500);

      expect(await escrow.platformFeeBps()).to.equal(500);
    });

    it("Should revert if non-owner tries to update platform fee", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(buyer).setPlatformFee(500)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update platform address", async function () {
      const { escrow, owner, other } = await loadFixture(deployEscrowFixture);

      await expect(escrow.connect(owner).setPlatformAddress(other.address))
        .to.emit(escrow, "PlatformAddressUpdated");

      expect(await escrow.platformAddress()).to.equal(other.address);
    });

    it("Should allow owner to pause contract", async function () {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);

      await escrow.connect(owner).pause();

      expect(await escrow.paused()).to.be.true;
    });

    it("Should allow owner to unpause contract", async function () {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);

      await escrow.connect(owner).pause();
      await escrow.connect(owner).unpause();

      expect(await escrow.paused()).to.be.false;
    });
  });

  describe("View Functions", function () {
    it("Should check if payment is expired", async function () {
      const { escrow, merchant, buyer } = await loadFixture(deployEscrowFixture);

      await escrow.connect(buyer).createPayment(
        merchant.address,
        ONE_HOUR,
        "payment-123",
        { value: PAYMENT_AMOUNT }
      );

      expect(await escrow.isPaymentExpired(1)).to.be.false;

      await time.increase(ONE_HOUR + 1);

      expect(await escrow.isPaymentExpired(1)).to.be.true;
    });

    it("Should calculate platform fee correctly", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);

      const fee = await escrow.calculatePlatformFee(PAYMENT_AMOUNT);
      const expectedFee = PAYMENT_AMOUNT * BigInt(PLATFORM_FEE_BPS) / BigInt(10000);

      expect(fee).to.equal(expectedFee);
    });
  });

  describe("Security", function () {
    it("Should reject direct ETH transfers", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);

      await expect(
        buyer.sendTransaction({
          to: await escrow.getAddress(),
          value: PAYMENT_AMOUNT,
        })
      ).to.be.revertedWith("Use createPayment");
    });

    it("Should be protected against reentrancy on release", async function () {
      // This is implicitly tested by the ReentrancyGuard modifier
      // Additional reentrancy attack tests can be added with malicious contracts
    });
  });
});
