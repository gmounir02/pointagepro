# 📝 Documentation Technique Complète — Système de Gestion de Présence (PointagePro)

Cette documentation décrit en détail l'architecture, le modèle de données, les endpoints d'API, les algorithmes clés et le guide d'installation du **Système de Gestion de Présence (PointagePro)**, mis à jour avec les dernières améliorations apportées aux règles métier et à l'expérience utilisateur.

---

## 1. Présentation du Projet

**PointagePro** est un système moderne de gestion et de suivi de présence destiné aux entreprises. Il permet d'automatiser l'enregistrement des entrées (Clock-In) et des sorties (Clock-Out) des employés grâce à une triple couche de validation :

1. **Validation d'Identité Hybride & Biométrique** : Authentification par token JWT et reconnaissance faciale en temps réel (via webcam/caméra frontale).
2. **Validation Spatiale (GPS)** : Restriction géographique obligeant l'employé à se trouver dans le périmètre autorisé de l'entreprise (formule de Haversine).
3. **Validation Physique & Temporelle (QR Code Partagé)** : Utilisation de QR Codes générés dynamiquement par l'administration, valides pour tous les collaborateurs jusqu'à leur date d'expiration.

---

## 2. Architecture Technique

Le projet repose sur une architecture découplée Client-Serveur (Single Page Application branchée sur une API REST) :

```
┌─────────────────────────────────┐          ┌─────────────────────────────────┐
│        Frontend (React)         │ ────────>│        Backend (Spring)         │
│  Port: 5173 | SPA Vite | CSS    │ <────────│ Port: 8082 | Java 17 | Security │
└─────────────────────────────────┘  JWT     └─────────────────────────────────┘
                                                              │
                                                              │ MongoDB Driver
                                                              ▼
                                             ┌─────────────────────────────────┐
                                             │       Base de Données           │
                                             │    MongoDB (attendance_system)  │
                                             └─────────────────────────────────┘
```

### Stack Technique Backend
* **Langage & SDK** : Java 17
* **Framework Principal** : Spring Boot 3.2.0
* **Sécurité & Auth** : Spring Security (JWT Stateless avec signature HMAC-SHA256)
* **Base de données** : MongoDB (via Spring Data MongoDB)
* **Documentation API** : OpenAPI 3 / Swagger (SpringDoc OpenAPI UI)
* **Génération de QR Codes** : ZXing (Zebra Crossing) Library
* **Utilitaire** : Lombok (réduction du code boilerplate)

### Stack Technique Frontend
* **Framework** : React 19 (Vite 8)
* **Design & Styles** : Thème sombre moderne, effets *glassmorphism*, animations fluides et Vanilla CSS
* **Reconnaissance Faciale** : Modèles CDN `face-api.js` (SSD Mobilenet v1, Face Landmarks 68 et Face Recognition)
* **Scanner QR** : `html5-qrcode` (accès direct à la caméra arrière `environment` sans étapes intermédiaires)
* **Icônes** : `lucide-react`

---

## 3. Modèle de Données (Collections MongoDB)

La base de données MongoDB s'appelle `attendance_system` et contient 6 collections clés :

### Collection `users`
Contient les profils des employés et des administrateurs.
```json
{
  "_id": "ObjectId",
  "email": "string (unique, indexé)",
  "password": "string (haché par BCrypt)",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "department": "string",
  "poste": "string",
  "roles": ["ROLE_ADMIN" | "ROLE_EMPLOYE"],
  "active": "boolean",
  "photoProfile": "string (Image officielle au format Base64)",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Collection `pointages`
Enregistre l'historique des pointages. Les absences et retards y sont centralisés.
```json
{
  "_id": "ObjectId",
  "userId": "string (indexé)",
  "userFullName": "string",
  "date": "date (LocalDate YYYY-MM-DD)",
  "heureEntree": "date (LocalDateTime)",
  "heureSortie": "date (LocalDateTime)",
  "latitudeEntree": "double",
  "longitudeEntree": "double",
  "latitudeSortie": "double",
  "longitudeSortie": "double",
  "qrCodeId": "string (UUID associé)",
  "enRetard": "boolean",
  "sortieAnticipee": "boolean",
  "heuresInsuffisantes": "boolean",
  "dureeMinutes": "long (durée de travail calculée lors du clock-out)",
  "type": "string (ENTREE | SORTIE | ABSENCE)",
  "note": "string",
  "photoEntree": "string (Instantané webcam au pointage d'entrée - Base64)",
  "photoSortie": "string (Instantané webcam au pointage de sortie - Base64)",
  "justificationMotif": "string",
  "justificatifFichier": "string (Fichier PDF/Image en Base64)",
  "statutJustification": "string (NON_JUSTIFIE | EN_ATTENTE | APPROUVEE | REJETEE)",
  "modifiedByAdminId": "string",
  "modifiedByAdminName": "string",
  "modifiedAt": "date"
}
```

### Collection `conges`
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "userFullName": "string",
  "dateDebut": "date",
  "dateFin": "date",
  "typeConge": "string (CONGE_PAYE | CONGE_SANS_SOLDE | MALADIE | MATERNITE | PATERNITE | EXCEPTIONNEL)",
  "motif": "string",
  "statut": "string (EN_ATTENTE | APPROUVE | REFUSE)",
  "adminId": "string",
  "commentaireAdmin": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Collection `qr_codes`
Contient les codes QR générés. Ils servent de points d'accès partagés.
```json
{
  "_id": "ObjectId",
  "code": "string (UUID unique)",
  "imageBase64": "string (Code barre 2D en PNG Base64)",
  "createdAt": "date",
  "expiresAt": "date",
  "used": "boolean (obsolète pour le blocage, conservé à des fins d'historique)",
  "createdByAdminId": "string",
  "description": "string",
  "faceVerificationRequired": "boolean (Vérification faciale obligatoire pour ce QR)",
  "usedByUserId": "string (Métadonnée du dernier employé ayant scanné)",
  "usedByUserEmail": "string",
  "usedByUserName": "string",
  "usedAt": "date"
}
```

### Collection `entreprise_config`
```json
{
  "_id": "ObjectId",
  "nomEntreprise": "string",
  "latitude": "double",
  "longitude": "double",
  "rayonMetres": "integer",
  "heureDebutTravail": "time (ex: \"08:30\")",
  "heureFinTravail": "time (ex: \"17:30\")",
  "toleranceRetardMinutes": "integer",
  "adresse": "string",
  "telephone": "string",
  "email": "string",
  "updatedAt": "date",
  "updatedByAdminId": "string"
}
```

### Collection `notifications`
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "title": "string",
  "message": "string",
  "type": "string (LEAVE_APPROVED | LEAVE_REJECTED | NEW_LEAVE | etc.)",
  "read": "boolean",
  "createdAt": "date"
}
```

---

## 4. API Endpoints (Backend REST API)

Les routes sont préfixées par `/api`. Sauf pour la route `/auth/login`, elles exigent toutes le header `Authorization: Bearer <JWT_TOKEN>`.

### 🔓 Routes Publiques
* `POST /api/auth/login` : Authentification utilisateur. Renvoie le token JWT, le rôle et les informations de profil.

### 🔒 Routes Administrateur (`ROLE_ADMIN`)
* **Configuration Globale (`/api/config`)** :
  * `GET /` : Récupère la configuration actuelle (géolocalisation, heures de travail).
  * `POST /` ou `PUT /` : Crée ou met à jour la configuration d'entreprise.
* **Gestion des Collaborateurs (`/api/users`)** :
  * `POST /` : Crée un nouveau collaborateur.
  * `GET /` : Liste tous les utilisateurs de l'entreprise.
  * `GET /{id}` : Récupère les détails d'un utilisateur.
  * `PUT /{id}` : Modifie les données d'un utilisateur (y compris l'upload de sa `photoProfile` en Base64).
  * `DELETE /{id}` : Supprime un compte utilisateur.
  * `PATCH /{id}/toggle-status` : Active ou désactive le statut d'un compte.
* **Génération et Suivi des QR Codes (`/api/qrcodes`)** :
  * `POST /generate` : Génère un QR Code. Paramètres requis dans le corps : `expiresInMinutes` (integer), `description` (string) et `faceVerificationRequired` (boolean).
  * `GET /actifs` : Liste les QR codes encore actifs (dont la date d'expiration est dans le futur).
  * `GET /verify/{code}` : Retourne la validité d'un code et si la reconnaissance faciale est obligatoire.
* **Demandes de Justification (`/api/pointages`)** :
  * `GET /justifications/en-attente` : Liste les justificatifs soumis par les employés.
  * `PATCH /{id}/evaluer-justification` : Valide ou rejette la justification d'un retard.
* **Indicateurs & Dashboard (`/api/dashboard`)** :
  * `GET /` : Synthèse globale des statistiques de l'entreprise.

### 🔒 Routes Collaborateur / Partagées
* **Espace Pointage (`/api/pointages`)** :
  * `POST /` : Soumet un pointage (corps : `{ qrCode, latitude, longitude, type, note, photo }`).
  * `GET /mes-pointages` : Historique des pointages personnels.
  * `POST /{id}/justifier` : Soumet une pièce justificative pour un retard (texte et fichier Base64).
* **Espace Congés (`/api/conges`)** :
  * `POST /` : Soumet une demande de congé.
  * `GET /mes-conges` : Liste les demandes de l'utilisateur connecté.
  * `DELETE /{id}` : Annule une demande de congé (si elle est encore `EN_ATTENTE`).
* **Gestion des Notifications (`/api/notifications`)** :
  * `GET /` : Liste toutes les notifications in-app de l'employé.
  * `PATCH /{id}/read` : Marque une notification spécifique comme lue.
  * `PATCH /read-all` : Marque toutes les notifications comme lues.

---

## 5. Algorithmes Métiers & Logique de Pointage

### 5.1 Validation de Zone (Calcul GPS)
Le système compare la position GPS déclarée par l'appareil de l'employé avec les coordonnées géographiques configurées pour le siège social de l'entreprise. La distance géodésique en mètres est évaluée à l'aide de la **formule de Haversine** :

```java
public static double calculerDistance(double lat1, double lon1, double lat2, double lon2) {
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);

    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c * 1000; // Retourne la distance en mètres
}
```
Si la distance mesurée dépasse la tolérance paramétrée (ex: 100 mètres), le backend bloque le pointage en lançant une exception géographique.

### 5.2 Logique de QR Codes Partagés
Contrairement aux anciennes versions à usage unique, un QR Code généré par l'administrateur fait office de **borne de scan partagée** :
* **Validité temporelle** : Le QR reste actif pour tous les employés tant que `LocalDateTime.now().isBefore(expiresAt)`.
* **Aucun blocage après premier scan** : Le champ `used` n'invalide plus le code. Il sert uniquement d'indicateur. Le backend met à jour les champs `usedByUserId`, `usedByUserEmail`, `usedByUserName` et `usedAt` lors du dernier scan pour permettre un suivi et un audit en temps réel par l'administrateur.

### 5.3 Reconnaissance Faciale Conditionnelle & Détails Techniques (face-api.js)
Lors du scan d'un QR code, l'application frontend interroge l'API pour connaître les exigences du code scanné. Si le champ `faceVerificationRequired` est à `true`, le module de vérification faciale s'active automatiquement dans le navigateur de l'employé.

#### A. Les Modèles de Réseaux de Neurones Utilisés (TensorFlow.js)
L'application charge de manière asynchrone des modèles d'apprentissage profond pré-entraînés depuis un CDN sécurisé :
* **`ssdMobilenetv1`** (Single Shot Multibox Detector avec architecture MobileNet) : Détecte l'emplacement du visage dans le flux vidéo de la caméra et dessine une boîte de délimitation (bounding box).
* **`faceLandmark68Net`** : Identifie **68 points d'ancrage caractéristiques** (les repères faciaux : contour des yeux, sourcils, nez, bouche, mâchoire) pour redresser et aligner le visage même en cas de légère inclinaison.
* **`faceRecognitionNet`** (basé sur une architecture de type ResNet-34) : Extrait la signature unique du visage pour générer un **descripteur de 128 dimensions** (vecteur d'empreinte faciale).

#### B. Algorithme de Comparaison Faciale
1. **Extraction de Référence (Officielle)** : Au chargement de l'espace de pointage, la photo de profil officielle stockée en Base64 (`photoProfile` dans la collection `users`) est analysée par les réseaux de neurones pour calculer son vecteur de référence $V_{\text{ref}}$ (128 valeurs décimales).
2. **Capture Temps Réel** : Lors du clic de pointage, un instantané est capturé depuis le flux de la webcam frontale. L'IA détecte le visage présent et extrait son propre vecteur de capture $V_{\text{cap}}$.
3. **Calcul de Distance Euclidienne** : L'IA calcule la distance euclidienne entre ces deux vecteurs dans l'espace à 128 dimensions :
   $$d(V_{\text{ref}}, V_{\text{cap}}) = \sqrt{\sum_{i=1}^{128} (V_{\text{ref}, i} - V_{\text{cap}, i})^2}$$
   * **Seuil de tolérance (Threshold)** : Le seuil de correspondance est configuré à **`0.6`** par défaut.
   * **Validation** : Si la distance calculée est **strictement inférieure à `0.6`**, la similarité est jugée suffisante (le visage correspond à la photo de profil) et le pointage est autorisé. Sinon, l'accès est refusé.

#### C. Expérience Utilisateur et Effet Miroir
* **Ajustement Visuel** : Par défaut, l'affichage de la caméra frontale sur les appareils mobiles ou ordinateurs apparaît inversé à l'utilisateur, ce qui n'est pas naturel pour s'ajuster. Le flux vidéo de la caméra frontale est stylisé en CSS avec une transformation de symétrie horizontale : `transform: scaleX(-1);`.
* **Vidéoprotection intégrée** : La photo capturée au moment précis du pointage est encodée en Base64 et stockée dans l'enregistrement de présence (champs `photoEntree` ou `photoSortie` dans la collection `pointages`). Cela permet aux administrateurs de réaliser des audits manuels en cas de doute.

#### D. Modes de Repli (Fallback)
* **Absence de photo officielle** : Si aucun portrait n'a encore été téléversé pour le collaborateur, le système bascule dans un mode permissif. Il autorise le pointage tout en affichant un badge d'avertissement informatif indiquant que la vérification faciale a été contournée en l'absence de fichier source.
* **Échec d'initialisation de l'IA** : Si les modèles ne peuvent pas être chargés (panne réseau, blocage CDN, navigateur non compatible), le système bascule sur un mode de secours pour ne pas pénaliser l'employé, permettant le pointage tout en enregistrant l'incident dans les logs.

### 5.4 Synthèse des Absences ("En attente" vs "Absent")
Pour éviter de pénaliser les collaborateurs en les qualifiant d'absents dès le matin :
1. **Pendant la journée de travail** (avant l'heure définie par `heureFinTravail`, ex: 17h30), les employés n'ayant pas encore pointé apparaissent avec le statut **"En attente"** (badge gris neutre).
2. **Après la fin de la journée de travail** (ou si le jour est entièrement passé), le backend (méthode `synthesizeAbsences`) génère formellement un pointage de type `ABSENCE` (badge rouge) pour les employés manquants.

### 5.5 Gestion de Session & Verrouillage de Pointage
Dans l'onglet **Pointer** (`ClockInOut.jsx`), le frontend analyse l'historique de l'employé au chargement :
* Si un pointage d'arrivée sans départ associé est trouvé pour le jour même :
  * Le sélecteur est automatiquement réglé sur **DÉPART (Sortie)**.
  * Le bouton **ARRIVÉE (Entrée)** est désactivé (`disabled`) et grisé à 35% d'opacité avec un curseur `not-allowed`.
  * Un bandeau violet informe l'employé qu'il a déjà pointé son entrée.
* Dès qu'un pointage de sortie est enregistré, l'interface bascule à nouveau sur l'état d'arrivée pour la prochaine session.

---

## 6. Améliorations de l'Interface Utilisateur (UI/UX)

1. **Responsivité Mobile du Profil** : La page Mon Profil a été restructurée. Sur mobile (écrans inférieurs à 768px), les informations s'affichent verticalement en une seule colonne compacte.
2. **Barre de Navigation Mobile** : Suppression du texte sous les icônes de la barre de navigation basse afin d'éviter tout chevauchement ou débordement.
3. **Menu Déconnexion Épuré** : 
   * Pour l'employé, le bouton de déconnexion est situé dans son onglet **Mon Profil**.
   * Pour l'administrateur, il se situe au sein de la page **Configuration** (carte dédiée à la Gestion de Session).
4. **Notifications Mobiles Accessibles** : La cloche de notification sur mobile possède maintenant une zone cliquable de `40px` minimum. Son dropdown a été corrigé pour utiliser une position `fixed` recouvrant la largeur de l'écran avec un `z-index` de 9999 pour éliminer tout bug de superposition.

---

## 7. Guide d'Installation et Lancement

### Prérequis
* Java JDK 17
* Maven 3.x
* Node.js (version 16 ou supérieure)
* MongoDB s'exécutant sur le port standard (`27017`)

### 1. Démarrage du Backend
1. Ouvrir un terminal dans le dossier `attendance-system/attendance-system`.
2. Lancer la compilation et le serveur de développement :
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```
3. L'API est disponible sur `http://localhost:8082`.
4. La documentation interactive Swagger est accessible à l'adresse suivante : `http://localhost:8082/swagger-ui/index.html`.

### 2. Démarrage du Frontend
1. Ouvrir un terminal dans le dossier `attendance-front`.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
4. L'application web est accessible sur `http://localhost:5173`.

### 3. Identifiants d'Administration par Défaut
* **Email** : `admin@company.ma`
* **Mot de passe** : `Admin@123`

---

## 8. Déploiement en Production et CI/CD (Render & Vercel)

Le projet est configuré pour un déploiement continu automatisé à chaque mise à jour de la branche `main` du dépôt GitHub.

### 8.1 Hébergement du Backend (Render)
* **URL de l'API** : `https://pointagepro-ml6w.onrender.com`
* **Plateforme** : [Render.com](https://render.com) (Web Service de type Docker / Java Maven)
* **Configuration** :
  * Langage : Java 17 (Maven build)
  * Commande de build : `mvn clean package -DskipTests`
  * Commande de démarrage : `java -jar target/attendance-system-0.0.1-SNAPSHOT.jar`
  * Base de données : Connexion à un cluster MongoDB Atlas cloud (configurée via la variable d'environnement `SPRING_DATA_MONGODB_URI` ou `MONGODB_URI` sur Render).
* **Fonctionnement du CI/CD** : Tout commit pushed vers le dépôt GitHub déclenche automatiquement la recompilation et le redémarrage sans interruption de service sur Render.

### 8.2 Hébergement du Frontend (Vite + React)
* **URL du Site Web** : *URL fournie sur Vercel* (par exemple `https://pointagepro.vercel.app`)
* **Plateforme** : [Vercel](https://vercel.com) (optimisé pour les architectures SPA React / Vite)
* **Configuration** :
  * Répertoire racine : `attendance-front`
  * Framework Preset : Vite
  * Commande de build : `npm run build`
  * Répertoire de sortie : `dist`
  * Variable d'API : Configurée via `API_BASE_URL` dans `src/services/api.js` pointant directement vers le service Render.
* **Fonctionnement du CI/CD** : Vercel écoute les changements sur la branche `main`. Dès qu'un push est détecté, le code est minifié et poussé sur le CDN mondial.

