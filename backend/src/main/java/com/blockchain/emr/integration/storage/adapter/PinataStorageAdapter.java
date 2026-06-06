package com.blockchain.emr.integration.storage.adapter;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import com.blockchain.emr.integration.storage.domain.StorageException;
import com.blockchain.emr.integration.storage.domain.StorageService;
import com.blockchain.emr.integration.storage.domain.StoredObject;

@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "pinata")
public class PinataStorageAdapter implements StorageService {

    private final RestClient pinataClient;
    private final RestClient gatewayClient;

    public PinataStorageAdapter(
            RestClient.Builder builder,
            @Value("${app.pinata.api-url:https://api.pinata.cloud}") String apiUrl,
            @Value("${app.pinata.gateway-url}") String gatewayUrl,
            @Value("${app.pinata.jwt}") String jwt) {
        this.pinataClient = builder.clone()
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .build();
        this.gatewayClient = builder.clone().baseUrl(gatewayUrl).build();
    }

    @Override
    public StoredObject store(byte[] content, String filename) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new NamedByteArrayResource(content, filename));
            Map<?, ?> response = pinataClient.post()
                    .uri("/pinning/pinFileToIPFS")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            Object cid = response == null ? null : response.get("IpfsHash");
            if (cid == null || cid.toString().isBlank()) {
                throw new StorageException("Pinata did not return a CID");
            }
            return new StoredObject(cid.toString());
        } catch (StorageException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new StorageException("Could not upload encrypted file to Pinata", exception);
        }
    }

    @Override
    public byte[] retrieve(String cid) {
        try {
            byte[] content = gatewayClient.get()
                    .uri("/ipfs/{cid}", cid)
                    .retrieve()
                    .body(byte[].class);
            if (content == null) {
                throw new StorageException("Pinata gateway returned empty content");
            }
            return content;
        } catch (StorageException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new StorageException("Could not retrieve encrypted file from Pinata", exception);
        }
    }

    @Override
    public void delete(String cid) {
        try {
            pinataClient.delete().uri("/pinning/unpin/{cid}", cid).retrieve().toBodilessEntity();
        } catch (Exception exception) {
            throw new StorageException("Could not unpin encrypted file from Pinata", exception);
        }
    }

    @Override
    public String provider() {
        return "PINATA";
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
