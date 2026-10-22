package org.onamhs.scrollfact.analysis;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
public class ApiErrors extends ResponseEntityExceptionHandler {
    @ExceptionHandler(ApiFailure.class)
    ResponseEntity<ProblemDetail> api(ApiFailure failure, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(failure.status), failure.getMessage());
        problem.setType(URI.create("urn:scrollfact:problem:" + failure.code));
        problem.setProperty("code", failure.code);
        problem.setInstance(URI.create(request.getRequestURI()));
        var builder = ResponseEntity.status(failure.status).contentType(MediaType.APPLICATION_PROBLEM_JSON).cacheControl(CacheControl.noStore());
        if (failure.status == 429) builder.header(HttpHeaders.RETRY_AFTER, "5");
        return builder.body(problem);
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception failure, HttpServletRequest request) {
        logger.error("Analysis request failed", failure);
        return api(new ApiFailure(500, "internal_error", "서버에서 요청을 처리하지 못했습니다."), request);
    }
    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex,
        HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE, "업로드 크기 상한을 초과했습니다.");
        problem.setProperty("code", "document_too_large");
        return ResponseEntity.status(413).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
    }
}
