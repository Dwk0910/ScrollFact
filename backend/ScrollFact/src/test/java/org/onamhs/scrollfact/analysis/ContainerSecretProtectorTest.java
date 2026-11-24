package org.onamhs.scrollfact.analysis;

import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class ContainerSecretProtectorTest {
    @TempDir Path directory;
    private Path keyFile() {
        assumeTrue(FileSystems.getDefault().supportedFileAttributeViews().contains("posix"));
        return directory.resolve("master.key");
    }
    @Test void survivesRestartAndAuthenticatesProfileAndCiphertext() throws Exception {
        Path path = keyFile();
        var first = new SecretProtector("test", path);
        String sealed = first.protect("alice:gemini", "test-key-not-real");
        assertThat(sealed).startsWith("file1:").doesNotContain("test-key-not-real");
        assertThat(Files.size(path)).isEqualTo(32);
        assertThat(Files.getPosixFilePermissions(path)).isEqualTo(PosixFilePermissions.fromString("rw-------"));
        var restarted = new SecretProtector("test", path);
        assertThat(restarted.reveal("alice:gemini", sealed)).isEqualTo("test-key-not-real");
        assertThatThrownBy(() -> restarted.reveal("bob:gemini", sealed)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> restarted.reveal("alice:openai", sealed)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> restarted.reveal("alice:gemini", "file1:invalid")).isInstanceOf(ApiFailure.class);
    }
    @Test void lostKeyIsNotRecreatedWhenDecrypting() throws Exception {
        Path path = keyFile();
        var protector = new SecretProtector("test", path);
        String sealed = protector.protect("alice:gemini", "test-key");
        Files.delete(path);
        assertThatThrownBy(() -> protector.reveal("alice:gemini", sealed)).isInstanceOf(ApiFailure.class);
        assertThat(path).doesNotExist();
    }
    @Test void rejectsPublicPermissionsCorruptKeyAndSymlinkWithoutReplacingKey() throws Exception {
        Path path = keyFile();
        var protector = new SecretProtector("test", path);
        protector.protect("alice:gemini", "test-key");
        byte[] before = Files.readAllBytes(path);
        Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rw-r--r--"));
        assertThatThrownBy(() -> protector.protect("alice:gemini", "new-key")).isInstanceOf(ApiFailure.class);
        assertThat(Files.readAllBytes(path)).isEqualTo(before);
        Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rw-------"));
        Files.write(path, new byte[]{1});
        assertThatThrownBy(() -> protector.protect("alice:gemini", "new-key")).isInstanceOf(ApiFailure.class);
        Path link = directory.resolve("link.key"); Files.createSymbolicLink(link, path);
        assertThatThrownBy(() -> new SecretProtector("test", link).protect("alice:gemini", "new-key")).isInstanceOf(ApiFailure.class);
    }
}
