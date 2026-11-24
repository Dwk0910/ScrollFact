package org.onamhs.scrollfact.analysis;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assumptions.*;
import static org.assertj.core.api.Assertions.*;

class SecretProtectorTest {
    @Test void macKeychainSurvivesNewInstanceAndRejectsWrongProfile() throws Exception {
        assumeTrue("1".equals(System.getenv("SCROLLFACT_TEST_KEYCHAIN")) && System.getProperty("os.name").contains("Mac"));
        String service="org.scrollfact.test."+java.util.UUID.randomUUID();
        try {
            var first=new SecretProtector(service);
            String sealed=first.protect("alice:gemini","test-only-not-real-api-key");
            assertThat(sealed).startsWith("mac1:").doesNotContain("test-only");
            var restarted=new SecretProtector(service);
            assertThat(restarted.reveal("alice:gemini",sealed)).isEqualTo("test-only-not-real-api-key");
            assertThatThrownBy(()->restarted.reveal("bob:gemini",sealed)).isInstanceOf(ApiFailure.class);
        } finally {
            new ProcessBuilder("/usr/bin/security","delete-generic-password","-s",service,"-a","master").redirectOutput(ProcessBuilder.Redirect.DISCARD).redirectError(ProcessBuilder.Redirect.DISCARD).start().waitFor();
        }
    }
}
