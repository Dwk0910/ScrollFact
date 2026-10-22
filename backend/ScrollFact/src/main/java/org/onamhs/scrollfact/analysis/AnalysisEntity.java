package org.onamhs.scrollfact.analysis;

import jakarta.persistence.*;

@Entity
@Table(name = "analyses")
public class AnalysisEntity {
    @Id String id;
    @Column(nullable = false, unique = true) String snapshotId;
    @Column(nullable = false) String digest;
    @Column(nullable = false) String status;
    String phase;
    int completedSources;
    Integer totalSources;
    int failedSources;
    String error;
    long createdAt;
    Long finishedAt;
    @Column(columnDefinition = "TEXT") String resultJson;
    protected AnalysisEntity() {}
}
