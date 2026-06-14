package com.blockchain.emr.integration.blockchain.generated;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicStruct;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.StaticStruct;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/** Web3j wrapper generated from MedicalRecordRegistry.sol ABI. */
public class MedicalRecordRegistry extends Contract {

    public static final String BINARY = "";

    public static final Event FACILITYACCESSGRANTED_EVENT = new Event("FacilityAccessGranted",
            Arrays.asList(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Bytes32>(true) {}));

    public static final Event FACILITYACCESSREVOKED_EVENT = new Event("FacilityAccessRevoked",
            Arrays.asList(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Bytes32>(true) {}));

    public static final Event DOCTORFACILITYCHANGED_EVENT = new Event("DoctorFacilityChanged",
            Arrays.asList(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Bytes32>(true) {}));

    public static final Event RECORDCREATED_EVENT = new Event("RecordCreated",
            Arrays.asList(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Utf8String>() {},
                    new TypeReference<Bytes32>() {},
                    new TypeReference<Uint256>() {}));

    protected MedicalRecordRegistry(
            String contractAddress,
            Web3j web3j,
            TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public RemoteFunctionCall<Boolean> facilityAccessGrants(String patient, byte[] facilityId) {
        Function function = new Function(
                "facilityAccessGrants",
                Arrays.asList(new Address(160, patient), new Bytes32(facilityId)),
                Collections.singletonList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    public RemoteFunctionCall<byte[]> doctorFacilities(String doctor) {
        Function function = new Function(
                "doctorFacilities",
                Collections.singletonList(new Address(160, doctor)),
                Collections.singletonList(new TypeReference<Bytes32>() {}));
        return executeRemoteCallSingleValueReturn(function, byte[].class);
    }

    public RemoteFunctionCall<Boolean> activeFacilities(byte[] facilityId) {
        Function function = new Function(
                "activeFacilities",
                Collections.singletonList(new Bytes32(facilityId)),
                Collections.singletonList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    public RemoteFunctionCall<Record> getRecord(BigInteger recordId) {
        Function function = new Function(
                "getRecord",
                Collections.singletonList(new Uint256(recordId)),
                Collections.singletonList(new TypeReference<Record>() {}));
        return executeRemoteCallSingleValueReturn(function, Record.class);
    }

    public RemoteFunctionCall<Boolean> isLatestVersion(BigInteger recordId) {
        Function function = new Function(
                "isLatestVersion",
                Collections.singletonList(new Uint256(recordId)),
                Collections.singletonList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    public RemoteFunctionCall<RecordMetadata> getRecordMetadata(BigInteger recordId) {
        Function function = new Function(
                "getRecordMetadata",
                Collections.singletonList(new Uint256(recordId)),
                Collections.singletonList(new TypeReference<RecordMetadata>() {}));
        return executeRemoteCallSingleValueReturn(function, RecordMetadata.class);
    }

    public static MedicalRecordRegistry load(
            String contractAddress,
            Web3j web3j,
            TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        return new MedicalRecordRegistry(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static class Record extends DynamicStruct {
        public final String cid;
        public final byte[] contentHash;
        public final String patient;
        public final String author;
        public final BigInteger createdAt;
        public final BigInteger previousRecordId;

        public Record(Utf8String cid, Bytes32 contentHash, Address patient, Address author,
                Uint64 createdAt, Uint256 previousRecordId) {
            super(cid, contentHash, patient, author, createdAt, previousRecordId);
            this.cid = cid.getValue();
            this.contentHash = contentHash.getValue();
            this.patient = patient.getValue();
            this.author = author.getValue();
            this.createdAt = createdAt.getValue();
            this.previousRecordId = previousRecordId.getValue();
        }

        public Record(String cid, byte[] contentHash, String patient, String author,
                BigInteger createdAt, BigInteger previousRecordId) {
            super(new Utf8String(cid), new Bytes32(contentHash), new Address(160, patient),
                    new Address(160, author), new Uint64(createdAt), new Uint256(previousRecordId));
            this.cid = cid;
            this.contentHash = contentHash;
            this.patient = patient;
            this.author = author;
            this.createdAt = createdAt;
            this.previousRecordId = previousRecordId;
        }
    }

    public static class RecordMetadata extends StaticStruct {
        public final BigInteger sourceType;
        public final String uploaderWallet;
        public final byte[] facilityId;

        public RecordMetadata(Uint8 sourceType, Address uploaderWallet, Bytes32 facilityId) {
            super(sourceType, uploaderWallet, facilityId);
            this.sourceType = sourceType.getValue();
            this.uploaderWallet = uploaderWallet.getValue();
            this.facilityId = facilityId.getValue();
        }

        public RecordMetadata(BigInteger sourceType, String uploaderWallet, byte[] facilityId) {
            super(new Uint8(sourceType), new Address(160, uploaderWallet), new Bytes32(facilityId));
            this.sourceType = sourceType;
            this.uploaderWallet = uploaderWallet;
            this.facilityId = facilityId;
        }
    }
}
