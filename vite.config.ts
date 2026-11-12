import { defineConfig, type Plugin } from "vite";

// O Chrome só deixa um site da internet (owlbear.rodeo) acessar o localhost
// se o servidor responder com este cabeçalho de "rede privada".
const redeLocal: Plugin = {
  name: "permitir-rede-local",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Private-Network", "true");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
      next();
    });
  },
};

// Caminhos relativos: a extensão funciona tanto em localhost quanto numa subpasta do GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [redeLocal],
  server: { cors: false, port: 5173, host: "localhost" },
  build: {
    rollupOptions: {
      input: { ficha: "index.html", fundo: "background.html" },
    },
  },
});
