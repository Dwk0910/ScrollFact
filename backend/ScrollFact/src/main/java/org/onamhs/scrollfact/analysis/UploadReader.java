package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.io.*;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;
import java.util.zip.GZIPInputStream;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class UploadReader {
    public static final int MAX_HTML = 20 * 1024 * 1024;
    public static final int MAX_UPLOAD = 5 * 1024 * 1024;
    public record Input(Metadata metadata, String html, String digest) {}

    public Input read(Metadata meta, String key, MultipartFile file) {
        if (meta == null || meta.snapshotId() == null || !meta.snapshotId().equals(key))
            throw new ApiFailure(400, "invalid_idempotency_key", "Idempotency-Key와 snapshotId가 일치해야 합니다.");
        try {
            if (!UUID.fromString(key).toString().equalsIgnoreCase(key)) throw new IllegalArgumentException();
            URI uri = URI.create(meta.url());
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ApiFailure(400, "invalid_metadata", "유효한 UUID와 http(s) 페이지 URL이 필요합니다.");
        }
        if (!"gzip".equals(meta.encoding()) || meta.title() == null || meta.title().length() > 2000 || meta.url().length() > 8192)
            throw new ApiFailure(400, "invalid_metadata", "페이지 메타데이터 형식이 올바르지 않습니다.");
        if (meta.htmlBytes() < 1 || meta.htmlBytes() > MAX_HTML || file.getSize() > MAX_UPLOAD)
            throw new ApiFailure(413, "document_too_large", "원문 20 MiB 또는 압축 파일 5 MiB 상한을 초과했습니다.");
        try (var gzip = new GZIPInputStream(file.getInputStream())) {
            byte[] bytes = gzip.readNBytes(MAX_HTML + 1);
            if (bytes.length > MAX_HTML) throw new ApiFailure(413, "document_too_large", "압축 해제한 HTML이 20 MiB를 초과했습니다.");
            if (bytes.length != meta.htmlBytes()) throw new ApiFailure(400, "size_mismatch", "htmlBytes가 실제 UTF-8 바이트 수와 다릅니다.");
            String html = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
            if (html.isBlank()) throw new ApiFailure(422, "empty_document", "분석할 HTML이 없습니다.");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(bytes);
            digest.update(("\0" + meta.url() + "\0" + meta.title()).getBytes(StandardCharsets.UTF_8));
            return new Input(meta, html, HexFormat.of().formatHex(digest.digest()));
        } catch (ApiFailure e) { throw e; }
        catch (IOException e) { throw new ApiFailure(400, "invalid_gzip", "올바른 gzip UTF-8 HTML 파일이 필요합니다."); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
