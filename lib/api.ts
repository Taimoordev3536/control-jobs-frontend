export function getAuthHeaders() {
  // Add your authentication headers here
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN || ""}`,
    "Content-Type": "application/json",
  }
}
