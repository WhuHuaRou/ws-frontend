import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    base: '/ws-frontend/',
    plugins: [react()],
    server: {
        port: 5173,
    },
});
