export interface User {
  id: number
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
    token: string
  }
  isSuccess: boolean
  statusCode: number
  developerError: string
}

export type UserRole = "Admin" | "Partner" | "Employer" | "Client" | "Worker"
