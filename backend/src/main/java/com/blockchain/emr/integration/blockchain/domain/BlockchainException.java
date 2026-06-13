package com.blockchain.emr.integration.blockchain.domain;

import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;

public class BlockchainException extends ApplicationException {

    public BlockchainException(ErrorCode code, String message) {
        super(code, message);
    }

    public static BlockchainException unavailable() {
        return new BlockchainException(ErrorCode.BLOCKCHAIN_UNAVAILABLE, "Blockchain RPC is unavailable");
    }

    public static BlockchainException readFailed() {
        return new BlockchainException(ErrorCode.BLOCKCHAIN_READ_FAILED, "Blockchain read or contract verification failed");
    }
}
