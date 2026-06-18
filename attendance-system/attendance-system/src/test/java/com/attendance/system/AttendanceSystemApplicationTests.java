package com.attendance.system;

import com.attendance.system.dto.request.CreateUserRequest;
import com.attendance.system.dto.request.LoginRequest;
import com.attendance.system.dto.request.PointageRequest;
import com.attendance.system.dto.request.CongeRequest;
import com.attendance.system.dto.request.QrCodeRequest;
import com.attendance.system.model.*;
import com.attendance.system.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.data.mongodb.database=attendance_system_test",
        "spring.data.mongodb.auto-index-creation=true"
})
@AutoConfigureMockMvc
public class AttendanceSystemApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PointageRepository pointageRepository;

    @Autowired
    private CongeRepository congeRepository;

    @Autowired
    private QrCodeRepository qrCodeRepository;

    @Autowired
    private EntrepriseConfigRepository entrepriseConfigRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private String employeeToken;
    private User employeeUser;

    @BeforeEach
    public void setup() throws Exception {
        // Nettoyer la base de test
        userRepository.deleteAll();
        pointageRepository.deleteAll();
        congeRepository.deleteAll();
        qrCodeRepository.deleteAll();
        entrepriseConfigRepository.deleteAll();

        // Créer Admin par défaut
        User admin = User.builder()
                .firstName("Super")
                .lastName("Admin")
                .email("admin@company.ma")
                .password(passwordEncoder.encode("Admin@123"))
                .roles(Set.of(User.Role.ROLE_ADMIN, User.Role.ROLE_EMPLOYE))
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        userRepository.save(admin);

        // Connexion Admin pour obtenir le Token JWT
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("admin@company.ma");
        loginRequest.setPassword("Admin@123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        adminToken = "Bearer " + objectMapper.readTree(responseString).path("data").path("token").asText();

        // Créer un employé via l'admin
        CreateUserRequest createRequest = new CreateUserRequest();
        createRequest.setFirstName("John");
        createRequest.setLastName("Doe");
        createRequest.setEmail("john.doe@company.ma");
        createRequest.setPassword("John@123");
        createRequest.setDepartment("Tech");
        createRequest.setPoste("Developpeur");
        createRequest.setRoles(Set.of(User.Role.ROLE_EMPLOYE));

        result = mockMvc.perform(post("/api/users")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        responseString = result.getResponse().getContentAsString();
        String employeeId = objectMapper.readTree(responseString).path("data").path("id").asText();
        employeeUser = userRepository.findById(employeeId).orElseThrow();

        // Connexion Employé pour obtenir le Token JWT
        LoginRequest empLogin = new LoginRequest();
        empLogin.setEmail("john.doe@company.ma");
        empLogin.setPassword("John@123");

        result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(empLogin)))
                .andExpect(status().isOk())
                .andReturn();

        responseString = result.getResponse().getContentAsString();
        employeeToken = "Bearer " + objectMapper.readTree(responseString).path("data").path("token").asText();
    }

    @Test
    public void testLoginFailure() throws Exception {
        LoginRequest badLogin = new LoginRequest();
        badLogin.setEmail("admin@company.ma");
        badLogin.setPassword("WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testGetUserProfile() throws Exception {
        mockMvc.perform(get("/api/users/me")
                .header("Authorization", employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("john.doe@company.ma"))
                .andExpect(jsonPath("$.data.firstName").value("John"));
    }

    @Test
    public void testEmployeeCannotCreateUser() throws Exception {
        CreateUserRequest createRequest = new CreateUserRequest();
        createRequest.setFirstName("Unauthorized");
        createRequest.setLastName("User");
        createRequest.setEmail("unauth@company.ma");
        createRequest.setPassword("Unauth@123");

        mockMvc.perform(post("/api/users")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAdminCrudUser() throws Exception {
        // Lister tous les utilisateurs
        mockMvc.perform(get("/api/users")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // Toggle status
        mockMvc.perform(patch("/api/users/" + employeeUser.getId() + "/toggle-status")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // Delete user
        mockMvc.perform(delete("/api/users/" + employeeUser.getId())
                .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    public void testPointageFlow() throws Exception {
        // 1. Générer QR Code (Admin)
        QrCodeRequest qrRequest = new QrCodeRequest();
        qrRequest.setValiditeMinutes(5);

        MvcResult result = mockMvc.perform(post("/api/qrcodes/generate")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(qrRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        String qrId = objectMapper.readTree(responseString).path("data").path("id").asText();
        String qrCodeText = objectMapper.readTree(responseString).path("data").path("code").asText();

        // 1.1 Lire les QR Codes actifs (Admin)
        mockMvc.perform(get("/api/qrcodes/actifs")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // 1.2 Lire le détail du QR Code (Admin)
        mockMvc.perform(get("/api/qrcodes/" + qrId)
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value(qrCodeText));

        // 2. Vérifier QR Code
        mockMvc.perform(post("/api/qrcodes/verify")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("code", qrCodeText))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(true));

        // 3. Pointer Entrée (Employé)
        PointageRequest pointageRequest = new PointageRequest();
        pointageRequest.setQrCode(qrCodeText);
        pointageRequest.setLatitude(33.5731);
        pointageRequest.setLongitude(-7.5898);
        pointageRequest.setType(Pointage.TypePointage.ENTREE);
        pointageRequest.setNote("Arrivée matinale");

        mockMvc.perform(post("/api/pointages")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(pointageRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.type").value("ENTREE"))
                .andExpect(jsonPath("$.data.userFullName").value("John Doe"));

        // 4. Pointer Sortie (Employé) - Nécessite un nouveau QR Code car l'ancien a été marqué comme utilisé
        result = mockMvc.perform(post("/api/qrcodes/generate")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(qrRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        responseString = result.getResponse().getContentAsString();
        String qrCodeTextSortie = objectMapper.readTree(responseString).path("data").path("code").asText();

        PointageRequest sortieRequest = new PointageRequest();
        sortieRequest.setQrCode(qrCodeTextSortie);
        sortieRequest.setLatitude(33.5731);
        sortieRequest.setLongitude(-7.5898);
        sortieRequest.setType(Pointage.TypePointage.SORTIE);
        sortieRequest.setNote("Départ");

        mockMvc.perform(post("/api/pointages")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sortieRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.heureSortie").exists());
    }

    @Test
    public void testCongeFlow() throws Exception {
        // 1. Soumettre demande (Employé)
        CongeRequest congeRequest = new CongeRequest();
        congeRequest.setDateDebut(LocalDate.now().plusDays(5));
        congeRequest.setDateFin(LocalDate.now().plusDays(10));
        congeRequest.setTypeConge(Conge.TypeConge.CONGE_PAYE);
        congeRequest.setMotif("Vacances annuelles");

        MvcResult result = mockMvc.perform(post("/api/conges")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(congeRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.statut").value("EN_ATTENTE"))
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        String congeId = objectMapper.readTree(responseString).path("data").path("id").asText();

        // 2. Voir mes congés (Employé)
        mockMvc.perform(get("/api/conges/mes-conges")
                .header("Authorization", employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // 3. Approuver congé (Admin)
        mockMvc.perform(patch("/api/conges/" + congeId + "/approuver")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("commentaire", "Bonnes vacances"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statut").value("APPROUVE"));
    }

    @Test
    public void testDashboardStats() throws Exception {
        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalEmployes").exists());
    }

    @Test
    public void testPointageHistory() throws Exception {
        // Obtenir mes pointages (Employé)
        mockMvc.perform(get("/api/pointages/mes-pointages")
                .header("Authorization", employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // Obtenir pointages par date (Admin)
        String dateStr = LocalDate.now().toString();
        mockMvc.perform(get("/api/pointages/date/" + dateStr)
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // Obtenir pointages par utilisateur (Admin)
        mockMvc.perform(get("/api/pointages/user/" + employeeUser.getId())
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // Obtenir pointages par utilisateur et période (Admin)
        mockMvc.perform(get("/api/pointages/user/" + employeeUser.getId() + "/periode")
                .header("Authorization", adminToken)
                .param("debut", LocalDate.now().minusDays(1).toString())
                .param("fin", LocalDate.now().plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void testCongeExtraFlow() throws Exception {
        // 1. Soumettre une demande (Employé)
        CongeRequest congeRequest = new CongeRequest();
        congeRequest.setDateDebut(LocalDate.now().plusDays(15));
        congeRequest.setDateFin(LocalDate.now().plusDays(20));
        congeRequest.setTypeConge(Conge.TypeConge.MALADIE);
        congeRequest.setMotif("Maladie test");

        MvcResult result = mockMvc.perform(post("/api/conges")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(congeRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        String congeId = objectMapper.readTree(responseString).path("data").path("id").asText();

        // 2. Voir toutes les demandes (Admin)
        mockMvc.perform(get("/api/conges")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // 3. Voir les demandes en attente (Admin)
        mockMvc.perform(get("/api/conges/en-attente")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // 4. Voir par ID (Admin)
        mockMvc.perform(get("/api/conges/" + congeId)
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(congeId));

        // 5. Refuser le congé (Admin)
        mockMvc.perform(patch("/api/conges/" + congeId + "/refuser")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("commentaire", "Refus test"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statut").value("REFUSE"));

        // 6. Tenter de supprimer une demande déjà traitée (Doit échouer / 400)
        mockMvc.perform(delete("/api/conges/" + congeId)
                .header("Authorization", employeeToken))
                .andExpect(status().isBadRequest());

        // 7. Soumettre une NOUVELLE demande qui restera EN_ATTENTE pour la supprimer ensuite
        congeRequest.setDateDebut(LocalDate.now().plusDays(25));
        congeRequest.setDateFin(LocalDate.now().plusDays(30));
        result = mockMvc.perform(post("/api/conges")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(congeRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String congeEnAttenteId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText();

        // 8. Supprimer la demande en attente (Ok / 200)
        mockMvc.perform(delete("/api/conges/" + congeEnAttenteId)
                .header("Authorization", employeeToken))
                .andExpect(status().isOk());
    }

    @Test
    public void testEntrepriseConfigFlow() throws Exception {
        com.attendance.system.dto.request.EntrepriseConfigRequest configReq = new com.attendance.system.dto.request.EntrepriseConfigRequest();
        configReq.setNomEntreprise("Ma Super Company");
        configReq.setLatitude(33.5731);
        configReq.setLongitude(-7.5898);
        configReq.setRayonMetres(100);

        // 1. Tenter de soumettre la config en tant qu'employé (Interdit / 403)
        mockMvc.perform(post("/api/config")
                .header("Authorization", employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(configReq)))
                .andExpect(status().isForbidden());

        // 2. Sauvegarder la config en tant qu'admin (Ok / 200)
        mockMvc.perform(post("/api/config")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(configReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nomEntreprise").value("Ma Super Company"));

        // 3. Lire la config en tant qu'employé (Autorisé / 200)
        mockMvc.perform(get("/api/config")
                .header("Authorization", employeeToken))
                .andExpect(status().isOk());

        // 4. Lire la config en tant qu'admin (Ok / 200)
        mockMvc.perform(get("/api/config")
                .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nomEntreprise").value("Ma Super Company"));

        // 5. Mettre à jour la config en tant qu'admin (Ok / 200)
        configReq.setNomEntreprise("Ma Super Company V2");
        mockMvc.perform(put("/api/config")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(configReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nomEntreprise").value("Ma Super Company V2"));
    }
}
