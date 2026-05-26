import bcrypt from "bcryptjs";

// Cost factor 12 is a reasonable 2026 default for interactive logins.
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimum password policy enforced at registration. */
export function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= 10 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw)
  );
}
