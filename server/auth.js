// Passwords (scrypt hashes, never stored in plain text) and login sessions (http-only cookie).
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { one, run, now } from "./db.js";

export const COOKIE = "pida_session";
const SESSION_DAYS = 7;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password, stored) {
  const [kind, salt, hash] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function passwordProblem(p) {
  if (typeof p !== "string" || p.length < 8) return "The password must be at least 8 characters long.";
  if (p.length > 200) return "The password is too long.";
  return null;
}

const sha = (t) => createHash("sha256").update(t).digest("hex");

export function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  run("DELETE FROM sessions WHERE expires_at < ?", now());
  run("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)", sha(token), userId, now(), expires.toISOString());
  return { token, expires };
}

export function userFromToken(token) {
  if (!token) return null;
  const s = one("sessions", "SELECT user_id, expires_at FROM sessions WHERE token_hash = ?", sha(token));
  if (!s || s.expires_at < now()) return null;
  const u = one("users", "SELECT * FROM users WHERE id = ?", s.user_id);
  return u && u.is_active ? u : null;
}

export const endSession = (token) => token && run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
export const endAllSessions = (userId) => run("DELETE FROM sessions WHERE user_id = ?", userId);

export function readCookie(req, name) {
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// Strips the password hash before a user is sent to the browser.
export const publicUser = (u) => u && { id: u.id, email: u.email, full_name: u.full_name, role: u.role, is_active: !!u.is_active, created_at: u.created_at, updated_at: u.updated_at };
