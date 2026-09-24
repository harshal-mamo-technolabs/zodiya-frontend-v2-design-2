/* Static artwork lives on S3, not in /public, so the app bundle stays small
   and the same files serve every environment. Object keys mirror the old
   /public layout: tarot/<card id>.jpg and avatar/avatar-NN.jpg. */
const BASE = 'https://testbrain-buzzinga.s3.eu-north-1.amazonaws.com/meridian';

export const tarotImage = id => `${BASE}/tarot/${id}.jpg`;

export const AVATARS = Array.from({ length: 12 }, (_, i) => `avatar-${String(i + 1).padStart(2, '0')}`);
export const avatarImage = id => `${BASE}/avatar/${id}.jpg`;
