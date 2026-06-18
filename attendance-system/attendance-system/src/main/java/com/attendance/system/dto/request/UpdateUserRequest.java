package com.attendance.system.dto.request;

import com.attendance.system.model.User;
import lombok.Data;

import java.util.Set;

@Data
public class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private String phone;
    private String department;
    private String poste;
    private Set<User.Role> roles;
    private Boolean active;
    private String photoProfile; // Base64 profile photo
}
