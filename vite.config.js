import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a *project* page, from /Worklings-V2/ rather
  // than the domain root, so built asset URLs need that prefix or every
  // request 404s. Dev keeps '/' so localhost URLs stay as they were.
  base: command === 'build' ? '/Worklings-V2/' : '/',
}));
