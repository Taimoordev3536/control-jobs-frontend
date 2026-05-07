export interface User {
  id: number
  publicId: string
  name: string
  email: string
  firstName: string | null
  lastName: string | null
  roleId: number
  partnerId: number | null
  createdAt: string
  updatedAt: string
  role: {
    id: number
    name: string
    value: number
    createdAt: string
    updatedAt: string
  }
}

export interface LoginResponse {
  message: string
  data: {
    user: User
    accessToken: string
    refreshToken: string
    accessExpiresIn: number
    token: string
  }
  isSuccess: boolean
  statusCode: number
  developerError: string
}

export interface RefreshResponse {
  message: string
  data: {
    accessToken: string
    refreshToken: string
    accessExpiresIn: number
  }
  isSuccess: boolean
  statusCode: number
  developerError: string
}

export type UserRole = "Admin" | "Partner" | "Employer" | "Client" | "Worker"
