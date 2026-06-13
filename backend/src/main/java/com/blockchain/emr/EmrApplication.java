package com.blockchain.emr;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EmrApplication {

	public static void main(String[] args) {
		SpringApplication.run(EmrApplication.class, args);
	}

}
