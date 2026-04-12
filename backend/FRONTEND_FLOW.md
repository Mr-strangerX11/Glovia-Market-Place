# Frontend Registration & Verification Flow

## 📝 Step-by-Step User Flow

### Step 1: Create Account (Registration)
**User Action:** Fill form and click "Create Account"

**API Request:**
```javascript
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "9841234567",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification code.",
  "nextStep": "VERIFY_EMAIL",
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "isEmailVerified": false
}
```

**Frontend Action:**
- ✅ Show success message
- ✅ **Navigate to OTP Verification Page**
- ✅ Pre-fill email field
- ✅ Show "Check your email for 6-digit code" message

**Error Response (409 - Email exists):**
```json
{
  "message": "Email or phone already exists",
  "error": "Conflict",
  "statusCode": 409
}
```

---

### Step 2: Enter OTP Code
**User Action:** Enter 6-digit code from email

**API Request:**
```javascript
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (Code Matches ✅):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login.",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "isEmailVerified": true,
    "trustScore": 20
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Frontend Action:**
- ✅ Show "Email verified successfully!"
- ✅ **Navigate to Login Page**
- ✅ Optionally pre-fill email on login page
- ✅ Show success toast: "Account created! Please login."

**Error Response (Wrong Code ❌):**
```json
{
  "message": "Wrong code. Please check your email and try again.",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Frontend Action:**
- ❌ Show error message below OTP input
- ❌ Clear OTP input field
- ❌ Keep user on verification page
- ❌ Show "Wrong code" in red text

**Error Response (Expired Code):**
```json
{
  "message": "Verification code expired. Please request a new code.",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Frontend Action:**
- ❌ Show "Code expired" message
- ✅ Show "Resend Code" button
- ✅ Enable resend functionality

---

### Step 2b: Resend OTP (Optional)
**User Action:** Click "Didn't receive code? Resend"

**API Request:**
```javascript
POST /api/v1/auth/verify-email/resend
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "message": "Verification OTP resent successfully. Please check your email."
}
```

**Frontend Action:**
- ✅ Show "New code sent! Check your email"
- ✅ Disable resend button for 60 seconds
- ✅ Show countdown timer

---

### Step 3: Login
**User Action:** Enter email and password, click "Login"

**API Request:**
```javascript
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response:**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "phone": "9841234567",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "trustScore": 20,
    "isEmailVerified": true,
    "isPhoneVerified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Frontend Action:**
- ✅ Store tokens in localStorage/cookies
- ✅ **Navigate to Dashboard/Home**
- ✅ Show welcome message

**Error Response (Email not verified):**
```json
{
  "message": "Please verify your email before logging in. Check your inbox for verification code.",
  "error": "Forbidden",
  "statusCode": 403
}
```

**Frontend Action:**
- ❌ Show error message
- ✅ Show "Resend verification email" button
- ✅ Navigate to verification page

---

## 🎨 Frontend Implementation Example (React)

### Registration Component
```jsx
const handleRegister = async (formData) => {
  try {
    const response = await fetch('https://backend-glovia.vercel.app/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.nextStep === 'VERIFY_EMAIL') {
      // Navigate to OTP verification page
      navigate('/verify-email', { 
        state: { 
          email: data.email,
          message: data.message 
        } 
      });
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Registration failed. Please try again.');
  }
};
```

### OTP Verification Component
```jsx
const handleVerifyOTP = async (otpCode) => {
  try {
    const response = await fetch('https://backend-glovia.vercel.app/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: location.state.email,
        otp: otpCode
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Show success message
      toast.success('Email verified successfully!');
      
      // Navigate to login page
      setTimeout(() => {
        navigate('/login', {
          state: {
            email: data.user.email,
            message: 'Account created! Please login.'
          }
        });
      }, 1500);
    } else {
      // Show error (wrong code, expired, etc.)
      setError(data.message);
      setOtpCode(''); // Clear input
    }
  } catch (error) {
    setError('Verification failed. Please try again.');
  }
};
```

---

## 📊 Flow Diagram

```
┌─────────────────┐
│  Register Form  │
│  (Create Acct)  │
└────────┬────────┘
         │
         ▼
    API: /register
         │
         ▼
   ┌─────────────┐
   │ Email Sent  │ ← OTP sent to user's email
   └──────┬──────┘
          │
          ▼
┌──────────────────┐
│ OTP Verify Page  │ ← User enters 6-digit code
└────────┬─────────┘
         │
         ▼
   API: /verify-email
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  MATCH    WRONG
    │         │
    ▼         ▼
┌──────┐  ┌──────────┐
│Login │  │Show Error│
│ Page │  │Try Again │
└──────┘  └──────────┘
```

---

## 🔑 Key Points for Frontend

1. ✅ **After registration** → Navigate to OTP page automatically
2. ✅ **OTP matches** → Show success → Navigate to Login page
3. ❌ **Wrong code** → Show "Wrong code" error → Stay on OTP page
4. ⏱️ **Expired code** → Show "Resend" button
5. 📧 **Email in inbox** → 5-minute validity
6. 🔐 **Tokens returned** → Can auto-login or redirect to login

---

## 🚀 API Endpoints Summary

| Endpoint | Method | Purpose | Next Action |
|----------|--------|---------|-------------|
| `/auth/register` | POST | Create account | → OTP Page |
| `/auth/verify-email` | POST | Verify OTP | → Login Page (if match) |
| `/auth/verify-email/resend` | POST | Resend OTP | → Check email |
| `/auth/login` | POST | Login | → Dashboard |

---

## ✅ Testing the Flow

Test with real email:
```bash
# 1. Register
curl -X POST https://backend-glovia.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourtest@example.com",
    "phone": "9876543210",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Check email for OTP (e.g., 123456)

# 3. Verify OTP
curl -X POST https://backend-glovia.vercel.app/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourtest@example.com",
    "otp": "123456"
  }'

# 4. Login
curl -X POST https://backend-glovia.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourtest@example.com",
    "password": "Test123!@#"
  }'
```

---

**Backend Status:** ✅ Production Ready  
**Email Service:** ✅ Gmail SMTP Active  
**OTP Delivery:** ✅ Working  
**Verification Flow:** ✅ Implemented
