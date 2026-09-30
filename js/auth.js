/**
 * Authentication & Security Management Layer
 * Powered by Supabase Auth (server-side bcrypt, JWT tokens, RLS policies)
 * with graceful fallback to local storage for offline development.
 */
import { StorageService, hashPassword } from './storage.js';
import { Config } from './config.js';
import { SupabaseService } from './supabase.js';

export const AuthService = {
  /**
   * Authenticate an existing user via Supabase Auth
   */
  async login(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Please enter both email and password.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. If Supabase is configured, authenticate directly via Supabase Auth
    if (Config.isSupabaseConfigured()) {
      try {
        const data = await SupabaseService.signIn(cleanEmail, password);
        const user = data.user;
        const session = data.session;

        if (!user) {
          return { success: false, message: 'Unable to retrieve user credentials from Supabase.' };
        }

        // Fetch user profile from public.profiles table
        let profile = null;
        try {
          profile = await SupabaseService.getProfile(user.id);
        } catch (profileErr) {
          console.warn('[Auth] Profile query warning:', profileErr);
        }

        const appUser = {
          id: user.id,
          name: profile?.name || user.user_metadata?.name || cleanEmail.split('@')[0],
          email: user.email,
          currency: profile?.currency || user.user_metadata?.currency || 'INR',
          isSupabase: true
        };

        // Cache user info in local storage for instant dashboard hydration
        StorageService.saveUser(appUser);
        StorageService.setSession(appUser.id);

        // Synchronize cloud transactions, budgets, and goals to local cache
        try {
          await SupabaseService.pullCloudDataToLocal(user.id);
        } catch (syncErr) {
          console.warn('[Auth] Initial cloud pull error:', syncErr);
        }

        return { success: true, user: appUser, session };
      } catch (err) {
        console.error('[Auth] Supabase signIn failure:', err);
        const errMsg = err.message || '';

        if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('invalid_credentials')) {
          return {
            success: false,
            message: 'Invalid email or password. Please verify and retry.'
          };
        }
        if (errMsg.toLowerCase().includes('email not confirmed')) {
          return {
            success: false,
            message: 'Email confirmation required. Please check your inbox or confirm in Supabase Dashboard.'
          };
        }
        return { success: false, message: err.message || 'Authentication failed.' };
      }
    }

    // 2. Offline / Local fallback if Supabase not configured
    const user = StorageService.findUserByEmail(cleanEmail);
    if (!user) {
      return { success: false, message: 'No account found with this email address.' };
    }

    const inputHash = hashPassword(password);
    if (user.passwordHash !== inputHash) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    StorageService.setSession(user.id);
    return { success: true, user };
  },

  /**
   * Create a new user account with enterprise security via Supabase Auth
   */
  async register({ name, email, password, currency = 'INR', initialBalance = 0 }) {
    if (!name || name.trim().length < 2) {
      return { success: false, message: 'Please provide a valid account name (at least 2 characters).' };
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Please provide a valid email identifier.' };
    }

    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const balanceNum = parseFloat(initialBalance) || 0;

    // 1. If Supabase is configured, create account via Supabase Auth
    if (Config.isSupabaseConfigured()) {
      try {
        const data = await SupabaseService.signUp(cleanEmail, password, name.trim(), currency, balanceNum);
        const user = data.user;
        const session = data.session;

        if (!user) {
          return { success: false, message: 'Supabase failed to generate user.' };
        }

        // Check if session was returned immediately (email confirmation disabled or auto-confirmed)
        if (session) {
          const appUser = {
            id: user.id,
            name: name.trim(),
            email: user.email,
            currency: currency || 'INR',
            isSupabase: true
          };

          StorageService.saveUser(appUser);
          StorageService.setSession(appUser.id);

          // Upsert profile in public.profiles table
          try {
            await SupabaseService.upsertProfile({
              id: user.id,
              name: appUser.name,
              email: appUser.email,
              currency: appUser.currency,
              opening_balance: balanceNum
            });
          } catch (pErr) {
            console.warn('[Auth] Profile upsert warning:', pErr);
          }

          // If opening balance was specified, create opening balance transaction
          if (balanceNum > 0) {
            try {
              await SupabaseService.saveTransaction({
                id: 'tx_open_' + Date.now(),
                userId: user.id,
                type: 'income',
                title: 'Opening Ledger Balance',
                amount: balanceNum,
                categoryId: 'salary',
                categoryName: 'Opening Balance',
                iconKey: 'salary',
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'Bank Transfer',
                notes: 'Initial account funding',
                isRecurring: false
              });
              await SupabaseService.pullCloudDataToLocal(user.id);
            } catch (txErr) {
              console.warn('[Auth] Opening transaction creation warning:', txErr);
            }
          }

          return { success: true, user: appUser, confirmed: true };
        } else {
          // Email confirmation is required by project settings
          return {
            success: true,
            user,
            confirmed: false,
            message: `Account created in Supabase! We sent a confirmation link to ${cleanEmail}. Please click the link to activate your account.`
          };
        }
      } catch (err) {
        console.error('[Auth] Supabase signUp failure:', err);
        const errMsg = err.message || '';
        if (errMsg.toLowerCase().includes('already registered')) {
          return { success: false, message: 'An account with this email already exists in Supabase. Please sign in.' };
        }
        return { success: false, message: err.message || 'Account registration failed.' };
      }
    }

    // 2. Offline / Local fallback if Supabase not configured
    const existingUser = StorageService.findUserByEmail(cleanEmail);
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists. Please log in.' };
    }

    const newUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      currency: currency || 'INR',
      createdAt: new Date().toISOString()
    };

    StorageService.saveUser(newUser);

    if (balanceNum > 0) {
      StorageService.saveTransaction({
        id: 'tx_opening_' + Date.now(),
        userId: newUser.id,
        type: 'income',
        title: 'Opening Balance',
        amount: balanceNum,
        categoryId: 'salary',
        categoryName: 'Opening Balance',
        iconKey: 'salary',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        notes: 'Initial opening balance',
        isRecurring: false
      });
    }

    StorageService.setSession(newUser.id);
    return { success: true, user: newUser, confirmed: true };
  },

  /**
   * Request password recovery link via Supabase Auth
   */
  async resetPassword(email) {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    if (Config.isSupabaseConfigured()) {
      try {
        await SupabaseService.resetPassword(email.trim().toLowerCase());
        return {
          success: true,
          message: 'Password recovery email sent by Supabase. Please check your inbox for instructions.'
        };
      } catch (err) {
        return { success: false, message: err.message || 'Password reset failed.' };
      }
    }

    return {
      success: false,
      message: 'Password reset requires an active Supabase cloud connection.'
    };
  },

  /**
   * Instant demo sandbox workspace
   * Connects to live Supabase cloud account (aryan@workspace.dev) or falls back to local storage
   */
  async loginDemo() {
    if (Config.isSupabaseConfigured()) {
      try {
        const cloudRes = await this.login('aryan@workspace.dev', 'password123');
        if (cloudRes.success) {
          return cloudRes;
        }
      } catch (err) {
        console.warn('[Auth] Supabase cloud demo login failed, fallback to local sandbox:', err);
      }
    }

    StorageService.seedDemoData();
    const demoUser = StorageService.findUserById('user_demo_aryan');
    if (demoUser) {
      StorageService.setSession(demoUser.id);
      return { success: true, user: demoUser };
    }
    return { success: false, message: 'Could not initialize demo sandbox.' };
  },

  /**
   * Sign out from Supabase Auth and clear local session
   */
  async logout() {
    if (Config.isSupabaseConfigured()) {
      try {
        await SupabaseService.signOut();
      } catch (err) {
        console.warn('[Auth] SignOut error:', err);
      }
    }
    StorageService.clearSession();
    return { success: true };
  },

  /**
   * Retrieve active user session from Supabase or local cache
   */
  async getCurrentUser() {
    if (Config.isSupabaseConfigured()) {
      try {
        const session = await SupabaseService.getCurrentSession();
        if (session?.user) {
          const user = session.user;
          const cached = StorageService.findUserById(user.id);
          if (cached) {
            return cached;
          }

          // Fetch profile if not cached yet
          let profile = null;
          try {
            profile = await SupabaseService.getProfile(user.id);
          } catch (e) {
            console.warn('[Auth] Profile get warning:', e);
          }

          const appUser = {
            id: user.id,
            name: profile?.name || user.user_metadata?.name || user.email.split('@')[0],
            email: user.email,
            currency: profile?.currency || user.user_metadata?.currency || 'INR',
            isSupabase: true
          };

          StorageService.saveUser(appUser);
          StorageService.setSession(appUser.id);
          return appUser;
        }
      } catch (err) {
        console.warn('[Auth] Error getting Supabase session:', err);
      }
    }

    return StorageService.getCurrentUser();
  },

  /**
   * Update user profile in Supabase and local cache
   */
  async updateProfile(userId, { name, currency }) {
    if (Config.isSupabaseConfigured()) {
      try {
        await SupabaseService.upsertProfile({
          id: userId,
          name: name ? name.trim() : undefined,
          currency: currency || undefined,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[Auth] Profile update error on Supabase:', err);
      }
    }

    const user = StorageService.findUserById(userId);
    if (!user) return { success: false, message: 'User not found in local cache' };

    if (name && name.trim().length >= 2) {
      user.name = name.trim();
    }
    if (currency) {
      user.currency = currency;
    }

    StorageService.saveUser(user);
    return { success: true, user };
  }
};
