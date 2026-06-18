package com.attendance.system.service;

import com.attendance.system.dto.request.CreateUserRequest;
import com.attendance.system.dto.request.UpdateUserRequest;
import com.attendance.system.dto.response.UserResponse;
import com.attendance.system.exception.AttendanceException;
import com.attendance.system.model.User;
import com.attendance.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AttendanceException("Un utilisateur avec cet email existe déjà");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .department(request.getDepartment())
                .poste(request.getPoste())
                .roles(request.getRoles() != null && !request.getRoles().isEmpty()
                        ? request.getRoles()
                        : Set.of(User.Role.ROLE_EMPLOYE))
                .active(true)
                .photoProfile(request.getPhotoProfile())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(user);
        log.info("Nouvel utilisateur créé par l'admin: {}", user.getEmail());
        return UserResponse.from(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    public UserResponse getUserById(String id) {
        User user = findUserById(id);
        return UserResponse.from(user);
    }

    public UserResponse updateUser(String id, UpdateUserRequest request) {
        User user = findUserById(id);

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getPoste() != null) user.setPoste(request.getPoste());
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            user.setRoles(request.getRoles());
        }
        if (request.getActive() != null) user.setActive(request.getActive());
        if (request.getPhotoProfile() != null) user.setPhotoProfile(request.getPhotoProfile());

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Utilisateur mis à jour: {}", user.getEmail());
        return UserResponse.from(user);
    }

    public void deleteUser(String id) {
        User user = findUserById(id);
        userRepository.delete(user);
        log.info("Utilisateur supprimé: {}", user.getEmail());
    }

    public UserResponse toggleUserStatus(String id) {
        User user = findUserById(id);
        user.setActive(!user.isActive());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("Statut utilisateur modifié: {} -> {}", user.getEmail(), user.isActive());
        return UserResponse.from(user);
    }

    public UserResponse getMyProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AttendanceException("Profil introuvable"));
        return UserResponse.from(user);
    }

    public UserResponse updateProfilePhoto(String email, String photoBase64) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        user.setPhotoProfile(photoBase64);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("Photo de profil mise à jour pour l'utilisateur: {}", email);
        return UserResponse.from(user);
    }

    private User findUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable avec l'id: " + id));
    }
}
