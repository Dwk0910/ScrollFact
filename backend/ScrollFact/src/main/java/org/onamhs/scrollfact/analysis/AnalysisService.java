package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class AnalysisService {
    private final AnalysisRepository repository;
    private final AnalysisEvaluator evaluator;
    private final HtmlParser parser;
    private final PublicSourceFetcher fetcher;
    private final ResultAssembler assembler;
    private final ObjectMapper mapper;
    private final ThreadPoolExecutor workers = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(8));
    private final ExecutorService sources = Executors.newFixedThreadPool(4);
    private final ConcurrentMap<String, Future<?>> running = new ConcurrentHashMap<>();
    public AnalysisService(AnalysisRepository repository, AnalysisEvaluator evaluator, HtmlParser parser,
                           PublicSourceFetcher fetcher, ResultAssembler assembler, ObjectMapper mapper) {
        this.repository = repository; this.evaluator = evaluator; this.parser = parser;
        this.fetcher = fetcher; this.assembler = assembler; this.mapper = mapper;
    }
    public synchronized JobView create(UploadReader.Input input) {
        var meta = input.metadata();
        var existing = repository.findBySnapshotId(meta.snapshotId());
        if (existing.isPresent()) {
            if (!existing.get().digest.equals(input.digest())) throw new ApiFailure(409, "idempotency_conflict", "같은 snapshotId에 다른 페이지 내용이 전달되었습니다.");
            return view(existing.get());
        }
        if (!"diagnostic".equals(meta.mode()) && !evaluator.configured()) throw new ApiFailure(503, "evaluator_unconfigured", "AI 분석기가 아직 연결되지 않았습니다. 서버의 분석 제공자를 설정해 주세요.");
        if (repository.count() >= 1000) throw new ApiFailure(429, "capacity_exceeded", "보관 중인 분석이 많습니다. 잠시 후 다시 시도해 주세요.");
        var entity = new AnalysisEntity();
        entity.id = UUID.randomUUID().toString(); entity.snapshotId = meta.snapshotId(); entity.digest = input.digest();
        entity.status = "queued"; entity.phase = "queued"; entity.createdAt = System.currentTimeMillis();
        repository.saveAndFlush(entity);
        // Register before execution so a very fast worker cannot leave a completed Future in the map.
        var task = new FutureTask<Void>(() -> { process(entity.id, input); return null; });
        running.put(entity.id, task);
        try { workers.execute(task); }
        catch (RejectedExecutionException e) {
            running.remove(entity.id); repository.deleteById(entity.id);
            throw new ApiFailure(429, "queue_full", "분석 대기열이 가득 찼습니다. 잠시 후 다시 시도해 주세요.");
        }
        return view(entity);
    }
    public synchronized JobView get(String id) { return view(find(id)); }
    public synchronized com.fasterxml.jackson.databind.JsonNode result(String id) {
        var entity = find(id);
        if (!"completed".equals(entity.status)) throw new ApiFailure(409, "result_not_ready", "완료된 분석 결과가 아직 없습니다.");
        try { return mapper.readTree(entity.resultJson); }
        catch (Exception e) { throw new ApiFailure(500, "invalid_stored_result", "저장된 결과를 읽지 못했습니다."); }
    }
    public synchronized void delete(String id) {
        Future<?> task = running.remove(id);
        if (task != null) task.cancel(true);
        workers.purge();
        repository.findById(id).ifPresent(repository::delete);
    }
    private AnalysisEntity find(String id) { return repository.findById(id).orElseThrow(() -> new ApiFailure(404, "analysis_not_found", "분석이 없거나 만료되었습니다.")); }
    private JobView view(AnalysisEntity entity) {
        SourceProgress progress = entity.totalSources == null ? null : new SourceProgress(entity.completedSources, entity.totalSources, entity.failedSources);
        return new JobView(entity.id, entity.snapshotId, entity.status, entity.phase, progress, entity.error);
    }
    private synchronized void progress(String id, String phase, Integer total, int completed, int failed) {
        var entity = find(id);
        if (Thread.currentThread().isInterrupted() || terminal(entity)) throw new CancellationException();
        entity.status = "running"; entity.phase = phase;
        entity.totalSources = total; entity.completedSources = completed; entity.failedSources = failed;
        repository.saveAndFlush(entity);
    }
    private synchronized void complete(String id, Object result) throws Exception {
        var entity = find(id);
        if (Thread.currentThread().isInterrupted() || terminal(entity)) throw new CancellationException();
        entity.resultJson = mapper.writeValueAsString(result); entity.status = "completed"; entity.phase = null;
        entity.finishedAt = System.currentTimeMillis(); repository.saveAndFlush(entity);
    }
    private synchronized void fail(String id, String detail) {
        repository.findById(id).ifPresent(entity -> {
            if (terminal(entity)) return;
            entity.status = "failed"; entity.phase = null; entity.error = detail;
            entity.finishedAt = System.currentTimeMillis(); repository.saveAndFlush(entity);
        });
    }
    private static boolean terminal(AnalysisEntity e) { return "completed".equals(e.status) || "failed".equals(e.status); }
    private void process(String id, UploadReader.Input input) {
        var pending = new ArrayList<Future<SourceDocument>>();
        try {
            progress(id, "extracting", null, 0, 0);
            ParsedPage page = parser.parse(input.html(), input.metadata().url());
            progress(id, "checking_sources", page.sourceUrls().size(), 0, 0);
            var completion = new ExecutorCompletionService<SourceDocument>(sources);
            for (String url : page.sourceUrls()) pending.add(completion.submit(() -> fetcher.fetch(url)));
            var documents = new ArrayList<SourceDocument>();
            int failed = 0;
            for (int i = 0; i < pending.size(); i++) {
                var document = completion.take().get(); documents.add(document);
                if (!document.available()) failed++;
                progress(id, "checking_sources", pending.size(), i + 1, failed);
            }
            documents.sort(Comparator.comparing(SourceDocument::url));
            var meta = input.metadata();
            if ("diagnostic".equals(meta.mode())) {
                complete(id, new DiagnosticResult("1.0", "diagnostic", id, meta.snapshotId(),
                    new DocumentInfo(meta.url(), meta.title()), meta.htmlBytes(), page.passages(),
                    documents.stream().map(d -> new DiagnosticSource(d.url(), d.title(),
                        d.text() == null ? 0 : d.text().length(), d.failure())).toList()));
                return;
            }
            progress(id, "summarizing", pending.size(), pending.size(), failed);
            Evaluation evaluation = evaluator.evaluate(new EvaluationInput(new DocumentInfo(meta.url(), meta.title()), page.passages(), List.copyOf(documents)));
            complete(id, assembler.assemble(id, meta, page, documents, evaluation));
        } catch (InterruptedException | CancellationException e) { Thread.currentThread().interrupt(); }
        catch (ApiFailure e) { fail(id, e.getMessage()); }
        catch (Exception e) { fail(id, "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."); }
        finally { pending.forEach(f -> f.cancel(true)); running.remove(id); }
    }
    @EventListener(ApplicationReadyEvent.class)
    public synchronized void recoverInterrupted() {
        for (var entity : repository.findAll()) if (!terminal(entity)) fail(entity.id, "서버가 재시작되어 분석이 중단되었습니다. 다시 분석해 주세요.");
    }
    @Scheduled(fixedDelay = 30_000)
    public synchronized void expire() {
        long now = System.currentTimeMillis();
        for (var entity : repository.findAll()) {
            if (!terminal(entity) && now - entity.createdAt > Duration.ofMinutes(10).toMillis()) {
                fail(entity.id, "분석 제한 시간 10분을 초과했습니다.");
                Future<?> task = running.remove(entity.id); if (task != null) task.cancel(true);
            } else if (entity.finishedAt != null && now - entity.finishedAt > Duration.ofMinutes(30).toMillis()) delete(entity.id);
        }
        workers.purge();
    }
    @PreDestroy public void shutdown() { workers.shutdownNow(); sources.shutdownNow(); }
}
