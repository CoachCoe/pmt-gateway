// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PMTMerchantRegistry
 * @dev On-chain registry for merchant preferences and configuration
 *
 * Stores all merchant settings on the blockchain, making the system fully decentralized.
 * No database needed for merchant data - everything is verifiable on-chain.
 *
 * Features:
 * - Merchant profiles (name, metadata)
 * - Payout preferences (schedule, minimum amount)
 * - Platform fee customization per merchant
 * - Webhook URLs (encrypted hash for privacy)
 * - API key management (hashed on-chain)
 * - Merchant reputation/stats
 */
contract PMTMerchantRegistry is Ownable {

    // ============ Structs ============

    struct MerchantProfile {
        address walletAddress;      // Merchant's wallet (their identity)
        string name;                // Business name (e.g., "Alice's Shop")
        string metadata;            // IPFS hash for additional data (logo, description, etc.)
        uint16 customFeeBps;        // Custom platform fee (0 = use default)
        PayoutSchedule schedule;    // When they get paid
        uint256 minPayoutAmount;    // Minimum payout threshold (in wei)
        bool isActive;              // Can accept payments
        uint256 createdAt;          // Registration timestamp
        uint256 updatedAt;          // Last profile update
    }

    struct MerchantStats {
        uint256 totalPayments;      // Lifetime payment count
        uint256 totalVolume;        // Lifetime DOT volume
        uint256 successfulPayments; // Completed payments
        uint256 refundedPayments;   // Refunded payments
        uint256 lastPaymentAt;      // Most recent payment timestamp
    }

    enum PayoutSchedule {
        INSTANT,    // Immediate release after confirmation
        DAILY,      // Once per day
        WEEKLY,     // Once per week
        MONTHLY     // Once per month
    }

    // ============ State Variables ============

    /// @notice Mapping of merchant address to their profile
    mapping(address => MerchantProfile) public merchants;

    /// @notice Mapping of merchant address to their stats
    mapping(address => MerchantStats) public merchantStats;

    /// @notice Mapping of merchant address to webhook URL hash
    /// @dev Stores keccak256(webhookUrl) for privacy, verified off-chain
    mapping(address => bytes32) public webhookHashes;

    /// @notice Mapping of merchant address to API key hash
    /// @dev Stores keccak256(apiKey) for authentication
    mapping(address => bytes32) public apiKeyHashes;

    /// @notice List of all registered merchant addresses
    address[] public merchantList;

    /// @notice Mapping to check if address is registered
    mapping(address => bool) public isRegistered;

    /// @notice Default platform fee in basis points
    uint16 public defaultPlatformFeeBps = 250; // 2.5%

    // ============ Events ============

    event MerchantRegistered(
        address indexed merchantAddress,
        string name,
        uint256 timestamp
    );

    event MerchantUpdated(
        address indexed merchantAddress,
        string name,
        uint256 timestamp
    );

    event MerchantDeactivated(
        address indexed merchantAddress,
        uint256 timestamp
    );

    event MerchantReactivated(
        address indexed merchantAddress,
        uint256 timestamp
    );

    event WebhookUpdated(
        address indexed merchantAddress,
        bytes32 webhookHash
    );

    event ApiKeyUpdated(
        address indexed merchantAddress,
        bytes32 apiKeyHash
    );

    event PayoutPreferencesUpdated(
        address indexed merchantAddress,
        PayoutSchedule schedule,
        uint256 minPayoutAmount
    );

    event StatsUpdated(
        address indexed merchantAddress,
        uint256 totalPayments,
        uint256 totalVolume
    );

    // ============ Modifiers ============

    modifier onlyRegistered() {
        require(isRegistered[msg.sender], "Merchant not registered");
        _;
    }

    modifier onlyActive() {
        require(merchants[msg.sender].isActive, "Merchant not active");
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Merchant Registration ============

    /**
     * @notice Register as a new merchant (fully permissionless!)
     * @param name Business name
     * @param metadata IPFS hash for additional merchant data
     * @param schedule Payout schedule preference
     * @param minPayoutAmount Minimum payout threshold
     */
    function registerMerchant(
        string calldata name,
        string calldata metadata,
        PayoutSchedule schedule,
        uint256 minPayoutAmount
    ) external {
        require(!isRegistered[msg.sender], "Already registered");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(minPayoutAmount > 0, "Invalid minimum payout");

        merchants[msg.sender] = MerchantProfile({
            walletAddress: msg.sender,
            name: name,
            metadata: metadata,
            customFeeBps: 0, // Use default fee
            schedule: schedule,
            minPayoutAmount: minPayoutAmount,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        merchantStats[msg.sender] = MerchantStats({
            totalPayments: 0,
            totalVolume: 0,
            successfulPayments: 0,
            refundedPayments: 0,
            lastPaymentAt: 0
        });

        isRegistered[msg.sender] = true;
        merchantList.push(msg.sender);

        emit MerchantRegistered(msg.sender, name, block.timestamp);
    }

    /**
     * @notice Update merchant profile
     * @param name New business name
     * @param metadata New IPFS metadata hash
     */
    function updateProfile(
        string calldata name,
        string calldata metadata
    ) external onlyRegistered {
        require(bytes(name).length > 0, "Name cannot be empty");

        MerchantProfile storage merchant = merchants[msg.sender];
        merchant.name = name;
        merchant.metadata = metadata;
        merchant.updatedAt = block.timestamp;

        emit MerchantUpdated(msg.sender, name, block.timestamp);
    }

    /**
     * @notice Update payout preferences
     * @param schedule New payout schedule
     * @param minPayoutAmount New minimum payout threshold
     */
    function updatePayoutPreferences(
        PayoutSchedule schedule,
        uint256 minPayoutAmount
    ) external onlyRegistered {
        require(minPayoutAmount > 0, "Invalid minimum payout");

        MerchantProfile storage merchant = merchants[msg.sender];
        merchant.schedule = schedule;
        merchant.minPayoutAmount = minPayoutAmount;
        merchant.updatedAt = block.timestamp;

        emit PayoutPreferencesUpdated(msg.sender, schedule, minPayoutAmount);
    }

    /**
     * @notice Update webhook URL hash (for privacy)
     * @param webhookHash keccak256 hash of webhook URL
     */
    function updateWebhook(bytes32 webhookHash) external onlyRegistered {
        webhookHashes[msg.sender] = webhookHash;
        emit WebhookUpdated(msg.sender, webhookHash);
    }

    /**
     * @notice Update API key hash
     * @param apiKeyHash keccak256 hash of API key
     */
    function updateApiKey(bytes32 apiKeyHash) external onlyRegistered {
        require(apiKeyHash != bytes32(0), "Invalid API key hash");
        apiKeyHashes[msg.sender] = apiKeyHash;
        emit ApiKeyUpdated(msg.sender, apiKeyHash);
    }

    /**
     * @notice Deactivate merchant account (can be reactivated)
     */
    function deactivate() external onlyRegistered {
        merchants[msg.sender].isActive = false;
        merchants[msg.sender].updatedAt = block.timestamp;
        emit MerchantDeactivated(msg.sender, block.timestamp);
    }

    /**
     * @notice Reactivate merchant account
     */
    function reactivate() external onlyRegistered {
        merchants[msg.sender].isActive = true;
        merchants[msg.sender].updatedAt = block.timestamp;
        emit MerchantReactivated(msg.sender, block.timestamp);
    }

    // ============ Stats Management (called by escrow contract) ============

    /**
     * @notice Update merchant stats after successful payment
     * @param merchantAddress Merchant address
     * @param amount Payment amount
     */
    function recordPayment(
        address merchantAddress,
        uint256 amount,
        bool isSuccess
    ) external onlyOwner {
        require(isRegistered[merchantAddress], "Merchant not registered");

        MerchantStats storage stats = merchantStats[merchantAddress];
        stats.totalPayments += 1;
        stats.totalVolume += amount;
        stats.lastPaymentAt = block.timestamp;

        if (isSuccess) {
            stats.successfulPayments += 1;
        } else {
            stats.refundedPayments += 1;
        }

        emit StatsUpdated(merchantAddress, stats.totalPayments, stats.totalVolume);
    }

    // ============ Platform Admin Functions ============

    /**
     * @notice Set custom platform fee for specific merchant (owner only)
     * @param merchantAddress Merchant address
     * @param customFeeBps Custom fee in basis points
     */
    function setCustomFee(
        address merchantAddress,
        uint16 customFeeBps
    ) external onlyOwner {
        require(isRegistered[merchantAddress], "Merchant not registered");
        require(customFeeBps <= 10000, "Fee cannot exceed 100%");

        merchants[merchantAddress].customFeeBps = customFeeBps;
        merchants[merchantAddress].updatedAt = block.timestamp;
    }

    /**
     * @notice Update default platform fee (owner only)
     * @param newFeeBps New default fee in basis points
     */
    function setDefaultFee(uint16 newFeeBps) external onlyOwner {
        require(newFeeBps <= 10000, "Fee cannot exceed 100%");
        defaultPlatformFeeBps = newFeeBps;
    }

    // ============ View Functions ============

    /**
     * @notice Get merchant profile
     * @param merchantAddress Merchant address
     * @return profile Merchant profile struct
     */
    function getMerchant(address merchantAddress)
        external
        view
        returns (MerchantProfile memory)
    {
        require(isRegistered[merchantAddress], "Merchant not registered");
        return merchants[merchantAddress];
    }

    /**
     * @notice Get merchant stats
     * @param merchantAddress Merchant address
     * @return stats Merchant stats struct
     */
    function getMerchantStats(address merchantAddress)
        external
        view
        returns (MerchantStats memory)
    {
        require(isRegistered[merchantAddress], "Merchant not registered");
        return merchantStats[merchantAddress];
    }

    /**
     * @notice Get effective platform fee for merchant
     * @param merchantAddress Merchant address
     * @return feeBps Platform fee in basis points
     */
    function getPlatformFee(address merchantAddress)
        external
        view
        returns (uint16)
    {
        if (!isRegistered[merchantAddress]) {
            return defaultPlatformFeeBps;
        }

        uint16 customFee = merchants[merchantAddress].customFeeBps;
        return customFee > 0 ? customFee : defaultPlatformFeeBps;
    }

    /**
     * @notice Get total number of registered merchants
     * @return count Total merchant count
     */
    function getMerchantCount() external view returns (uint256) {
        return merchantList.length;
    }

    /**
     * @notice Get list of all merchant addresses
     * @return addresses Array of merchant addresses
     */
    function getAllMerchants() external view returns (address[] memory) {
        return merchantList;
    }

    /**
     * @notice Get paginated list of merchants
     * @param offset Starting index
     * @param limit Number of results
     * @return addresses Array of merchant addresses
     */
    function getMerchantsPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory)
    {
        require(offset < merchantList.length, "Offset out of bounds");

        uint256 end = offset + limit;
        if (end > merchantList.length) {
            end = merchantList.length;
        }

        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = merchantList[i];
        }

        return result;
    }

    /**
     * @notice Verify webhook URL hash
     * @param merchantAddress Merchant address
     * @param webhookUrl Webhook URL to verify
     * @return isValid True if hash matches
     */
    function verifyWebhook(
        address merchantAddress,
        string calldata webhookUrl
    ) external view returns (bool) {
        bytes32 hash = keccak256(abi.encodePacked(webhookUrl));
        return webhookHashes[merchantAddress] == hash;
    }

    /**
     * @notice Verify API key hash
     * @param merchantAddress Merchant address
     * @param apiKey API key to verify
     * @return isValid True if hash matches
     */
    function verifyApiKey(
        address merchantAddress,
        string calldata apiKey
    ) external view returns (bool) {
        bytes32 hash = keccak256(abi.encodePacked(apiKey));
        return apiKeyHashes[merchantAddress] == hash;
    }
}
