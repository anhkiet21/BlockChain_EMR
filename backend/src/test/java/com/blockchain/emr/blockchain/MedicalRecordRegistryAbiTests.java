package com.blockchain.emr.blockchain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.web3j.abi.TypeEncoder;
import org.web3j.abi.datatypes.StaticStruct;

import com.blockchain.emr.integration.blockchain.generated.MedicalRecordRegistry;

class MedicalRecordRegistryAbiTests {

    @Test
    void decodesStaticRecordMetadataTuple() {
        byte[] facilityId = new byte[32];
        byte[] encodedFacility = "BV001".getBytes(StandardCharsets.UTF_8);
        System.arraycopy(encodedFacility, 0, facilityId, 0, encodedFacility.length);
        String uploader = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
        var metadata = new MedicalRecordRegistry.RecordMetadata(BigInteger.ONE, uploader, facilityId);

        String encoded = TypeEncoder.encode(metadata);

        assertThat(metadata).isInstanceOf(StaticStruct.class);
        assertThat(encoded).hasSize(3 * 64);
        assertThat(metadata.sourceType).isEqualTo(BigInteger.ONE);
        assertThat(metadata.uploaderWallet).isEqualToIgnoringCase(uploader);
        assertThat(metadata.facilityId).isEqualTo(facilityId);
    }
}
