
import React, { createContext, useState, useContext, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthContextType = {
  isLoggedIn: boolean;
  user: User | null;
  session: Session | null;
  login: (email: string) => Promise<void>;
  signUp: (userData: {
    name: string;
    email: string;
    phone: string;
    country: string;
    city: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoggedIn(!!session);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getCurrentUrl = () => {
    // Get the current origin (protocol + hostname + port)
    return window.location.origin;
  };

  const signUp = async (userData: {
    name: string;
    email: string;
    phone: string;
    country: string;
    city: string;
  }): Promise<void> => {
    try {
      // Generate a random password (this will not be used as we'll use OTP for login)
      const password = Math.random().toString(36).slice(-12);
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            country: userData.country,
            city: userData.city,
          },
          emailRedirectTo: getCurrentUrl(),
        },
      });

      if (error) throw error;
      
      console.log("Sign up successful:", data);
      toast.success("Sign up successful! Please check your email for the verification link.");
    } catch (error: any) {
      console.error("Error signing up:", error.message);
      toast.error(error.message || "Failed to sign up. Please try again.");
      throw error;
    }
  };

  const login = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getCurrentUrl(),
        }
      });

      if (error) throw error;
      
      console.log("Login request sent successfully");
      toast.success("Login link sent to your email. Please check your inbox.");
    } catch (error: any) {
      console.error("Error logging in:", error.message);
      toast.error(error.message || "Failed to log in. Please try again.");
      throw error;
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getCurrentUrl(),
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing in with Google:", error.message);
      toast.error("Failed to sign in with Google. Please try again.");
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("You have been logged out successfully");
    } catch (error: any) {
      console.error("Error signing out:", error.message);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, session, login, signUp, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
