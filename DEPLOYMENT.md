# Deployment Guide

This project is built with React, Vite, Tailwind CSS v4, and Firebase. 
It is configured for automatic deployment via Netlify.

## 1. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** (Email/Password).
4. Enable **Firestore Database**. Start in production mode, then deploy the rules included in `firestore.rules`.
5. Enable **Storage**. Deploy the rules included in `storage.rules`.
6. Go to Project Settings -> General -> Your Apps, and add a Web App.
7. Copy the Firebase config keys.

## 2. Environment Variables

Create a `.env` file in the root of the project (based on `.env.example`) and fill in your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

*Note: You will also need to add these environment variables in your Netlify site settings.*

## 3. Netlify Deployment

1. Create a new empty repository on your GitHub account.
2. Push this local repository to your GitHub:
   ```bash
   git remote add origin https://github.com/your-username/your-repo.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [Netlify](https://app.netlify.com/).
4. Click **Add new site** -> **Import an existing project**.
5. Connect to GitHub and select your repository.
6. Netlify will automatically detect the `netlify.toml` file and configure the build settings (`npm run build` and publish dir `dist`).
7. **Important:** Before clicking Deploy, go to Advanced Build Settings and add your Firebase Environment Variables (from step 2) so the production build can connect to your database.
8. Click **Deploy Site**.

## 4. Cloud Functions

To deploy the 24-hour return reminder cron job:

1. You must be on the Blaze (Pay-as-you-go) plan to use Firebase Functions.
2. Run `npm install -g firebase-tools`
3. Login via `firebase login`
4. Run `firebase use --add` and select your project.
5. Navigate to the `functions` directory.
6. Run `npm run deploy` to push the cron job to Google Cloud.
