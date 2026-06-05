package com.blockchain.emr.integration.blockchain.generated;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicStruct;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/** Web3j wrapper generated from MedicalRecordRegistry.sol ABI. */
public class MedicalRecordRegistry extends Contract {

    public static final String BINARY = "";

    public static final Event ACCESSUPDATED_EVENT = new Event("AccessUpdated",
            Arrays.asList(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Bool>() {}));

    public static final Event RECORDCREATED_EVENT = new Event("RecordCreated",
            Arrays.asList(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Utf8String>() {}));

    protected MedicalRecordRegistry(
            String contractAddress,
            Web3j web3j,
            TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public RemoteFunctionCall<Boolean> accessGrants(String patient, String grantee) {
        Function function = new Function(
                "accessGrants",
                Arrays.asList(new Address(160, patient), new Address(160, grantee)),
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

    public static MedicalRecordRegistry load(
            String contractAddress,
            Web3j web3j,
            TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        return new MedicalRecordRegistry(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static class Record extends DynamicStruct {
        public final String cid;
        public final String patient;
        public final String author;
        public final BigInteger createdAt;

        public Record(Utf8String cid, Address patient, Address author, Uint256 createdAt) {
            super(cid, patient, author, createdAt);
            this.cid = cid.getValue();
            this.patient = patient.getValue();
            this.author = author.getValue();
            this.createdAt = createdAt.getValue();
        }

        public Record(String cid, String patient, String author, BigInteger createdAt) {
            super(new Utf8String(cid), new Address(160, patient), new Address(160, author), new Uint256(createdAt));
            this.cid = cid;
            this.patient = patient;
            this.author = author;
            this.createdAt = createdAt;
        }
    }
}
