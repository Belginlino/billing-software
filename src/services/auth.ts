import { 
  isFirebaseEnabled, auth as firebaseAuth 
} from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { dbService } from './db';
import { User, UserRole } from '../types';
import { toast } from 'react-toastify';

const MOCK_CREDENTIALS: { [email: string]: { password: string; role: UserRole; username: string } } = {
  'admin@voguemenswear.com': { password: 'Admin123', role: 'super_admin', username: 'Super Admin' },
  'manager@voguemenswear.com': { password: 'Manager123', role: 'store_manager', username: 'Store Manager' },
  'cashier@voguemenswear.com': { password: 'Cashier123', role: 'cashier', username: 'Cashier' },
  'inventory@voguemenswear.com': { password: 'Inventory123', role: 'inventory_staff', username: 'Inventory Staff' },
  'accountant@voguemenswear.com': { password: 'Accountant123', role: 'accountant', username: 'Accountant' }
};

export const authService = {
  async login(email: string, password: string): Promise<User> {
    if (isFirebaseEnabled && firebaseAuth) {
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        } catch (authErr: any) {
          const lowerEmail = email.toLowerCase();
          const defaultCred = MOCK_CREDENTIALS[lowerEmail];
          // If default mock credentials match and firebase auth fails because account does not exist
          if (defaultCred && password === defaultCred.password && 
              (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential')) {
            console.log(`Auto-creating pre-seeded user in Firebase Auth: ${email}`);
            userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          } else {
            throw authErr;
          }
        }
        const firebaseUser = userCredential.user;
        
        // Fetch custom role details from Firestore users collection
        const allUsers = await dbService.getUsers();
        const existing = allUsers.find(u => u.id === firebaseUser.uid);
        
        if (existing) {
          if (existing.status === 'disabled') {
            throw new Error("Your account has been disabled. Please contact your Super Admin.");
          }
          // Update last login
          existing.lastLogin = new Date().toISOString();
          await dbService.saveUser(existing);
          return existing;
        } else {
          let defaultRole: UserRole = 'cashier';
          const prefix = email.split('@')[0].toLowerCase();
          if (prefix === 'admin') defaultRole = 'super_admin';
          else if (prefix === 'manager') defaultRole = 'store_manager';
          else if (prefix === 'cashier') defaultRole = 'cashier';
          else if (prefix === 'inventory') defaultRole = 'inventory_staff';
          else if (prefix === 'accountant') defaultRole = 'accountant';

          const defaultUser: User = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || email.split('@')[0],
            email: email,
            role: defaultRole,
            status: 'active',
            createdAt: new Date().toISOString()
          };
          await dbService.saveUser(defaultUser);
          return defaultUser;
        }
      } catch (err: any) {
        console.error("Firebase Auth failed. Falling back to Local Storage Database mode.", err);
        if (err.code === 'auth/operation-not-allowed' || 
            err.code === 'auth/invalid-api-key' || 
            err.code === 'auth/configuration-not-found' ||
            err.message?.includes('API key') ||
            err.message?.includes('network')) {
          toast.warn("Firebase Auth is disabled or unconfigured in your console. Logging in via Local Offline Mode.");
        } else {
          // Genuine credential mismatch or other errors - fallback to verify mock credentials too
        }
      }
    }

    return this.localLogin(email, password);
  },

  async localLogin(email: string, password: string): Promise<User> {
    // Local Storage Mock Authentication
    const allUsers = await dbService.getUsers();
    const mockUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!mockUser) {
      throw new Error("Invalid credentials. Try: admin@voguemenswear.com");
    }

    if (mockUser.status === 'disabled') {
      throw new Error("Your account has been disabled. Please contact your Super Admin.");
    }

    // Match passwords exactly as specified in README:
    let expectedPassword = '';
    if (mockUser.role === 'super_admin') expectedPassword = 'Admin123';
    else if (mockUser.role === 'store_manager') expectedPassword = 'Manager123';
    else if (mockUser.role === 'cashier') expectedPassword = 'Cashier123';
    else if (mockUser.role === 'inventory_staff') expectedPassword = 'Inventory123';
    else if (mockUser.role === 'accountant') expectedPassword = 'Accountant123';
    else expectedPassword = 'Password123';
    
    // Validate password matches the expected role-based password exactly
    if (password !== expectedPassword) {
      throw new Error("Invalid password credentials. Please try again.");
    }

    mockUser.lastLogin = new Date().toISOString();
    await dbService.saveUser(mockUser);
    
    // Persist session to local storage for persistent logins
    localStorage.setItem('vogue_session', JSON.stringify(mockUser));
    return mockUser;
  },

  async logout(): Promise<void> {
    if (isFirebaseEnabled && firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
    }
    localStorage.removeItem('vogue_session');
  },

  async getCurrentUser(): Promise<User | null> {
    if (isFirebaseEnabled && firebaseAuth) {
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) {
        const allUsers = await dbService.getUsers();
        return allUsers.find(u => u.id === fbUser.uid) || null;
      }
    }
    const session = localStorage.getItem('vogue_session');
    if (session) {
      try {
        return JSON.parse(session) as User;
      } catch {
        return null;
      }
    }
    return null;
  },

  async forgotPassword(email: string): Promise<void> {
    if (isFirebaseEnabled && firebaseAuth) {
      await sendPasswordResetEmail(firebaseAuth, email);
      return;
    }
    
    // Local storage confirmation simulation
    const allUsers = await dbService.getUsers();
    const exists = allUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      throw new Error("Email address not registered in the system.");
    }
    console.log(`Mock: Password reset link sent to ${email}`);
  }
};
