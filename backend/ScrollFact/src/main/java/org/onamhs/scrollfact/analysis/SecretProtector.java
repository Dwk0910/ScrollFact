package org.onamhs.scrollfact.analysis;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.TimeUnit;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.stereotype.Component;

/** No plaintext fallback. Master key is held by the OS, never in the database. */
@Component
public class SecretProtector {
    private final String service;
    public SecretProtector() { this("org.scrollfact.local-profile-master.v1"); }
    SecretProtector(String service) { this.service = service; }
    public String protect(String context, String secret) { return transform(context, secret, true); }
    public String reveal(String context, String sealed) { return transform(context, sealed, false); }
    private String transform(String context, String value, boolean encrypt) {
        try {
            String os = System.getProperty("os.name").toLowerCase(Locale.ROOT);
            if (os.contains("win")) return windows(context, value, encrypt);
            if (!os.contains("mac")) throw new IllegalStateException();
            byte[] master = masterKey(encrypt);
            try {
                var cipher = Cipher.getInstance("AES/GCM/NoPadding");
                byte[] nonce = new byte[12]; byte[] input;
                if (encrypt) { new SecureRandom().nextBytes(nonce); input = value.getBytes(StandardCharsets.UTF_8); }
                else {
                    if (!value.startsWith("mac1:")) throw new IllegalStateException();
                    byte[] packed = Base64.getDecoder().decode(value.substring(5));
                    if (packed.length < 29) throw new IllegalStateException();
                    System.arraycopy(packed, 0, nonce, 0, 12); input = Arrays.copyOfRange(packed, 12, packed.length);
                }
                cipher.init(encrypt ? Cipher.ENCRYPT_MODE : Cipher.DECRYPT_MODE, new SecretKeySpec(master, "AES"), new GCMParameterSpec(128, nonce));
                cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
                byte[] output = cipher.doFinal(input);
                if (!encrypt) return new String(output, StandardCharsets.UTF_8);
                byte[] packed = new byte[12 + output.length]; System.arraycopy(nonce, 0, packed, 0, 12); System.arraycopy(output, 0, packed, 12, output.length);
                return "mac1:" + Base64.getEncoder().encodeToString(packed);
            } finally { Arrays.fill(master, (byte)0); }
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ApiFailure(503, "secure_storage_unavailable", "운영체제 보안 저장소를 열지 못했습니다. 로그인 키체인/Windows 계정을 확인해 주세요. 키를 평문으로 저장하지 않았습니다.");
        }
    }
    private synchronized byte[] masterKey(boolean create) throws Exception {
        var read = run(List.of("/usr/bin/security", "find-generic-password", "-s", service, "-a", "master", "-w"), "");
        if (read.code == 0) return Base64.getDecoder().decode(read.output.trim());
        // 44 means item not found; never replace a locked or inaccessible existing key.
        if (!create || read.code != 44) throw new IllegalStateException();
        byte[] key = new byte[32]; new SecureRandom().nextBytes(key);
        String encoded = Base64.getEncoder().encodeToString(key);
        // Interactive stdin keeps the secret out of process arguments and shell history.
        run(List.of("/usr/bin/security", "-i"), "add-generic-password -s " + service + " -a master -w " + encoded + "\nquit\n");
        var verify = run(List.of("/usr/bin/security", "find-generic-password", "-s", service, "-a", "master", "-w"), "");
        Arrays.fill(key, (byte)0);
        if (verify.code != 0) throw new IllegalStateException();
        return Base64.getDecoder().decode(verify.output.trim());
    }
    private String windows(String context, String value, boolean encrypt) throws Exception {
        if (!encrypt && !value.startsWith("win1:")) throw new IllegalStateException();
        String data = encrypt ? Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8)) : value.substring(5);
        data = Base64.getEncoder().encodeToString(Base64.getDecoder().decode(data));
        String entropy = Base64.getEncoder().encodeToString(context.getBytes(StandardCharsets.UTF_8));
        // Values are base64, sent through stdin, never as command arguments.
        String script = "$ErrorActionPreference='Stop'\nAdd-Type -AssemblyName System.Security\n" +
            "$bytes=[Convert]::FromBase64String('" + data + "')\n$entropy=[Convert]::FromBase64String('" + entropy + "')\n" +
            "$result=[Security.Cryptography.ProtectedData]::" + (encrypt ? "Protect" : "Unprotect") + "($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)\n" +
            "[Console]::Out.Write([Convert]::ToBase64String($result))\n";
        var result = run(List.of("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", "-"), script);
        if (result.code != 0) throw new IllegalStateException();
        String output = result.output.trim();
        return encrypt ? "win1:" + output : new String(Base64.getDecoder().decode(output), StandardCharsets.UTF_8);
    }
    private record ProcessResult(int code, String output) {}
    private ProcessResult run(List<String> command, String input) throws Exception {
        Process process = new ProcessBuilder(command).redirectError(ProcessBuilder.Redirect.DISCARD).start();
        try {
            try (var out = process.getOutputStream()) { out.write(input.getBytes(StandardCharsets.UTF_8)); }
            if (!process.waitFor(30, TimeUnit.SECONDS)) throw new IllegalStateException();
            return new ProcessResult(process.exitValue(), new String(process.getInputStream().readNBytes(8192), StandardCharsets.UTF_8));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }
}
