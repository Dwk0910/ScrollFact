package org.onamhs.scrollfact.analysis;

public class ApiFailure extends RuntimeException {
    public final int status;
    public final String code;
    public ApiFailure(int status, String code, String detail) {
        super(detail);
        this.status = status;
        this.code = code;
    }
}
