// Development-only sample recipients. Passwords are represented as bcrypt
// hashes, matching the account table's storage format.
export const demoRecipients = [
  {
    id: 'demo-jahnvi-recipient',
    name: 'Jahnvi',
    email: 'iamjahnvidwivedi@gmail.com',
    kiwiId: 'kiwi-625d76789f',
    role: 'recipient' as const,
    passwordHash: '$2b$12$KTExJnN4XeMNmp4PiKXOVez4STgsSiNgF/PJIfk20PweTA2cVtNyC',
    createdAt: '2026-10-22T00:00:00.000Z',
  },
]
