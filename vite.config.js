import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// While editing ("npm run dev"), the website runs on Vite and passes API and file requests
// to the local PIDA server (server/index.js), which must be running on port 3000.
const target = `http://localhost:${process.env.PORT || 3000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": target,
      "/uploads": target,
    },
  },
});
