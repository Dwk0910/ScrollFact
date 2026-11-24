package org.onamhs.scrollfact.analysis;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileServiceTest {
    @Test void restoresSavedProfileAndSeparatesKeysAndPreferences() {
        var records = new HashMap<String,LocalProfile>();
        var repo = mock(LocalProfileRepository.class);
        when(repo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(records.get(i.getArgument(0))));
        when(repo.findByActiveTrue()).thenAnswer(i -> new ArrayList<>(records.values().stream().filter(p->p.active).toList()));
        when(repo.saveAllAndFlush(any())).thenAnswer(i -> { List<LocalProfile> all=i.getArgument(0); all.forEach(p->records.put(p.id,p)); return all; });
        when(repo.saveAndFlush(any())).thenAnswer(i -> { LocalProfile p=i.getArgument(0); records.put(p.id,p); return p; });
        var secrets = mock(SecretProtector.class);
        when(secrets.protect("alice:gemini", "private-key")).thenReturn("ciphertext");
        when(secrets.reveal("alice:gemini", "ciphertext")).thenReturn("private-key");
        var reader = mock(ActiveReader.class);
        var service = new ProfileService(repo,secrets,reader);
        service.login("alice"); service.save("alice","gemini","private-key","gemini-test"); service.preferences("alice",false,"diagnostic");
        assertThat(records.get("alice").sealedKey).isEqualTo("ciphertext");
        assertThat(service.status().toString()).doesNotContain("private-key", "ciphertext");
        var restarted = new ProfileService(repo,secrets,reader); restarted.restore();
        assertThat(restarted.status()).containsEntry("id","alice").containsEntry("hasKey",true).containsEntry("follow",false).containsEntry("mode","diagnostic");
        verify(reader,atLeastOnce()).configure("gemini","private-key","gemini-test");
        assertThat(restarted.key("alice","gemini","")).isEqualTo("private-key");
        restarted.login("bob");
        assertThat(restarted.status()).containsEntry("hasKey",false).containsEntry("follow",true);
        assertThatThrownBy(()->restarted.key("alice","gemini","")).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(()->restarted.key("bob","gemini","")).isInstanceOf(ApiFailure.class);
        restarted.login("alice"); restarted.forget("alice"); assertThat(restarted.status()).containsEntry("hasKey",false);
        restarted.logout(); assertThat(restarted.status()).containsEntry("id","");
    }
    @Test void invalidIdAndFailedVaultNeverSavePlaintext() {
        var repo=mock(LocalProfileRepository.class); var secrets=mock(SecretProtector.class); var reader=mock(ActiveReader.class);
        var service=new ProfileService(repo,secrets,reader);
        assertThatThrownBy(()->service.login("../../invalid")).isInstanceOf(ApiFailure.class);
        verifyNoInteractions(repo);
        var p=new LocalProfile("alice"); when(repo.findById("alice")).thenReturn(Optional.of(p)); when(repo.findByActiveTrue()).thenReturn(new ArrayList<>());
        service.login("alice");
        when(secrets.protect(anyString(),anyString())).thenThrow(new ApiFailure(503,"locked","locked"));
        assertThatThrownBy(()->service.save("alice","gemini","private-key","gemini-test")).isInstanceOf(ApiFailure.class);
        verify(repo,never()).saveAndFlush(any()); assertThat(p.sealedKey).isNull();
    }
}
