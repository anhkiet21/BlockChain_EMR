package com.blockchain.emr.medicalrecord.application;

import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.integration.storage.domain.StorageService;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalFileRepository;

@Service
@ConditionalOnProperty(name = "app.storage.orphan-cleanup-enabled", havingValue = "true")
public class OrphanMedicalFileCleanupService {
    private static final Logger log = LoggerFactory.getLogger(OrphanMedicalFileCleanupService.class);

    private final MedicalFileRepository files;
    private final StorageService storage;
    private final Duration retention;
    private final int batchSize;

    public OrphanMedicalFileCleanupService(
            MedicalFileRepository files,
            StorageService storage,
            @Value("${app.storage.orphan-retention:24h}") Duration retention,
            @Value("${app.storage.orphan-cleanup-batch-size:100}") int batchSize) {
        this.files = files;
        this.storage = storage;
        this.retention = retention;
        this.batchSize = Math.max(1, Math.min(batchSize, 1000));
    }

    @Scheduled(fixedDelayString = "${app.storage.orphan-cleanup-interval:1h}")
    @Transactional
    public void cleanup() {
        var orphans = files.findOrphansCreatedBefore(Instant.now().minus(retention), PageRequest.of(0, batchSize));
        for (var file : orphans) {
            try {
                storage.delete(file.getCid());
                files.delete(file);
                log.info("Deleted orphan encrypted medical file metadata id={} provider={}",
                        file.getId(), file.getStorageProvider());
            } catch (RuntimeException exception) {
                log.error("Could not delete orphan encrypted medical file metadata id={} provider={}",
                        file.getId(), file.getStorageProvider(), exception);
            }
        }
    }
}
