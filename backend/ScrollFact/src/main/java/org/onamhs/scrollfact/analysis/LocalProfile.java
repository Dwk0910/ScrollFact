package org.onamhs.scrollfact.analysis;

import jakarta.persistence.*;

@Entity
@Table(name="local_profiles")
public class LocalProfile {
    @Id String id;
    boolean active;
    boolean follow = true;
    String mode = "reader";
    String provider;
    String model;
    @Column(columnDefinition="TEXT") String sealedKey;
    protected LocalProfile() {}
    LocalProfile(String id) { this.id = id; }
}
