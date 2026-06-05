// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MedicalRecordRegistry {
    struct Record {
        string cid;
        address patient;
        address author;
        uint256 createdAt;
    }

    uint256 public nextRecordId;
    mapping(uint256 => Record) private records;
    mapping(address => mapping(address => bool)) public accessGrants;

    event RecordCreated(uint256 indexed recordId, address indexed patient, address indexed author, string cid);
    event AccessUpdated(address indexed patient, address indexed grantee, bool granted);

    function setAccess(address grantee, bool granted) external {
        require(grantee != address(0), "Invalid grantee");
        accessGrants[msg.sender][grantee] = granted;
        emit AccessUpdated(msg.sender, grantee, granted);
    }

    function createRecord(address patient, string calldata cid) external returns (uint256 recordId) {
        require(patient != address(0), "Invalid patient");
        require(bytes(cid).length > 0, "CID is required");
        require(msg.sender == patient || accessGrants[patient][msg.sender], "Access denied");

        recordId = nextRecordId++;
        records[recordId] = Record(cid, patient, msg.sender, block.timestamp);
        emit RecordCreated(recordId, patient, msg.sender, cid);
    }

    function getRecord(uint256 recordId) external view returns (Record memory) {
        Record memory record = records[recordId];
        require(record.patient != address(0), "Record not found");
        require(msg.sender == record.patient || accessGrants[record.patient][msg.sender], "Access denied");
        return record;
    }
}

