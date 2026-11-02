import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyAe5XliVFQuhlzMt7Nho7tpF-7G4WFLWIs',
  authDomain: 'cert-tracker-dashboard.firebaseapp.com',
  projectId: 'cert-tracker-dashboard',
  appId: '1:890109852658:web:e5d8466dcd4ec0775d496b'
};

export const configured = Object.values(config).every(Boolean);
const app = configured ? (getApps()[0] ?? initializeApp(config)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
