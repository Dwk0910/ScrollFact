package org.onamhs.scrollfact.analysis;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.nio.file.Files;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class ProfilePersistenceTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) throws Exception {
        var file=Files.createTempDirectory("scrollfact-profile-test-").resolve("profiles.db");
        r.add("spring.datasource.url",()->"jdbc:sqlite:"+file);
    }
    @Autowired LocalProfileRepository repository;
    @Autowired ProfileService profiles;
    @Autowired ActiveReader reader;
    @MockitoBean SecretProtector secrets;
    @Test void reloadsPersistedEncryptedCredentialAndAccountPreferences() {
        when(secrets.protect("restart:gemini","test-secret")).thenReturn("opaque-ciphertext");
        when(secrets.reveal("restart:gemini","opaque-ciphertext")).thenReturn("test-secret");
        profiles.login("restart"); profiles.save("restart","gemini","test-secret","gemini-test"); profiles.preferences("restart",false,"diagnostic");
        var persisted=repository.findById("restart").orElseThrow();
        assertThat(persisted.sealedKey).isEqualTo("opaque-ciphertext");
        var restored=new ProfileService(repository,secrets,reader);restored.restore();
        assertThat(restored.status()).containsEntry("id","restart").containsEntry("hasKey",true).containsEntry("follow",false).containsEntry("mode","diagnostic");
        assertThat(reader.status()).containsEntry("model","gemini-test").containsEntry("configured",true);
        restored.logout();var loggedOut=new ProfileService(repository,secrets,reader);loggedOut.restore();assertThat(loggedOut.status()).containsEntry("id","");
    }
}
