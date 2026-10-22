package org.onamhs.scrollfact.analysis;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisRepository extends JpaRepository<AnalysisEntity, String> {
    Optional<AnalysisEntity> findBySnapshotId(String snapshotId);
}
