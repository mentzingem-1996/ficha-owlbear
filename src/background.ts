import OBR from "@owlbear-rodeo/sdk";
import { CANAL_ROLAGEM } from "./armazenamento";

// Roda escondido para todo mundo que tem a extensão: mostra as rolagens dos outros jogadores.
OBR.onReady(() => {
  OBR.broadcast.onMessage(CANAL_ROLAGEM, (e) => {
    const texto = (e.data as { texto?: string })?.texto;
    if (texto) void OBR.notification.show(texto, "INFO");
  });
});
