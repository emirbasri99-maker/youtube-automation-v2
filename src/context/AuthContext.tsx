import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
    id: string;
    email: string;
    name: string | null;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    signUp: (email: string, password: string, fullName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Convert Supabase user to our User type
    const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || null,
    });

    // Check for existing session on mount
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const mappedUser = mapSupabaseUser(session.user);
                console.log('🔐 AuthContext - User logged in:', mappedUser);
                setUser(mappedUser);
                setIsAuthenticated(true);
            } else {
                console.log('❌ AuthContext - No session found');
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser(mapSupabaseUser(session.user));
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                setUser(mapSupabaseUser(data.user));
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(
                error instanceof Error ? error.message : 'Giriş başarısız'
            );
        }
    };

    const signUp = async (
        email: string,
        password: string,
        fullName?: string
    ): Promise<void> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: window.location.origin,
                },
            });

            if (error) {
                console.error('Supabase signUp error:', error);
                throw error;
            }

            if (data.user) {
                console.log('✅ User created:', data.user.id, data.user.email);

                // Check if email confirmation is required
                if (data.session) {
                    // User is immediately logged in (email confirmation disabled)
                    console.log('✅ Session created, user logged in');
                    setUser(mapSupabaseUser(data.user));
                    setIsAuthenticated(true);
                } else {
                    // Email confirmation required
                    console.warn('⚠️ Email confirmation required');
                    throw new Error('Lütfen email adresinizi onaylayın. Gelen kutunuzu kontrol edin.');
                }
            }
        } catch (error) {
            console.error('Sign up error:', error);
            throw new Error(
                error instanceof Error ? error.message : 'Kayıt başarısız'
            );
        }
    };

    const logout = async (): Promise<void> => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout error:', error);
            throw new Error(
                error instanceof Error ? error.message : 'Çıkış başarısız'
            );
        }
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, user, loading, login, logout, signUp }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
