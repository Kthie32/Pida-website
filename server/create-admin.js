// Creates a super administrator, or resets the password of an existing account and makes it an active super admin.
// Usage:  npm run create-admin -- email@example.com "Password" "Full Name"
import { one, insert, update, now, uuid } from "./db.js";
import { hashPassword, passwordProblem, endAllSessions } from "./auth.js";

const [emailRaw, password, ...nameParts] = process.argv.slice(2);
const email = String(emailRaw || "").trim().toLowerCase();
const full_name = nameParts.join(" ").trim();

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
  console.error('Usage: npm run create-admin -- email@example.com "Password" "Full Name"');
  process.exit(1);
}
const problem = passwordProblem(password);
if (problem) { console.error(problem); process.exit(1); }

const existing = one("users", "SELECT * FROM users WHERE email = ?", email);
const t = now();
if (existing) {
  update("users", existing.id, { password_hash: hashPassword(password), role: "super_admin", is_active: true, ...(full_name && { full_name }), updated_at: t });
  endAllSessions(existing.id);
  console.log(`Password reset: ${email} is an active super administrator.`);
} else {
  insert("users", { id: uuid(), email, full_name, role: "super_admin", is_active: true, password_hash: hashPassword(password), created_at: t, updated_at: t });
  console.log(`Created: ${email} is an active super administrator.`);
}
