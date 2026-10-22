package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.net.URI;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/analyses")
public class AnalysisController {
    private final UploadReader uploads;
    private final AnalysisService analyses;
    public AnalysisController(UploadReader uploads, AnalysisService analyses) { this.uploads = uploads; this.analyses = analyses; }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<JobView> create(@RequestPart("metadata") Metadata metadata,
                                         @RequestPart("document") MultipartFile document,
                                         @RequestHeader("Idempotency-Key") String key) {
        JobView job = analyses.create(uploads.read(metadata, key, document));
        return ResponseEntity.accepted().location(URI.create("/v1/analyses/" + job.analysisId()))
            .header(HttpHeaders.RETRY_AFTER, "2").cacheControl(CacheControl.noStore()).body(job);
    }
    @GetMapping("/{id}")
    public ResponseEntity<JobView> get(@PathVariable String id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(analyses.get(id));
    }
    @GetMapping("/{id}/result")
    public ResponseEntity<Result> result(@PathVariable String id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(analyses.result(id));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        analyses.delete(id);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
