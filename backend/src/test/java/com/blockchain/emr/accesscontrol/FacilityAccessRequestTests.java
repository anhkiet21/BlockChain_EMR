package com.blockchain.emr.accesscontrol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.patient.domain.PatientProfile;

class FacilityAccessRequestTests {

    @Test
    void approvesPendingRequestOnce() {
        FacilityAccessRequest request = newRequest();

        request.approve("0xabc");

        assertThat(request.getStatus()).isEqualTo(FacilityAccessRequestStatus.APPROVED);
        assertThat(request.getBlockchainTxHash()).isEqualTo("0xabc");
        assertThat(request.getRespondedAt()).isNotNull();
        assertThatThrownBy(() -> request.reject())
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsPendingRequestOnce() {
        FacilityAccessRequest request = newRequest();

        request.reject();

        assertThat(request.getStatus()).isEqualTo(FacilityAccessRequestStatus.REJECTED);
        assertThat(request.getRespondedAt()).isNotNull();
        assertThatThrownBy(() -> request.approve("0xabc"))
                .isInstanceOf(IllegalStateException.class);
    }

    private FacilityAccessRequest newRequest() {
        return new FacilityAccessRequest(
                mock(PatientProfile.class),
                mock(HealthcareFacility.class),
                mock(DoctorProfile.class),
                "Need treatment history");
    }
}
