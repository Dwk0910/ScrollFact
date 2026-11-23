package org.onamhs.scrollfact.analysis;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/reader")
public class ReaderSettingsController {
    private final OpenAiReader reader;
    public ReaderSettingsController(OpenAiReader reader) { this.reader = reader; }
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(reader.status());
    }
}
