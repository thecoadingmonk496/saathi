// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SaathiVerification is Ownable {
    struct SupplyChainRecord {
        bytes32 dataHash;
        string product;
        string stage;
        uint256 timestamp;
        address verifier;
    }

    struct BuyerVerification {
        bytes32 dataHash;
        string buyerType;
        bool verified;
        uint256 timestamp;
        address verifier;
    }

    mapping(string => SupplyChainRecord) private supplyChainRecords;
    mapping(string => BuyerVerification) private buyerVerifications;

    event SupplyChainRecorded(
        string indexed recordId,
        bytes32 indexed dataHash,
        string product,
        string stage,
        uint256 timestamp,
        address indexed verifier
    );

    event BuyerVerified(
        string indexed buyerId,
        bytes32 indexed dataHash,
        string buyerType,
        uint256 timestamp,
        address indexed verifier
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function recordSupplyChain(
        string calldata recordId,
        bytes32 dataHash,
        string calldata product,
        string calldata stage
    ) external onlyOwner {
        require(bytes(recordId).length > 0, "Record ID is required");
        require(supplyChainRecords[recordId].timestamp == 0, "Record already exists");

        uint256 recordedAt = block.timestamp;
        supplyChainRecords[recordId] = SupplyChainRecord(
            dataHash,
            product,
            stage,
            recordedAt,
            msg.sender
        );

        emit SupplyChainRecorded(recordId, dataHash, product, stage, recordedAt, msg.sender);
    }

    function verifyBuyer(
        string calldata buyerId,
        bytes32 dataHash,
        string calldata buyerType
    ) external onlyOwner {
        require(bytes(buyerId).length > 0, "Buyer ID is required");
        require(buyerVerifications[buyerId].timestamp == 0, "Buyer already verified");

        uint256 verifiedAt = block.timestamp;
        buyerVerifications[buyerId] = BuyerVerification(
            dataHash,
            buyerType,
            true,
            verifiedAt,
            msg.sender
        );

        emit BuyerVerified(buyerId, dataHash, buyerType, verifiedAt, msg.sender);
    }

    function getSupplyChainRecord(string calldata recordId)
        external
        view
        returns (SupplyChainRecord memory)
    {
        return supplyChainRecords[recordId];
    }

    function getBuyerVerification(string calldata buyerId)
        external
        view
        returns (BuyerVerification memory)
    {
        return buyerVerifications[buyerId];
    }
}
