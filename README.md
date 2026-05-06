# **G4T0XX Music Player**
# <img width="1248" height="1248" alt="icone" src="https://github.com/user-attachments/assets/c655bd87-81d0-4619-a8bb-0469fa4afc3c" />


## 🎵 O Player de Música Mais Avançado para Android

Um **aplicativo nativo de streaming de música** construído com React 19, TypeScript e Capacitor 7. O **G4T0XX** oferece uma experiência premium com suporte a múltiplas fontes, modo cinema, letras sincronizadas e personalização total sem anúncios.

<br clear="left" />

---

## 🚀 Funcionalidades Principais

### ✨ Experiência de Streaming & Resiliência
*   **Busca Multi-Source com Fallback:** O sistema consulta simultaneamente múltiplos provedores (Cobalt, Piped, Invidious, YT5S). Se um falhar, o próximo assume automaticamente.
*   **Modo Cinema:** Assista aos videoclipes em HD (360p a 1080p) com sincronização perfeita e suporte a **Picture-in-Picture (PiP)**.
*   **Agregador de Letras:** Consulta automática às bases do LRCLIB, Musixmatch e Lyrics.ovh para exibir letras sincronizadas (.lrc) em tempo real.

### 💾 Offline e Playlists
*   **Download Direto:** Baixe suas faixas favoritas para ouvir offline usando armazenamento inteligente em IndexedDB.
*   **Importação Universal:** Traga suas playlists do Spotify ou Deezer para o G4T0XX. O sistema converte automaticamente os metadados para streaming via YouTube.

### 🎨 Customização & Áudio
*   **Interface Glassmorphism:** Personalização visual completa com ajuste de opacidade, blur, e fundos dinâmicos (imagem ou vídeo).
*   **Controles de Áudio Profissionais:** 
    *   Equalizador de 11 bandas (Bass Boost, Rock, Pop, 8D Audio, etc.).
    *   Controle de velocidade (0.5x até 2.0x).
    *   Integração total com a **Media Session** do Android (controles na tela de bloqueio e fones).

---

## 📊 Comparação com Concorrentes

| Funcionalidade | G4T0XX | Spotify | YouTube Music |
|---|:---:|:---:|:---:|
| Multi-Source Fallback | ✅ | ❌ | ❌ |
| Modo Cinema (PiP) | ✅ | ❌ | ✅ |
| Letras Sincronizadas | ✅ | ✅ | ✅ |
| Importar Playlists | ✅ | ❌ | ❌ |
| Personalização Visual | ✅ | ❌ | ❌ |
| Sem Anúncios / Grátis | ✅ | ❌ | ❌ |

---

## 🛠️ Stack Tecnológico

| Tecnologia | Versão | Propósito |
|---|---|---|
| **React** | 19.0 | Interface reativa e moderna |
| **Capacitor** | 7.0 | Ponte nativa para Android |
| **TypeScript** | 5.8 | Estabilidade e segurança de código |
| **Tailwind CSS** | 4.1 | Design responsivo e rápido |
| **Zustand** | 5.0 | Gerenciamento de estado leve |
| **Motion** | 12.3 | Animações fluidas de interface |

---

## 🚀 Como Iniciar

### Instalação (APK)
1. Baixe o APK mais recente na [Página de Releases](https://github.com/POLIGONON/g4t0xx-music-player/releases).
2. Ative a instalação de fontes desconhecidas no seu Android.
3. Instale e aproveite suas músicas favoritas!

### Desenvolvimento Local
```bash
# Clone o repositório
git clone [https://github.com/POLIGONON/g4t0xx-music-player.git](https://github.com/POLIGONON/g4t0xx-music-player.git)

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev

# Para buildar o Android
pnpm cap sync android
📈 Roadmap
[ ] Sincronização de playlists entre dispositivos via Nuvem.

[ ] Suporte a podcasts e feeds RSS.

[ ] Modo social para compartilhar o que está ouvindo.

[ ] Versão iOS experimental via Capacitor.

👨‍💻 Desenvolvedor
Gabriel Sorensen - @GABRIELMSORENSEN

🎵 Feito com ❤️ para amantes de música
⬇️ Baixar Agora | 📖 Wiki | 💬 Discussões
