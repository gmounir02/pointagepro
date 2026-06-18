package com.attendance.system.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password;

    private String firstName;

    private String lastName;

    private String phone;

    private String department;

    private String poste;

    private Set<Role> roles;

    private boolean active;

    private String photoProfile; // Base64 profile photo

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum Role {
        ROLE_ADMIN,
        ROLE_EMPLOYE
    }
}
