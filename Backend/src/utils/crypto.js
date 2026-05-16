import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production');
    }
    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'autogit-dev-key').digest();
  }

  if (/^[a-f0-9]{64}$/i.test(key)) {
    return Buffer.from(key, 'hex');
  }

  return crypto.createHash('sha256').update(key).digest();
};

export const encryptSecret = (value) => {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  };
};

export const decryptSecret = ({ encrypted, iv, tag }) => {
  if (!encrypted || !iv || !tag) return null;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final()
  ]).toString('utf8');
};

export const maskSecret = (value) => {
  if (!value) return '';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};
