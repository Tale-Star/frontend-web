import { httpClient } from '@/api/HttpClient'
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '@/types/api'

export const authApi = {
  register(payload: RegisterRequest): Promise<AuthResponse> {
    return httpClient.request<AuthResponse>('auth/register', { method: 'POST', body: payload })
  },

  login(payload: LoginRequest): Promise<AuthResponse> {
    return httpClient.request<AuthResponse>('auth/login', { method: 'POST', body: payload })
  },

  currentUser(): Promise<UserResponse> {
    return httpClient.request<UserResponse>('auth/me')
  },
}
