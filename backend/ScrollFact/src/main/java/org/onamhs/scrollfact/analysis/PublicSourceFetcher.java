package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.net.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import jakarta.annotation.PreDestroy;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

@Component
public class PublicSourceFetcher implements AutoCloseable {
    private record Cached(SourceDocument value, long until) {}
    private final Map<String, Cached> cache = Collections.synchronizedMap(new LinkedHashMap<>(128, .75f, true) {
        protected boolean removeEldestEntry(Map.Entry<String, Cached> e) { return size() > 100; }
    });
    private final ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor();
    private final CloseableHttpClient client;
    public PublicSourceFetcher() {
        DnsResolver resolver = new DnsResolver() {
            public InetAddress[] resolve(String host) throws UnknownHostException {
                InetAddress[] addresses = InetAddress.getAllByName(host);
                for (InetAddress address : addresses) if (!publicAddress(address)) throw new UnknownHostException("Blocked source address");
                return addresses;
            }
            public String resolveCanonicalHostname(String host) throws UnknownHostException { resolve(host); return host; }
        };
        var manager = PoolingHttpClientConnectionManagerBuilder.create().setDnsResolver(resolver)
            .setMaxConnTotal(4).setMaxConnPerRoute(2)
            .setDefaultConnectionConfig(ConnectionConfig.custom().setConnectTimeout(Timeout.ofSeconds(5))
                .setSocketTimeout(Timeout.ofSeconds(10)).build()).build();
        client = HttpClients.custom().setConnectionManager(manager).disableRedirectHandling()
            .disableAutomaticRetries().disableCookieManagement()
            .setDefaultRequestConfig(RequestConfig.custom().setConnectionRequestTimeout(Timeout.ofSeconds(5))
                .setResponseTimeout(Timeout.ofSeconds(10)).build()).build();
    }
    static boolean publicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
            || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        byte[] b = address.getAddress();
        if (b.length == 4) {
            int a = b[0] & 255, c = b[1] & 255;
            return a != 0 && a < 224 && !(a == 100 && c >= 64 && c <= 127)
                && !(a == 192 && c == 0) && !(a == 198 && (c == 18 || c == 19));
        }
        // Accept only global IPv6 unicast, excluding translation/tunnelling ranges.
        return (b[0] & 0xe0) == 0x20 && !((b[0] & 255) == 0x20 && (b[1] & 255) == 0x02)
            && !((b[0] & 255) == 0x20 && (b[1] & 255) == 0x01 && (b[2] & 255) == 0 && (b[3] & 255) == 0);
    }
    public SourceDocument fetch(String url) {
        Cached hit = cache.get(url);
        if (hit != null && hit.until() > System.currentTimeMillis()) return hit.value();
        try {
            URI uri = URI.create(url);
            if (!Set.of("https", "http").contains(uri.getScheme()) || uri.getHost() == null
                || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 80 && uri.getPort() != 443))
                return failed(url, "지원하지 않는 출처 주소");
            // Also validate literals: the HTTP client may skip its DNS resolver for IP hosts.
            for (InetAddress address : InetAddress.getAllByName(uri.getHost()))
                if (!publicAddress(address)) return failed(url, "공개 인터넷 주소가 아닌 출처");
            HttpGet request = new HttpGet(uri);
            request.setHeader("User-Agent", "ScrollFact/0.3 (source verification)");
            var deadline = deadlines.schedule(request::cancel, 15, TimeUnit.SECONDS);
            try {
                SourceDocument result = client.execute(request, response -> {
                    if (response.getCode() != 200 || response.getEntity() == null) return failed(url, "출처 응답을 읽을 수 없음 (리다이렉트 포함)");
                    String type = response.getEntity().getContentType();
                    if (type == null || !(type.toLowerCase().startsWith("text/html") || type.toLowerCase().startsWith("text/plain")))
                        return failed(url, "HTML/텍스트가 아닌 출처");
                    byte[] bytes = response.getEntity().getContent().readNBytes(2 * 1024 * 1024 + 1);
                    if (bytes.length > 2 * 1024 * 1024) return failed(url, "출처 문서 크기 초과");
                    var doc = Jsoup.parse(new java.io.ByteArrayInputStream(bytes), null, url);
                    doc.select("script, style, nav, header, footer, aside, noscript").remove();
                    String text = doc.body().text();
                    if (text.isBlank() || text.length() > 50_000) return failed(url, "출처 본문이 없거나 5만 자 상한 초과");
                    return new SourceDocument(url, doc.title().isBlank() ? uri.getHost() : doc.title(), uri.getHost(), text, null);
                });
                if (result.available()) cache.put(url, new Cached(result, System.currentTimeMillis() + Duration.ofMinutes(10).toMillis()));
                return result;
            } finally { deadline.cancel(false); }
        } catch (Exception e) { return failed(url, "출처 연결 실패 또는 시간 초과"); }
    }
    private SourceDocument failed(String url, String reason) { return new SourceDocument(url, "", "", "", reason); }
    @PreDestroy public void close() throws Exception { deadlines.shutdownNow(); client.close(); }
}
