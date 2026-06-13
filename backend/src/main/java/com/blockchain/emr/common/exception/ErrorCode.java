package com.blockchain.emr.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    IDENTITY_NUMBER_ALREADY_EXISTS(HttpStatus.CONFLICT, "Identity number is already registered"),
    LICENSE_ALREADY_EXISTS(HttpStatus.CONFLICT, "Doctor license number is already registered"),
    INVALID_FACILITY(HttpStatus.BAD_REQUEST, "Healthcare facility is missing or inactive"),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ"),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "Yêu cầu không hợp lệ"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Cần đăng nhập để truy cập tài nguyên"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập tài nguyên"),
    CONFLICT(HttpStatus.CONFLICT, "Dữ liệu xung đột với tài nguyên hiện có"),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "Email đã được sử dụng"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn"),
    ROLE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Vai trò đăng ký không hợp lệ"),
    WALLET_ALREADY_LINKED(HttpStatus.CONFLICT, "Ví đã được liên kết với tài khoản khác"),
    WALLET_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "Không thể xác minh chữ ký ví"),
    BLOCKCHAIN_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Không thể kết nối blockchain RPC"),
    BLOCKCHAIN_READ_FAILED(HttpStatus.BAD_GATEWAY, "Không thể xác minh dữ liệu blockchain"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
