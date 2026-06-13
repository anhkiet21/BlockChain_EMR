package com.blockchain.emr.accesscontrol.application;

import static com.blockchain.emr.accesscontrol.api.AccessControlModels.*;

import java.util.Locale;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.accesscontrol.*;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.AccessEvent;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.AccessTransaction;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.TransactionState;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class AccessControlService {
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final WalletAddressRepository wallets;
    private final AccessGrantRepository grants;
    private final AccessGrantHistoryRepository history;
    private final BlockchainService blockchain;

    public AccessControlService(PatientProfileRepository patients, DoctorProfileRepository doctors,
            WalletAddressRepository wallets, AccessGrantRepository grants, AccessGrantHistoryRepository history,
            BlockchainService blockchain) {
        this.patients = patients; this.doctors = doctors; this.wallets = wallets;
        this.grants = grants; this.history = history; this.blockchain = blockchain;
    }

    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    @Transactional(readOnly = true)
    public PreparedAccessTransactionResponse prepare(Long userId, AccessTransactionRequest request) {
        Context context = requireContext(userId, request.doctorProfileId(), request.patientWallet(), request.doctorWallet());
        var prepared = blockchain.prepareAccessTransaction(context.patientWallet(), context.doctorWallet(), request.granted());
        return new PreparedAccessTransactionResponse(prepared.from(), prepared.to(), prepared.data(), prepared.chainId(),
                prepared.value(), context.doctor().getId(), request.granted());
    }

    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    @Transactional
    public AccessGrantResponse verify(Long userId, VerifyAccessTransactionRequest request) {
        Context context = requireContext(userId, request.doctorProfileId(), request.patientWallet(), request.doctorWallet());
        var existing = history.findByTransactionHash(request.transactionHash());
        if (existing.isPresent()) {
            AccessGrantHistory item = existing.get();
            requireSameRequest(item, context, request.granted());
            return response(item, isActive(context));
        }

        var expected = blockchain.prepareAccessTransaction(context.patientWallet(), context.doctorWallet(), request.granted());
        AccessTransaction transaction = blockchain.getAccessTransaction(request.transactionHash());
        verifyTransaction(transaction, expected, context, request.granted());

        AccessEvent event = transaction.accessEvent();
        boolean newest = history.findFirstByPatientProfileIdAndDoctorProfileIdOrderByBlockNumberDescLogIndexDesc(
                context.patient().getId(), context.doctor().getId()).map(item -> isAfter(event, item)).orElse(true);
        if (newest) synchronizeCurrentGrant(context, request.granted());
        AccessGrantHistory saved = history.save(new AccessGrantHistory(
                context.patient(), context.doctor(), context.patientWallet(), context.doctorWallet(), request.granted(),
                transaction.transactionHash(), transaction.blockNumber(), event.logIndex(), event.occurredAt()));
        return response(saved, isActive(context));
    }

    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    @Transactional(readOnly = true)
    public PageResponse<AccessHistoryResponse> history(Long userId, int page, int size) {
        requirePatient(userId);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var result = history.findByPatientProfileUserId(userId,
                PageRequest.of(Math.max(page, 0), safeSize,
                        Sort.by(Sort.Order.desc("blockNumber"), Sort.Order.desc("logIndex"))))
                .map(this::historyResponse);
        return PageResponse.from(result);
    }

    private Context requireContext(Long userId, Long doctorId, String patientWallet, String doctorWallet) {
        PatientProfile patient = requirePatient(userId);
        DoctorProfile doctor = doctors.findById(doctorId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ed3 s\u01a1 b\u00e1c s\u0129 v\u1edbi ID \u0111\u00e3 cung c\u1ea5p"));
        if (!doctor.isVerified())
            throw new ApplicationException(ErrorCode.ACCESS_DENIED,
                    "B\u00e1c s\u0129 n\u00e0y ch\u01b0a \u0111\u01b0\u1ee3c Admin x\u00e1c minh. Vui l\u00f2ng y\u00eau c\u1ea7u Admin x\u00e1c minh tr\u01b0\u1edbc.");
        String normalizedPatientWallet = normalize(patientWallet);
        String normalizedDoctorWallet = normalize(doctorWallet);
        boolean patientWalletOwned = wallets.findByAddress(normalizedPatientWallet)
                .map(WalletAddress::getUser)
                .map(user -> user.getId().equals(patient.getUser().getId()))
                .orElse(false);
        if (!patientWalletOwned)
            throw new ApplicationException(ErrorCode.ACCESS_DENIED,
                    "V\u00ed b\u1ec7nh nh\u00e2n '" + patientWallet + "' ch\u01b0a \u0111\u01b0\u1ee3c li\u00ean k\u1ebft v\u00e0o t\u00e0i kho\u1ea3n. H\u00e3y v\u00e0o H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n \u2192 Li\u00ean k\u1ebft v\u00ed.");
        boolean doctorWalletOwned = wallets.findByAddress(normalizedDoctorWallet)
                .map(WalletAddress::getUser)
                .map(user -> user.getId().equals(doctor.getUser().getId()))
                .orElse(false);
        if (!doctorWalletOwned)
            throw new ApplicationException(ErrorCode.ACCESS_DENIED,
                    "V\u00ed b\u00e1c s\u0129 '" + doctorWallet + "' ch\u01b0a \u0111\u01b0\u1ee3c li\u00ean k\u1ebft v\u00e0o t\u00e0i kho\u1ea3n b\u00e1c s\u0129. B\u00e1c s\u0129 c\u1ea7n li\u00ean k\u1ebft v\u00ed tr\u01b0\u1edbc.");
        return new Context(patient, doctor, normalizedPatientWallet, normalizedDoctorWallet);
    }

    private PatientProfile requirePatient(Long userId) {
        return patients.findByUserId(userId).orElseThrow(() -> new ApplicationException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private void requireWalletOwner(Long userId, String address) {
        boolean owned = wallets.findByAddress(address).map(WalletAddress::getUser)
                .map(user -> user.getId().equals(userId)).orElse(false);
        if (!owned) throw new ApplicationException(ErrorCode.ACCESS_DENIED,
                "V\u00ed '" + address + "' kh\u00f4ng thu\u1ed9c t\u00e0i kho\u1ea3n n\u00e0y");
    }

    private void verifyTransaction(AccessTransaction transaction, BlockchainService.PreparedTransaction expected,
            Context context, boolean granted) {
        if (transaction.status() == TransactionState.Status.PENDING) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Transaction has not been mined");
        }
        if (transaction.status() != TransactionState.Status.SUCCESS) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Blockchain transaction failed");
        }
        AccessEvent event = transaction.accessEvent();
        boolean valid = equalsIgnoreCase(transaction.from(), expected.from())
                && equalsIgnoreCase(transaction.to(), expected.to())
                && equalsIgnoreCase(transaction.input(), expected.data())
                && event != null
                && equalsIgnoreCase(event.transactionHash(), transaction.transactionHash())
                && equalsIgnoreCase(event.patientWallet(), context.patientWallet())
                && equalsIgnoreCase(event.granteeWallet(), context.doctorWallet())
                && event.granted() == granted;
        if (!valid) throw new AccessDeniedException("Transaction does not authorize this access change");
    }

    private void requireSameRequest(AccessGrantHistory item, Context context, boolean granted) {
        boolean same = item.getPatientProfile().getId().equals(context.patient().getId())
                && item.getDoctorProfile().getId().equals(context.doctor().getId())
                && equalsIgnoreCase(item.getPatientWallet(), context.patientWallet())
                && equalsIgnoreCase(item.getDoctorWallet(), context.doctorWallet())
                && item.isGranted() == granted;
        if (!same) throw new AccessDeniedException("Transaction was already used for another access change");
    }

    private boolean isActive(Context context) {
        return grants.existsByPatientProfileIdAndDoctorProfileIdAndRevokedAtIsNull(
                context.patient().getId(), context.doctor().getId());
    }

    private void synchronizeCurrentGrant(Context context, boolean granted) {
        AccessGrant grant = grants.findByPatientProfileIdAndDoctorProfileId(
                context.patient().getId(), context.doctor().getId()).orElse(null);
        if (granted) {
            if (grant == null) grant = new AccessGrant(context.patient(), context.doctor());
            else grant.grant();
            grants.save(grant);
        } else if (grant != null) {
            grant.revoke();
            grants.save(grant);
        }
    }

    private boolean isAfter(AccessEvent event, AccessGrantHistory item) {
        int blockOrder = event.blockNumber().compareTo(item.getBlockNumber());
        return blockOrder > 0 || blockOrder == 0 && event.logIndex() > item.getLogIndex();
    }

    private AccessGrantResponse response(AccessGrantHistory item, boolean active) {
        DoctorProfile doctor = item.getDoctorProfile();
        return new AccessGrantResponse(doctor.getId(), doctor.getDoctorCode(), doctor.getUser().getFullName(), active,
                item.isGranted(), item.getTransactionHash(), item.getBlockNumber(), item.getOccurredAt());
    }

    private AccessHistoryResponse historyResponse(AccessGrantHistory item) {
        DoctorProfile doctor = item.getDoctorProfile();
        return new AccessHistoryResponse(item.getId(), doctor.getId(), doctor.getDoctorCode(),
                doctor.getUser().getFullName(), item.isGranted(), item.getTransactionHash(), item.getBlockNumber(),
                item.getOccurredAt(), item.getVerifiedAt());
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private record Context(PatientProfile patient, DoctorProfile doctor, String patientWallet, String doctorWallet) {}
}
