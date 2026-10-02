import { httpClient } from '@/api/HttpClient'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SetParentalPinRequest,
  UserResponse,
  ValidateParentalPinRequest,
  ValidateParentalPinResponse,
} from '@/types/api'

export const authApi = {
  register(payload: RegisterRequest): Promise<AuthResponse> {
    return httpClient.request<AuthResponse>('auth/register', { method: 'POST', body: payload })
  },

  login(payload: LoginRequest): Promise<AuthResponse> {
    return httpClient.request<AuthResponse>('auth/login', { method: 'POST', body: payload })
  },

  currentUser(signal?: AbortSignal): Promise<UserResponse> {
    return httpClient.request<UserResponse>('auth/me', { signal })
  },

  setParentalPin(payload: SetParentalPinRequest): Promise<UserResponse> {
    return httpClient.request<UserResponse>('auth/parental-pin', { method: 'PUT', body: payload })
  },

  validateParentalPin(payload: ValidateParentalPinRequest): Promise<ValidateParentalPinResponse> {
    return httpClient.request<ValidateParentalPinResponse>('auth/parental-pin/validate', {
      method: 'POST',
      body: payload,
    })
  },
}
