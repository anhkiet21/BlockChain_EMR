package com.blockchain.emr.integration.storage.adapter;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import com.blockchain.emr.integration.storage.domain.StorageException;
import com.blockchain.emr.integration.storage.domain.StorageService;
import com.blockchain.emr.integration.storage.domain.StoredObject;

@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "kubo", matchIfMissing = true)
public class KuboStorageAdapter implements StorageService {

    private final RestClient restClient;

    public KuboStorageAdapter(
            RestClient.Builder builder,
            @Value("${app.ipfs.api-url}") String apiUrl) {
        this.restClient = builder.baseUrl(apiUrl).build();
    }

    @Override
    public StoredObject store(byte[] content, String filename) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new NamedByteArrayResource(content, filename));
            Map<?, ?> response = restClient.post()
                    .uri("/api/v0/add?pin=true&cid-version=1")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            Object cid = response == null ? null : response.get("Hash");
            if (cid == null || cid.toString().isBlank()) {
                throw new StorageException("Kubo did not return a CID");
            }
            return new StoredObject(cid.toString());
        } catch (StorageException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new StorageException("Could not upload encrypted file to Kubo", exception);
        }
    }

    @Override
    public byte[] retrieve(String cid) {
        try {
            byte[] content = restClient.post()
                    .uri(uriBuilder -> uriBuilder.path("/api/v0/cat").queryParam("arg", cid).build())
                    .retrieve()
                    .body(byte[].class);
            if (content == null) {
                throw new StorageException("Kubo returned empty content");
            }
            return content;
        } catch (StorageException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new StorageException("Could not retrieve encrypted file from Kubo", exception);
        }
    }

    @Override
    public String provider() {
        return "KUBO";
    }

    private static final class NamedByteArrayResource extends ByteArrayResource {

        private final String filename;

        private NamedByteArrayResource(byte[] content, String filename) {
            super(content);
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }
}
