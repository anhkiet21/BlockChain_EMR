package com.blockchain.emr.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.blockchain.emr.auth.security.JwtAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityErrorHandler securityErrorHandler,
            JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/health",
                                "/actuator/health",
                                "/actuator/prometheus",
                                "/v3/api-docs/**",
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/auth/register",
                                "/auth/login",
                                "/auth/refresh").permitAll()
                        .requestMatchers("/patients/me").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/patients").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/patients/*").hasRole("ADMIN")
                        .requestMatchers("/doctors/me").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.PUT, "/doctors/*/verification").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/doctors/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/departments").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/departments/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/departments").authenticated()
                        .requestMatchers("/medical-files/**").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.POST, "/access-control/emergency/verify").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/access-control/emergency/patients/me").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/access-control/emergency/doctors/me").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/access-requests").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/access-requests/patients/me").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/access-requests/doctors/me").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.PUT, "/access-requests/*/approve").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.PUT, "/access-requests/*/reject").hasRole("PATIENT")
                        .requestMatchers("/access-control/**").hasRole("PATIENT")
                        .requestMatchers("/institutions/me/**").hasRole("INSTITUTION")
                        .requestMatchers("/institutions/me").hasRole("INSTITUTION")
                        .requestMatchers(HttpMethod.GET, "/institutions").authenticated()
                        .requestMatchers("/medical-records/**").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/blockchain/events/sync").hasRole("ADMIN")
                        .requestMatchers("/blockchain/**").authenticated()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
