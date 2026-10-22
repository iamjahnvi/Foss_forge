export type AccountRole = 'sender' | 'recipient'

export type AccountProfile = {
  id: string
  name: string
  email: string
  kiwiId: string
  role: AccountRole
  createdAt: string
}
