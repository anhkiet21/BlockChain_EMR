// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Immutable registry for encrypted medical-record references and patient-managed access.
/// @dev Never store plaintext medical or personally identifiable data in this contract.
contract MedicalRecordRegistry {
    uint256 public constant MAX_CID_LENGTH = 255;
    uint256 public constant NO_PREVIOUS_RECORD = type(uint256).max;
    uint256 public constant MAX_EMERGENCY_DURATION = 24 hours;

    struct Record {
        string cid;
        bytes32 contentHash;
        address patient;
        address author;
        uint64 createdAt;
        uint256 previousRecordId;
    }

    error ZeroAddress();
    error InvalidCid();
    error InvalidContentHash();
    error InvalidDuration();
    error AccessAlreadyGranted(address patient, address grantee);
    error AccessAlreadyRevoked(address patient, address grantee);
    error AccessDenied(address patient, address caller);
    error RecordNotFound(uint256 recordId);
    error RecordAlreadySuperseded(uint256 recordId);

    uint256 public nextRecordId;
    mapping(uint256 => Record) private records;
    mapping(uint256 => uint256) private successorRecordIds;
    mapping(address => mapping(address => bool)) public accessGrants;
    /// @notice emergencyAccessExpires[patient][doctor] = timestamp when emergency access expires (0 = no emergency)
    mapping(address => mapping(address => uint256)) public emergencyAccessExpires;

    event AccessGranted(address indexed patient, address indexed grantee);
    event AccessRevoked(address indexed patient, address indexed grantee);
    event RecordCreated(
        uint256 indexed recordId,
        address indexed patient,
        address indexed author,
        string cid,
        bytes32 contentHash,
        uint256 previousRecordId
    );
    event RecordVersionCreated(uint256 indexed previousRecordId, uint256 indexed newRecordId);
    event EmergencyAccessTriggered(
        address indexed patient,
        address indexed doctor,
        uint256 expiresAt,
        bytes32 reasonHash
    );
    event EmergencyAccessRevoked(address indexed patient, address indexed doctor);

    function grantAccess(address grantee) external {
        if (grantee == address(0)) revert ZeroAddress();
        if (accessGrants[msg.sender][grantee]) revert AccessAlreadyGranted(msg.sender, grantee);

        accessGrants[msg.sender][grantee] = true;
        emit AccessGranted(msg.sender, grantee);
    }

    function revokeAccess(address grantee) external {
        if (grantee == address(0)) revert ZeroAddress();
        if (!accessGrants[msg.sender][grantee]) revert AccessAlreadyRevoked(msg.sender, grantee);

        accessGrants[msg.sender][grantee] = false;
        emit AccessRevoked(msg.sender, grantee);
    }

    /// @notice Doctor triggers emergency (break-the-glass) access to a patient's records.
    /// @param patient The patient's wallet address.
    /// @param reasonHash keccak256 hash of the emergency reason string (kept off-chain).
    /// @param duration Access duration in seconds, must be > 0 and <= 24 hours.
    function triggerEmergencyAccess(address patient, bytes32 reasonHash, uint256 duration) external {
        if (patient == address(0)) revert ZeroAddress();
        if (duration == 0 || duration > MAX_EMERGENCY_DURATION) revert InvalidDuration();
        if (reasonHash == bytes32(0)) revert InvalidContentHash();

        uint256 expiresAt = block.timestamp + duration;
        emergencyAccessExpires[patient][msg.sender] = expiresAt;
        emit EmergencyAccessTriggered(patient, msg.sender, expiresAt, reasonHash);
    }

    /// @notice Revoke an active emergency access grant (callable by patient or the doctor themselves).
    function revokeEmergencyAccess(address patient, address doctor) external {
        if (msg.sender != patient && msg.sender != doctor) revert AccessDenied(patient, msg.sender);
        emergencyAccessExpires[patient][doctor] = 0;
        emit EmergencyAccessRevoked(patient, doctor);
    }

    function hasAccess(address patient, address grantee) external view returns (bool) {
        return patient == grantee
            || accessGrants[patient][grantee]
            || (emergencyAccessExpires[patient][grantee] > block.timestamp);
    }

    function hasEmergencyAccess(address patient, address grantee) external view returns (bool) {
        return emergencyAccessExpires[patient][grantee] > block.timestamp;
    }

    function createRecord(address patient, string calldata cid, bytes32 contentHash)
        external
        returns (uint256 recordId)
    {
        _requireAuthorized(patient, msg.sender);
        recordId = _createRecord(patient, cid, contentHash, NO_PREVIOUS_RECORD);
    }

    function createRecordVersion(uint256 previousRecordId, string calldata cid, bytes32 contentHash)
        external
        returns (uint256 recordId)
    {
        Record storage previous = _existingRecord(previousRecordId);
        _requireAuthorized(previous.patient, msg.sender);
        if (successorRecordIds[previousRecordId] != 0) revert RecordAlreadySuperseded(previousRecordId);

        recordId = _createRecord(previous.patient, cid, contentHash, previousRecordId);
        // Store recordId + 1 so record zero can be represented without a sentinel collision.
        successorRecordIds[previousRecordId] = recordId + 1;
        emit RecordVersionCreated(previousRecordId, recordId);
    }

    function getRecord(uint256 recordId) external view returns (Record memory) {
        Record storage record = _existingRecord(recordId);
        _requireAuthorized(record.patient, msg.sender);
        return record;
    }

    function getSuccessorRecordId(uint256 recordId) external view returns (bool superseded, uint256 successorRecordId) {
        Record storage record = _existingRecord(recordId);
        _requireAuthorized(record.patient, msg.sender);
        uint256 encoded = successorRecordIds[recordId];
        return encoded == 0 ? (false, 0) : (true, encoded - 1);
    }

    function isLatestVersion(uint256 recordId) external view returns (bool) {
        Record storage record = _existingRecord(recordId);
        _requireAuthorized(record.patient, msg.sender);
        return successorRecordIds[recordId] == 0;
    }

    function _createRecord(address patient, string calldata cid, bytes32 contentHash, uint256 previousRecordId)
        private
        returns (uint256 recordId)
    {
        uint256 cidLength = bytes(cid).length;
        if (cidLength == 0 || cidLength > MAX_CID_LENGTH) revert InvalidCid();
        if (contentHash == bytes32(0)) revert InvalidContentHash();

        recordId = nextRecordId++;
        records[recordId] = Record(cid, contentHash, patient, msg.sender, uint64(block.timestamp), previousRecordId);
        emit RecordCreated(recordId, patient, msg.sender, cid, contentHash, previousRecordId);
    }

    function _existingRecord(uint256 recordId) private view returns (Record storage record) {
        record = records[recordId];
        if (record.patient == address(0)) revert RecordNotFound(recordId);
    }

    function _requireAuthorized(address patient, address caller) private view {
        if (patient == address(0)) revert ZeroAddress();
        if (caller != patient
            && !accessGrants[patient][caller]
            && !(emergencyAccessExpires[patient][caller] > block.timestamp)) {
            revert AccessDenied(patient, caller);
        }
    }
}
