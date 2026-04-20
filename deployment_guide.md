# Curalink — Production Deployment Guide

This guide provides step-by-step instructions for deploying Curalink as a dual-stack architecture (Vercel for the React frontend, Render for the Express Node server). Follow these exactly to ensure your RAG pipelines, Google OAuth, and Database connections survive the cloud transition.

---

## Stage 1: Google Cloud Console (OAuth Prep)

Currently, your Google OAuth is configured to redirect to `http://localhost:5000/api/auth/google/callback`. Since your backend will be living on a live URL (Render), Google will immediately block authentication requests unless you authorize the new live domains.

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/) and specifically your Curalink project APIs.
2. Go to **APIs & Services > Credentials**.
3. Select your Curalink OAuth 2.0 Web Client.
4. Under **Authorized Javascript Origins**, safely add your pending `https://curalink.vercel.app` frontend domain (or wait to add this until after Vercel gives you your exact live URL).
5. Under **Authorized redirect URIs**, add the Render backend URI you are about to create. (e.g. `https://curalink-backend.onrender.com/api/auth/google/callback`).

> **Note:** We will return to this step once Render and Vercel assign you your official random `https://` handles, but keep this tab open!

---

## Stage 2: Deploying the Backend (Render)

Render is the optimal choice for your backend due to its native handling of long-running operations (like LLM inferencing constraints) and free-tier Express integrations.

### Steps to Deploy

1. Ensure your entire Curalink application is safely pushed to a GitHub repository.
2. Log into [Render.com](https://render.com/).
3. Click **New +** and select **Web Service**.
4. Connect the GitHub repository containing `curalink-backend`.
5. Render Configuration Setup:
   - **Root Directory:** `curalink-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`

### Environment Variables (Render)

Before hitting deploy, scroll down to the **Environment Variables** section and meticulously insert the following keys.

*Pay attention to the specific FRONTEND_URL.*

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://[YOUR-VERCEL-PROJECT].vercel.app

# MongoDB
MONGODB_URI=mongodb+srv://curalink_user:<YOUR_PASSWORD>@cluster0.as4spf7.mongodb.net/curalink

# JWT Security
JWT_SECRET=curalink_super_secure_jwt_key_2026_project
JWT_EXPIRES_IN=7d

# Google OAuth Credentials
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
GOOGLE_CALLBACK_URL=https://your-app-name.onrender.com/api/auth/google/callback

# Groq Intelligence API
GROQ_API_KEY=<YOUR_GROQ_API_KEY>
GROQ_MODEL=llama-3.3-70b-versatile
```

6. Click **Deploy Web Service**. Wait for the logs to declare: `🚀 Server running on port 5000` & `✅ MongoDB connected`.
7. Once deployed, Render will grant you an official URL (e.g., `https://curalink-api-xyz.onrender.com`). **Copy this URL.** You need it for Vercel.

---

## Stage 3: Deploying the Frontend (Vercel)

Vercel will impeccably serve your Vite + React single-page frontend.

### Steps to Deploy

1. Log into [Vercel.com](https://vercel.com/) and securely link your GitHub account if you haven't already.
2. Click **Add New > Project** and select your Curalink GitHub repository.
3. In the Vercel configuration screen:
   - **Framework Preset:** Vite
   - **Root Directory:** Edit this and select `curalink-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Environment Variables (Vercel)

Drop down the Environment Variables interface and inject the Render URL you copied in Stage 2.

```env
VITE_API_URL=https://curalink-api-xyz.onrender.com/api
```

4. Click **Deploy**. Vercel detects the custom `vercel.json` rewrite bindings we added and processes them universally avoiding 404 router redirects automatically.
5. Once complete, copy the final live Vercel URL (e.g., `https://curalink.vercel.app`).

---

## Stage 4: Locking the Infrastructure Loop

Now that both domains officially exist in reality, we must cleanly bind their security policies together over CORS and OAuth.

1. **Fix Render CORS Constraints:**
   Go back into your Render dashboard for the API -> `Environment`. Update the `FRONTEND_URL` variable to exactly match the live Vercel URL you just received. (No trailing slashes).
2. **Fix Google OAuth Returns:**
   Go back into the Google Cloud Console (Stage 1). Make sure the `Authorized Javascript Origins` has your exact `https://curalink.vercel.app` domain. Ensure the `Authorized redirect URIs` points to your exact `https://curalink-api-xyz.onrender.com/api/auth/google/callback` layout.

*(Ensure to update the Render `GOOGLE_CALLBACK_URL` server variable to this live callback endpoint if it currently just has placeholder text!)*

---

## Stage 5: Final Production Verification

Proceed strictly to your newly provisioned Vercel frontend domain in an incognito window.
Perform the standard operation loop to guarantee database read/writes and serverless memory are operational.

- [ ] Create an account using email/password manually.
- [ ] Log out, and then securely test the Google OAuth sign-in flow.
- [ ] Connect into a workspace session.
- [ ] Upload a random clinical PDF file, confirming the memory-to-cloud PDF parser correctly extracts and summarizes it safely without disk-access crashes.
- [ ] Formulate a standard clinical reasoning request checking that Groq API connections successfully answer using external literature.
