package com.blockchain.emr.doctor.api.dto;

import jakarta.validation.constraints.Size;

public record DoctorReviewRequest(@Size(max = 1000) String reason) {
}
