// ─── Central server config ────────────────────────────────────────────────────
//
// PRODUCTION: Replace RENDER_URL below with your actual Render.com URL
//             after deploying the server. It looks like:
//             https://behappytalk-server.onrender.com
//
// LOCAL DEV:  Set EXPO_PUBLIC_API_URL in a .env file to override.

const RENDER_URL = 'https://behappytalk-server.onrender.com';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `${RENDER_URL}/api`;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || RENDER_URL;
