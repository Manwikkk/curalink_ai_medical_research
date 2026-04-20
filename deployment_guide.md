# Curalink — Production Deployment Guide

Deploying a full-stack application (frontend + backend) involves a "chicken-and-egg" problem: the backend needs the frontend URL (for CORS), and the frontend needs the backend URL (to make API calls). 

To solve this smoothly without errors, we will deploy in the exact order outlined below.

---

## 🟢 STAGE 1: Deploy Frontend to Vercel (Placeholder Backend)

We need the official Vercel URL first. We will deploy the frontend right now using a temporary placeholder for the backend to get it online.

1. Create an account / Log into [Vercel.com](https://vercel.com).
2. Click **Add New > Project** and select your Curalink GitHub repository.
3. In the configuration screen, set:
   - **Framework Preset:** Vite
   - **Root Directory:** `curalink-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://placeholder-url.com/api` *(We will fix this later!)*
5. Click **Deploy**.
6. **Result:** Once finished, Vercel gives you your permanent domain (e.g., `https://curalink-app.vercel.app`).
   **👉 COPY THIS VERCEL URL. You need it for the next steps!**

---

## 🟢 STAGE 2: Deploy Backend to Render

Now that you have your permanent frontend URL, we can safely deploy the backend because we know exactly what domain to allow in CORS.

1. Create an account / Log into [Render.com](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Curalink GitHub repository.
4. Render Configuration Setup:
   - **Root Directory:** `curalink-backend` 
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Expand **Environment Variables** and add all of the required keys below. 

> **Important:** For `FRONTEND_URL`, paste the EXACT link you copied from Vercel in Step 1 (without a trailing slash `/`).

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-actual-vercel-url.vercel.app

# MongoDB
MONGODB_URI=mongodb+srv://curalink_user:<YOUR_PASSWORD>@cluster0.as4spf7.mongodb.net/curalink

# JWT Security
JWT_SECRET=curalink_super_secure_jwt_key_2026_project
JWT_EXPIRES_IN=7d

# Google OAuth Credentials
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
GOOGLE_CALLBACK_URL=https://your-pending-render-url.onrender.com/api/auth/google/callback

# Groq Intelligence API
GROQ_API_KEY=<YOUR_GROQ_API_KEY>
GROQ_MODEL=llama-3.3-70b-versatile
```

6. Click **Deploy Web Service** and wait for it to assign you a Live URL (it will look like `https://curalink-api-xyz.onrender.com`).
   **👉 COPY THIS RENDER URL. You need it for the next steps!**

---

## 🟢 STAGE 3: Seal the Connections

Now we just go back and plug the final variables into the missing locations so the loop connects.

### Step 3A: Update Vercel's Placeholder
1. Go back to your project dashboard on Vercel.
2. Navigate to **Settings > Environment Variables**.
3. Edit the `VITE_API_URL` you made earlier.
4. Replace the placeholder value with your official Render URL. (e.g. `https://curalink-api-xyz.onrender.com/api`).
5. **CRITICAL:** Re-deploy the frontend! Go to Deployments -> click the three dots on your latest deployment -> click **Redeploy**. (React environments require a fresh build to consume new links).

### Step 3B: Fix Render's Google Callback
1. Go back to Render's Environment Variable settings for your backend.
2. Edit `GOOGLE_CALLBACK_URL` and replace `your-pending-render-url.onrender.com` with the actual URL Render just generated for you.

---

## 🟢 STAGE 4: Finalize Google Cloud Platform (GCP)

Google requires explicitly white-listing these newly generated domains before it allows users to log in with their Google accounts.

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services > Credentials**.
2. Edit your Curalink OAuth 2.0 Web Client.
3. Under **Authorized Javascript Origins**, add your official **Vercel URL** (e.g., `https://curalink-app.vercel.app`).
4. Under **Authorized redirect URIs**, add your official **Render Callback URL** (e.g., `https://curalink-api-xyz.onrender.com/api/auth/google/callback`).
5. Save the configuration.

Your app is now securely bridged and fully functional!
