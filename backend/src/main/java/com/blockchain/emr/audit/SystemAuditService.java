package com.blockchain.emr.audit;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.common.api.PageResponse;

@Service
public class SystemAuditService {
    private final SystemAuditEventRepository repository;

    public SystemAuditService(SystemAuditEventRepository repository) {
        this.repository = repository;
    }

    public void record(
            String action,
            Long actorUserId,
            String actorName,
            String actorRole,
            String targetType,
            String targetId,
            String targetName,
            String reason,
            String previousState,
            String newState,
            String transactionHash) {
        repository.save(new SystemAuditEvent(
                action, actorUserId, actorName, actorRole, targetType, targetId, targetName,
                blankToNull(reason), previousState, newState, transactionHash));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<SystemAuditEventResponse> list(int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        return PageResponse.from(repository.findAllByOrderByOccurredAtDescIdDesc(
                        PageRequest.of(Math.max(page, 0), safeSize))
                .map(this::response));
    }

    private SystemAuditEventResponse response(SystemAuditEvent event) {
        return new SystemAuditEventResponse(
                event.getId(), event.getAction(), event.getActorUserId(), event.getActorName(),
                event.getActorRole(), event.getTargetType(), event.getTargetId(), event.getTargetName(),
                event.getReason(), event.getPreviousState(), event.getNewState(),
                event.getTransactionHash(), event.getOccurredAt());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
