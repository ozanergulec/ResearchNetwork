// Bu dosya geriye dönük uyumluluk için korunmuştur.
// Yeni projeler için ayrı servis dosyalarını kullanın:
// - authService.ts
// - userService.ts  
// - publicationService.ts

// Re-export everything for backward compatibility
export { authApi } from './authService';
export type {
  User,
  AuthResponse,
  RegisterData,
  LoginData,
  RegisterResponse,
  VerifyEmailData,
  ForgotPasswordData,
  VerifyResetCodeData,
  ResetPasswordData
} from './authService';

export { usersApi } from './userService';
export type { UpdateUserData } from './userService';

export { publicationsApi } from './publicationService';
export type { Publication } from './publicationService';

// Export the base api client as default
export { default } from './apiClient';
