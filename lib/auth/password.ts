/**
 * Wave 3A — server-only password hash helper for transient
 * partner_pending_credentials. We use Node's built-in scrypt so we don't
 * pull a new dependency just for the wizard → activation flow.
 *
 * Format stored: `scrypt$<saltHex>$<keyHex>` (one synchronous parse).
 * The hash is consumed once at admin activation, then deleted.
 *
 * Server-only — never imported into the browser bundle.
 */

import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import "server-only"

const scrypt = promisify(_scrypt) as unknown as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEYLEN = 64
const SALT_BYTES = 16

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length < 8) {
    throw new Error("password_too_short")
  }
  const salt = randomBytes(SALT_BYTES)
  const key = await scrypt(plain, salt, KEYLEN)
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored?.startsWith("scrypt$")) return false
  const [, saltHex, keyHex] = stored.split("$")
  if (!saltHex || !keyHex) return false
  const salt = Buffer.from(saltHex, "hex")
  const key = Buffer.from(keyHex, "hex")
  const candidate = await scrypt(plain, salt, key.length)
  if (candidate.length !== key.length) return false
  return timingSafeEqual(candidate, key)
}
