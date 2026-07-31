/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // db.json is the runtime data store written by the backend on every
      // answer. It is loaded via the API (not imported into the module
      // graph), so exclude it from Vite's watcher to avoid a full page
      // reload after each question.
      ignored: ["**/src/data/db.json"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
