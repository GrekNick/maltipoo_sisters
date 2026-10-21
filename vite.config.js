import { fileURLToPath } from 'node:url';

export default {
  base: '/maltipoo_sisters/',
  build: {
    assetsDir: 'assets',
    // Ensure all assets are included in the build
    assetsInclude: ['**/*.png'],
    rollupOptions: {
      // Two pages: the game, and the privacy notice (plain HTML, linked from the title screen and README)
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('privacy.html', import.meta.url)),
      },
    },
  }
}
