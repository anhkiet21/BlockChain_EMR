package com.blockchain.emr.accesscontrol.api.dto;

import jakarta.validation.constraints.Size;

public record RejectAccessRequestRequest(
        @Size(max = 500) String rejectedReason
) {}
