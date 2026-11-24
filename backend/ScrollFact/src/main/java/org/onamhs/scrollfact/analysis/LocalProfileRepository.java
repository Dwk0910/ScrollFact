package org.onamhs.scrollfact.analysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LocalProfileRepository extends JpaRepository<LocalProfile, String> {
    List<LocalProfile> findByActiveTrue();
}
