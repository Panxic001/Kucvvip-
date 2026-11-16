import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  mobileNumber?: string;
  balance: string;
  referralCode: string;
  avatar?: string;
  walletAddress?: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class AuthManager {
  private static instance: AuthManager;
  private token: string | null = null;
  private user: User | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        console.error("Failed to parse user data from storage");
        this.clearAuth();
      }
    }
  }

  private saveToStorage() {
    if (this.token) {
      localStorage.setItem("auth_token", this.token);
    } else {
      localStorage.removeItem("auth_token");
    }

    if (this.user) {
      localStorage.setItem("user_data", JSON.stringify(this.user));
    } else {
      localStorage.removeItem("user_data");
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      const data: AuthResponse = await response.json();
      
      this.token = data.token;
      this.user = data.user;
      this.saveToStorage();
      
      return data.user;
    } catch (error) {
      throw new Error("Login failed");
    }
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    referralCode?: string;
  }): Promise<User> {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Pass the server's specific error message
        throw new Error(data.details || data.message || "Registration failed");
      }
      
      this.token = data.token;
      this.user = data.user;
      this.saveToStorage();
      
      return data.user;
    } catch (error: any) {
      throw new Error(error.message || "Registration failed");
    }
  }

  logout() {
    this.clearAuth();
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
  }

  // Method to reload auth state from storage (for impersonation)
  reloadFromStorage() {
    this.loadFromStorage();
  }

  // Method to set impersonated user data
  setImpersonatedUser(token: string, user: User) {
    this.token = token;
    this.user = user;
    this.saveToStorage();
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  updateUser(userData: Partial<User>) {
    if (this.user) {
      this.user = { ...this.user, ...userData };
      this.saveToStorage();
    }
  }
}

export const authManager = AuthManager.getInstance();
