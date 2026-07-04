# 📚 BEGINNER-FRIENDLY SETUP & INTEGRATION GUIDE: ENTERPRISE MULTI-VENDOR PLATFORM

Welcome to the full setup and integration guide. This guide explains how to build, run, and connect the **Apex E-Commerce Platform** step-by-step in simple language.

---

## 🗺️ ARCHITECTURE FLOW OVERVIEW

```
  +------------------+                   +----------------------+
  |  React Frontend  | --[1. ID Token]-->|  Spring Boot Server  |
  |  (Vite, Tailwind)|                   |  (JWT Auth Filters)  |
  +------------------+                   +----------------------+
       ^          |                                  |
       |          |                                  |
 [Auth Tokens] [Card/UPI Pays]                [Verify & Persist]
       |          |                                  |
       v          v                                  v
+--------------------+                       +------------------+
|    Firebase Auth   |                       |    PostgreSQL    |
| (Google, OTP, SMS) |                       |     Database     |
+--------------------+                       +------------------+
```

---

## 1. Creating a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Under the project name, type `apex-ecommerce-platform`.
4. Choose whether to enable **Google Analytics** (recommended for marketing logs) and click **Continue**.
5. Once your workspace is ready, click **Create project** to load the console homepage.

---

## 2. Creating a Firebase Web App
1. On the project overview homepage, look for circular platform icons.
2. Click the Web icon code symbol (`</>`) to start.
3. In **App nickname**, enter `Apex-Client-Web`.
4. Leave *Firebase Hosting* unchecked for now.
5. Click **Register app**.

---

## 3. Copying Firebase Config
1. After registration, Firebase displays an initialization code chunk.
2. Locate the `firebaseConfig` object inside the scripts:
   ```json
   {
     "apiKey": "AIzaSyA1...",
     "authDomain": "apex-ecommerce.firebaseapp.com",
     "projectId": "apex-ecommerce",
     "storageBucket": "apex-ecommerce.appspot.com",
     "messagingSenderId": "2810...",
     "appId": "1:2810..."
   }
   ```
3. Copy this configuration block. You will place it in your frontend `.env` or configuration files.

---

## 4. Enabling Email Login
1. In the Firebase Left Sidebar, click **Build** -> **Authentication**.
2. Go to the **Sign-in method** tab.
3. Click **Add new provider** and select **Email/Password**.
4. Toggle the status to **Enabled** and click **Save**.

---

## 5. Enabling Google Login
1. In the **Sign-in method** tab of Firebase Authentication, click **Add new provider**.
2. Choose **Google**.
3. Enable the toggle.
4. Input a project support email (e.g. `support@yourdomain.com`).
5. Firebase automatically sets a web client ID. Click **Save**.

---

## 6. Enabling Phone Login
1. In the **Sign-in method** tab, click **Add new provider** and select **Phone**.
2. Toggle **Enabled**.
3. (Optional but recommended for testing) Expand the *Phone numbers for testing* accordion menu.
4. Add a dummy phone number (e.g., `+91 9999999999`) and a test verification pin (e.g., `123456`). This allows you to log in in sandbox mode without using standard SMS credits.
5. Click **Save**.

---

## 7. Installing Firebase SDK
In your React project root directory, run the following command in your terminal to install the official Firebase library helper:
```bash
npm install firebase
```
This adds the `firebase` package to your `package.json` dependencies list.

---

## 8. Creating `firebase.ts` Configuration
Inside your React source code directory (`/src/`), create a sub-helper folder and configure the connection client:

```typescript
// File: /src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from "firebase/auth";

// Populate variables dynamically from the env properties
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

---

## 9. Connecting the Register Page
When a user submits the signup form, trigger standard Firebase token creation workflows:

```typescript
import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const handleRegisterSubmit = async (email, password, fullName) => {
  try {
    // 1. Create registration user inside Firebase Authentication database
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 2. Attach metadata display details
    await updateProfile(user, { displayName: fullName });
    
    return user;
  } catch (error) {
    console.error("Firebase registration failure", error.message);
    throw error;
  }
};
```

---

## 10. Connecting the Login Page
Implement sign-in capabilities, including Google Popups:

```typescript
import { auth, googleProvider } from "../lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

// Email Sign In
const handleEmailLogin = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

// Google Quick Access SSO Sign In
const handleGoogleLogin = async () => {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
};
```

---

## 11. Implementing Email Verification
To ensure data accuracy, trigger confirmation links directly into the user's primary mailbox:

```typescript
import { sendEmailVerification } from "firebase/auth";

const verifyUserMailbox = async (firebaseUser) => {
  if (firebaseUser && !firebaseUser.emailVerified) {
    await sendEmailVerification(firebaseUser);
    alert("Verification email dispatched! Please check your spam folder.");
  }
};
```

---

## 12. Implementing Email OTP (Backend Core)
For enterprise-level two-factor login verification or email OTP flows, generate a 6-digit pin server-side and dispatch it:

```java
// Spring Boot OTP Generation Controller
@RestController
@RequestMapping("/api/auth")
public class EmailOtpController {

    @Autowired
    private JavaMailSender mailSender;

    private Map<String, String> otpStorage = new ConcurrentHashMap<>();

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendEmailOtp(@RequestParam String email) {
        String otp = String.format("%06d", new Random().nextInt(999999));
        otpStorage.put(email, otp);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Your Apex Platform Security Pin");
        message.setText("Verify transaction with this OTP: " + otp);
        mailSender.send(message);

        return ResponseEntity.ok("OTP dispatched successfully.");
    }
}
```

---

## 13. Implementing Phone OTP (Frontend Core)
Establish Firebase recapcha gates to receive secure numeric tokens on mobile carriers:

```typescript
import { auth } from "../lib/firebase";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

const triggerSmsOtp = async (phoneNumberFormatted) => {
  // 1. Mount visual or invisible verification anchor
  const verifier = new RecaptchaVerifier(auth, "recaptcha-container-id", {
    size: "invisible"
  });

  // 2. Dispatch SMS payload from Firebase auth servers
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumberFormatted, verifier);
  
  // 3. Keep verification token handler object
  return confirmationResult;
};

const completeSmsOtpVerification = async (confirmationResult, inputCode) => {
  const userCredential = await confirmationResult.confirm(inputCode);
  return userCredential.user;
};
```

---

## 14. Verifying Firebase Token in Spring Boot
Protecting backend resources requires validating client ID tokens on your Spring Boot secure micro-routes:

```java
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String authHeader = req.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String idToken = authHeader.substring(7);
            try {
                // Validate directly with Firebase servers
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
                String email = decodedToken.getEmail();
                
                // Configure context parameters
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        email, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        chain.doFilter(req, res);
    }
}
```

---

## 15. Generating JWT (Post-Authentication)
Once the token verifies successfully, issue a secure application JWT containing details and user Roles (`ADMIN`, `SELLER`, `USER`) for independent state validation:

```java
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

public class JwtTokenProvider {

    private final String JWT_SECRET = "ApexPlatformEnterpriseMegaKeySecureUnique2026";
    private final long EXPIRATION_TIME = 864000000; // 10 Days

    public String generateAppToken(String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SignatureAlgorithm.HS512, JWT_SECRET)
                .compact();
    }
}
```

---

## 16. Saving Users to PostgreSQL (JPA Entity mapping)
Automatically persist newly mapped auth-profile metrics inside the central SQL backend:

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String phoneNumber;
    
    @Enumerated(EnumType.STRING)
    private UserRole role; // ADMIN, SELLER, USER

    // For multi-vendor sellers store registration logs
    private String storeName;
    private String gstin;
    private String sellerStatus; // PENDING, APPROVED, REJECTED
}
```

---

## 17. Protecting Client Routes
Control page routing using React client contexts:

```typescript
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export function AdminRoute({ children }) {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}
```

---

## 18. Connecting Razorpay Payments
Integrate Razorpay's custom Indian payment gateway for seamless card, UPI, and net-banking transactions:

```typescript
// 1. In React, inject Razorpay's overlay script
const initRazorpayPayment = (orderId, amountInPaise) => {
  const options = {
    key: "rzp_test_YourKeyHere", // Razorpay Merchant API Key
    amount: amountInPaise,     // Settle in Paise (e.g. ₹100.00 = 10000 paise)
    currency: "INR",
    name: "Apex Platform",
    description: "Settle Multi-Vendor Basket",
    order_id: orderId,         // Razorpay Order ID created on backend
    handler: function (response) {
      alert("Verification Hash: " + response.razorpay_payment_id);
      // Trigger confirmation request to Spring Boot backend
    },
    prefill: {
      name: "Saurabh Dev",
      email: "customer@domain.com"
    },
    theme: { color: "#4f46e5" } // Brand Purple Indigos
  };

  const paymentWindow = new (window as any).Razorpay(options);
  paymentWindow.open();
};
```

---

## 19. Connecting Stripe Payments
Enable production Checkout for global cards and RuPay payments:

```typescript
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_YourPublicKeyHere");

const handleStripeCheckout = async (lineItems) => {
  const stripe = await stripePromise;

  // 1. Fetch redirection session parameters from Spring Boot
  const res = await axios.post("/api/pay/stripe/checkout-session", { items: lineItems });
  
  // 2. Redirect purchaser directly into verified secure credit-card overlays
  const result = await stripe.redirectToCheckout({
    sessionId: res.data.sessionId,
  });

  if (result.error) {
    console.error(result.error.message);
  }
};
```

---

## 20. Deploying the Multi-Vendor Application
To run the enterprise application on public production servers (AWS EC2, Google Cloud Run, Azure), configure dynamic multi-stage **Docker** container configurations:

```dockerfile
# -------------------------------------------------------------
# Dockerfile: Spring Boot App & Static React Frontend Assembly
# -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app/backend
COPY ./spring-boot-backend /app/backend
RUN mvn clean package -DskipTests

FROM node:20 AS frontend-build
WORKDIR /app/client
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Final ultra-light alpine container image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /opt/prod
COPY --from=backend-build /app/backend/target/*.jar ./app.jar
COPY --from=frontend-build /app/client/dist ./static

EXPOSE 3000
CMD ["java", "-jar", "app.jar", "--server.port=3000"]
```

---
*Created by Apex Enterprise Engineering support core. For queries or extended API Swagger hooks, access the dashboard at `/admin` panels.*
