import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  plainText: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function hashRefreshToken(token: string): Promise<string> {
  const sha256 = crypto.createHash('sha256').update(token).digest('hex');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(sha256, salt);
}

export async function compareRefreshToken(
  token: string,
  hash: string,
): Promise<boolean> {
  const sha256 = crypto.createHash('sha256').update(token).digest('hex');
  return bcrypt.compare(sha256, hash);
}
