import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "wheel",
    "compatibilityDate": "2026-11-01",
    "observability": {
      "enabled": true
    }
  }
});
