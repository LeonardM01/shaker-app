import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { workflow } from 'workflow/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // workflow() first, so the "use workflow" / "use step" transforms run before
  // any other plugin sees the file.
  plugins: [workflow(), devtools(), nitro(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
