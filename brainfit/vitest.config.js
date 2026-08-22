import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  plugins: [
    {
      name: 'mock-cdn-imports',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('.js') && code.includes('https://www.gstatic.com/firebasejs/')) {
          return {
            code: code.replace(/from\s+["']https:\/\/www\.gstatic\.com\/firebasejs\/[^"']+["']/g, 'from "vitest-mock-firebase"'),
            map: null
          };
        }
      },
      resolveId(source) {
        if (source === 'vitest-mock-firebase') {
          return '\0vitest-mock-firebase';
        }
      },
      load(id) {
        if (id === '\0vitest-mock-firebase') {
          return `
            export const initializeApp = () => ({});
            export const getAuth = () => ({});
            export const GoogleAuthProvider = class {};
            export const signInWithPopup = async () => ({ user: {} });
            export const getFirestore = () => ({});
            export const collection = () => ({});
            export const doc = () => ({});
            export const setDoc = async () => {};
            export const getDoc = async () => ({ exists: () => false, data: () => ({}) });
            export const query = () => ({});
            export const where = () => ({});
            export const orderBy = () => ({});
            export const limit = () => ({});
            export const getDocs = async () => [];
            export const serverTimestamp = () => new Date();
          `;
        }
      }
    }
  ]
})


