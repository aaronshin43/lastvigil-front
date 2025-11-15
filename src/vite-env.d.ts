/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VULTR_SERVER_IP: string
  readonly VITE_VULTR_SERVER_PORT: string
  readonly VITE_VULTR_SERVER_URL: string
  readonly VITE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
