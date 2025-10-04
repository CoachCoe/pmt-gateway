// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PMTEscrow
 * @dev Escrow contract for PMT Gateway - holds payments until delivery confirmation
 * @notice This contract implements a secure escrow system for marketplace payments
 *
 * Key Features:
 * - Holds funds in escrow until buyer confirms delivery or timeout
 * - Platform fee collection (configurable)
 * - Refund capability for merchants
 * - Dispute resolution mechanism
 * - Emergency pause functionality
 * - Auto-release after expiration
 */
contract PMTEscrow is Ownable, ReentrancyGuard, Pausable {

    // ============ State Variables ============

    /// @notice Platform fee in basis points (250 = 2.5%)
    uint16 public platformFeeBps;

    /// @notice Address to receive platform fees
    address payable public platformAddress;

    /// @notice Counter for payment IDs
    uint256 public nextPaymentId;

    /// @notice Mapping of payment ID to Payment struct
    mapping(uint256 => Payment) public payments;

    /// @notice Mapping of merchant address to their payment IDs
    mapping(address => uint256[]) public merchantPayments;

    /// @notice Mapping of buyer address to their payment IDs
    mapping(address => uint256[]) public buyerPayments;

    // ============ Structs ============

    struct Payment {
        address payable buyer;
        address payable merchant;
        uint256 amount;           // Total amount paid
        uint256 platformFee;      // Fee amount for platform
        uint256 merchantAmount;   // Amount for merchant (after fee)
        PaymentStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 releasedAt;
        string externalId;        // Reference to off-chain payment intent ID
    }

    enum PaymentStatus {
        Pending,      // Funds in escrow, awaiting confirmation
        Completed,    // Funds released to merchant
        Refunded,     // Funds returned to buyer
        Disputed      // In dispute resolution
    }

    // ============ Events ============

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed buyer,
        address indexed merchant,
        uint256 amount,
        uint256 platformFee,
        uint256 expiresAt,
        string externalId
    );

    event PaymentReleased(
        uint256 indexed paymentId,
        address indexed merchant,
        uint256 amount,
        uint256 platformFee,
        address releasedBy
    );

    event PaymentRefunded(
        uint256 indexed paymentId,
        address indexed buyer,
        uint256 amount,
        address refundedBy
    );

    event PaymentDisputed(
        uint256 indexed paymentId,
        address indexed initiator
    );

    event DisputeResolved(
        uint256 indexed paymentId,
        address indexed winner,
        uint256 amount
    );

    event PlatformFeeUpdated(uint16 oldFee, uint16 newFee);

    event PlatformAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // ============ Errors ============

    error InvalidAmount();
    error InvalidAddress();
    error InvalidFee();
    error PaymentNotFound();
    error InvalidStatus();
    error Unauthorized();
    error PaymentExpired();
    error PaymentNotExpired();
    error TransferFailed();
    error InvalidExpirationTime();

    // ============ Constructor ============

    /**
     * @notice Initialize the escrow contract
     * @param _platformFeeBps Platform fee in basis points (e.g., 250 = 2.5%)
     * @param _platformAddress Address to receive platform fees
     */
    constructor(
        uint16 _platformFeeBps,
        address payable _platformAddress
    ) Ownable(msg.sender) {
        if (_platformFeeBps > 10000) revert InvalidFee(); // Max 100%
        if (_platformAddress == address(0)) revert InvalidAddress();

        platformFeeBps = _platformFeeBps;
        platformAddress = _platformAddress;
        nextPaymentId = 1;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new escrow payment
     * @param merchant Address to receive the payment
     * @param expirationSeconds Time in seconds until auto-release
     * @param externalId External reference ID (e.g., payment intent ID)
     * @return paymentId The ID of the created payment
     */
    function createPayment(
        address payable merchant,
        uint256 expirationSeconds,
        string calldata externalId
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        if (msg.value == 0) revert InvalidAmount();
        if (merchant == address(0)) revert InvalidAddress();
        if (expirationSeconds == 0 || expirationSeconds > 365 days) {
            revert InvalidExpirationTime();
        }

        // Calculate fees
        uint256 platformFee = (msg.value * platformFeeBps) / 10000;
        uint256 merchantAmount = msg.value - platformFee;

        // Create payment
        uint256 paymentId = nextPaymentId++;

        payments[paymentId] = Payment({
            buyer: payable(msg.sender),
            merchant: merchant,
            amount: msg.value,
            platformFee: platformFee,
            merchantAmount: merchantAmount,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + expirationSeconds,
            releasedAt: 0,
            externalId: externalId
        });

        // Track payments
        merchantPayments[merchant].push(paymentId);
        buyerPayments[msg.sender].push(paymentId);

        emit PaymentCreated(
            paymentId,
            msg.sender,
            merchant,
            msg.value,
            platformFee,
            block.timestamp + expirationSeconds,
            externalId
        );

        return paymentId;
    }

    /**
     * @notice Release payment to merchant
     * @dev Can be called by buyer (confirmation) or anyone after expiration (auto-release)
     * @param paymentId The ID of the payment to release
     */
    function releasePayment(uint256 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];

        if (payment.buyer == address(0)) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Pending) revert InvalidStatus();

        // Check authorization
        bool isBuyer = msg.sender == payment.buyer;
        bool isExpired = block.timestamp > payment.expiresAt;
        bool isOwner = msg.sender == owner();

        if (!isBuyer && !isExpired && !isOwner) revert Unauthorized();

        // Update status
        payment.status = PaymentStatus.Completed;
        payment.releasedAt = block.timestamp;

        // Transfer funds
        (bool merchantSuccess, ) = payment.merchant.call{value: payment.merchantAmount}("");
        if (!merchantSuccess) revert TransferFailed();

        (bool platformSuccess, ) = platformAddress.call{value: payment.platformFee}("");
        if (!platformSuccess) revert TransferFailed();

        emit PaymentReleased(
            paymentId,
            payment.merchant,
            payment.merchantAmount,
            payment.platformFee,
            msg.sender
        );
    }

    /**
     * @notice Refund payment to buyer
     * @dev Can be called by merchant or owner before expiration
     * @param paymentId The ID of the payment to refund
     */
    function refundPayment(uint256 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];

        if (payment.buyer == address(0)) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Pending) revert InvalidStatus();

        // Check authorization (merchant or owner can refund)
        if (msg.sender != payment.merchant && msg.sender != owner()) {
            revert Unauthorized();
        }

        // Can't refund after expiration (would auto-release to merchant)
        if (block.timestamp > payment.expiresAt) revert PaymentExpired();

        // Update status
        payment.status = PaymentStatus.Refunded;

        // Transfer full amount back to buyer (including platform fee)
        (bool success, ) = payment.buyer.call{value: payment.amount}("");
        if (!success) revert TransferFailed();

        emit PaymentRefunded(
            paymentId,
            payment.buyer,
            payment.amount,
            msg.sender
        );
    }

    /**
     * @notice Initiate dispute for a payment
     * @dev Can be called by buyer or merchant
     * @param paymentId The ID of the payment to dispute
     */
    function disputePayment(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];

        if (payment.buyer == address(0)) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Pending) revert InvalidStatus();

        // Only buyer or merchant can dispute
        if (msg.sender != payment.buyer && msg.sender != payment.merchant) {
            revert Unauthorized();
        }

        // Can't dispute after expiration
        if (block.timestamp > payment.expiresAt) revert PaymentExpired();

        payment.status = PaymentStatus.Disputed;

        emit PaymentDisputed(paymentId, msg.sender);
    }

    /**
     * @notice Resolve a disputed payment
     * @dev Owner only - can award to buyer or merchant
     * @param paymentId The ID of the disputed payment
     * @param refundToBuyer True to refund buyer, false to pay merchant
     */
    function resolveDispute(
        uint256 paymentId,
        bool refundToBuyer
    ) external onlyOwner nonReentrant {
        Payment storage payment = payments[paymentId];

        if (payment.buyer == address(0)) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Disputed) revert InvalidStatus();

        if (refundToBuyer) {
            // Refund to buyer (full amount)
            payment.status = PaymentStatus.Refunded;

            (bool success, ) = payment.buyer.call{value: payment.amount}("");
            if (!success) revert TransferFailed();

            emit DisputeResolved(paymentId, payment.buyer, payment.amount);
        } else {
            // Pay to merchant (with platform fee)
            payment.status = PaymentStatus.Completed;
            payment.releasedAt = block.timestamp;

            (bool merchantSuccess, ) = payment.merchant.call{value: payment.merchantAmount}("");
            if (!merchantSuccess) revert TransferFailed();

            (bool platformSuccess, ) = platformAddress.call{value: payment.platformFee}("");
            if (!platformSuccess) revert TransferFailed();

            emit DisputeResolved(paymentId, payment.merchant, payment.merchantAmount);
        }
    }

    /**
     * @notice Batch release multiple expired payments
     * @dev Gas-optimized batch processing for auto-releases
     * @param paymentIds Array of payment IDs to release
     */
    function batchReleaseExpired(uint256[] calldata paymentIds) external nonReentrant {
        for (uint256 i = 0; i < paymentIds.length; i++) {
            Payment storage payment = payments[paymentIds[i]];

            // Skip if invalid or already processed
            if (payment.buyer == address(0)) continue;
            if (payment.status != PaymentStatus.Pending) continue;
            if (block.timestamp <= payment.expiresAt) continue;

            // Release payment
            payment.status = PaymentStatus.Completed;
            payment.releasedAt = block.timestamp;

            // Transfer funds (ignore failures to continue batch)
            payment.merchant.call{value: payment.merchantAmount}("");
            platformAddress.call{value: payment.platformFee}("");

            emit PaymentReleased(
                paymentIds[i],
                payment.merchant,
                payment.merchantAmount,
                payment.platformFee,
                msg.sender
            );
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get payment details
     * @param paymentId The ID of the payment
     * @return Payment struct
     */
    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Get all payment IDs for a merchant
     * @param merchant The merchant address
     * @return Array of payment IDs
     */
    function getMerchantPayments(address merchant) external view returns (uint256[] memory) {
        return merchantPayments[merchant];
    }

    /**
     * @notice Get all payment IDs for a buyer
     * @param buyer The buyer address
     * @return Array of payment IDs
     */
    function getBuyerPayments(address buyer) external view returns (uint256[] memory) {
        return buyerPayments[buyer];
    }

    /**
     * @notice Check if payment is expired
     * @param paymentId The ID of the payment
     * @return True if expired
     */
    function isPaymentExpired(uint256 paymentId) external view returns (bool) {
        Payment memory payment = payments[paymentId];
        return block.timestamp > payment.expiresAt;
    }

    /**
     * @notice Calculate platform fee for an amount
     * @param amount The payment amount
     * @return The platform fee
     */
    function calculatePlatformFee(uint256 amount) external view returns (uint256) {
        return (amount * platformFeeBps) / 10000;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform fee
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > 10000) revert InvalidFee(); // Max 100%

        uint16 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;

        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Update platform address
     * @param newAddress New platform address
     */
    function setPlatformAddress(address payable newAddress) external onlyOwner {
        if (newAddress == address(0)) revert InvalidAddress();

        address oldAddress = platformAddress;
        platformAddress = newAddress;

        emit PlatformAddressUpdated(oldAddress, newAddress);
    }

    /**
     * @notice Pause contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw (only if paused and for stuck funds)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner whenPaused {
        (bool success, ) = owner().call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // ============ Receive Function ============

    /**
     * @notice Reject direct ETH transfers
     */
    receive() external payable {
        revert("Use createPayment");
    }
}
