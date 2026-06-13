package com.blockchain.emr.integration.blockchain.infrastructure.config;

import java.time.Duration;

import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

@Configuration
public class BlockchainConfig {

    @Bean(destroyMethod = "shutdown")
    Web3j web3j(
            @Value("${app.blockchain.rpc-url}") String rpcUrl,
            @Value("${app.blockchain.rpc-timeout:5s}") Duration timeout) {
        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(timeout)
                .readTimeout(timeout)
                .writeTimeout(timeout)
                .build();
        return Web3j.build(new HttpService(rpcUrl, client, false));
    }
}
