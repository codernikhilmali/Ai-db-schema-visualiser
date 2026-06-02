package com.backend.ai_based_schema_visualiser.dtos;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
}