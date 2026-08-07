import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { connectToDatabase, disconnectFromDatabase } from '../config/db.js';
import { PASSWORD_MIN_LENGTH } from '../modules/auth/auth.schema.js';
import { User } from '../modules/users/user.model.js';
import { DEFAULT_LOCALE } from '../shared/vocabulary.js';

/**
 * Provisions an admin account.
 *
 * Admins are never self-served, so this is the only way one comes into
 * existence. Values come from ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD when
 * set (for scripted setup), and are prompted for otherwise.
 *
 *   npm run build && node dist/scripts/create-admin.js
 */

const inputSchema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  email: z.email('That is not a valid email address.').max(254).trim().toLowerCase(),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(128)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include at least one letter and one number.'),
});

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const displayName = process.env.ADMIN_NAME ?? (await rl.question('Admin name: '));
    const email = process.env.ADMIN_EMAIL ?? (await rl.question('Admin email: '));
    const password =
      process.env.ADMIN_PASSWORD ??
      (await rl.question(`Admin password (min ${PASSWORD_MIN_LENGTH} chars, letters + numbers): `));

    const parsed = inputSchema.safeParse({ displayName, email, password });

    if (!parsed.success) {
      console.error('\nCould not create the admin:');
      for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
      }
      process.exitCode = 1;
      return;
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: parsed.data.email });

    if (existing) {
      // Silently promoting an existing account would be a privilege escalation
      // hiding inside a setup script.
      console.error(
        `\nAn account already exists for ${parsed.data.email} (role: ${existing.role}). ` +
          'Refusing to modify it — use a different address.',
      );
      process.exitCode = 1;
      return;
    }

    const passwordHash = await User.hashPassword(parsed.data.password);

    const admin = await User.create({
      displayName: parsed.data.displayName,
      email: parsed.data.email,
      passwordHash,
      role: 'admin',
      status: 'active',
      locale: DEFAULT_LOCALE,
    });

    console.log(`\nAdmin created: ${admin.email} (id ${String(admin.id)})`);
  } finally {
    rl.close();
    await disconnectFromDatabase().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error('Failed to create the admin:', error);
  process.exit(1);
});
