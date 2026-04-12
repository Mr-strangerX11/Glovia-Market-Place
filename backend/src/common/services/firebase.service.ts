import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytes,
  getBytes,
  deleteObject,
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

@Injectable()
export class FirebaseService {
  private firebaseApp: any;
  private storage: any;
  private auth: any;
  private firestore: any;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const firebaseConfig = {
        apiKey: this.configService.get<string>('FIREBASE_API_KEY'),
        authDomain: this.configService.get<string>('FIREBASE_AUTH_DOMAIN'),
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        storageBucket: this.configService.get<string>(
          'FIREBASE_STORAGE_BUCKET',
        ),
        messagingSenderId: this.configService.get<string>(
          'FIREBASE_MESSAGING_SENDER_ID',
        ),
        appId: this.configService.get<string>('FIREBASE_APP_ID'),
        measurementId: this.configService.get<string>(
          'FIREBASE_MEASUREMENT_ID',
        ),
      };

      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase config missing. Skipping Firebase init.');
        return;
      }

      // Initialize Firebase App
      try {
        this.firebaseApp = getApp();
      } catch (error) {
        this.firebaseApp = initializeApp(firebaseConfig);
      }

      // Initialize Firebase Services
      this.storage = getStorage(this.firebaseApp);
      this.auth = getAuth(this.firebaseApp);
      this.firestore = getFirestore(this.firebaseApp);
      this.isInitialized = true;

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.isInitialized = false;
    }
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized. Check environment settings.');
    }
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(
    folder: string,
    fileName: string,
    file: Buffer,
  ): Promise<string> {
    try {
      this.ensureInitialized();
      const fileRef = ref(this.storage, `${folder}/${fileName}`);
      const result = await uploadBytes(fileRef, file);
      return result.metadata.fullPath;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Download file from Firebase Storage
   */
  async downloadFile(filePath: string): Promise<any> {
    try {
      this.ensureInitialized();
      const fileRef = ref(this.storage, filePath);
      const fileBuffer = await getBytes(fileRef);
      return Buffer.from(fileBuffer);
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      this.ensureInitialized();
      const fileRef = ref(this.storage, filePath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth() {
    this.ensureInitialized();
    return this.auth;
  }

  /**
   * Get Firebase Firestore instance
   */
  getFirestore() {
    this.ensureInitialized();
    return this.firestore;
  }

  /**
   * Get Firebase Storage instance
   */
  getStorage() {
    this.ensureInitialized();
    return this.storage;
  }
}
