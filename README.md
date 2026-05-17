# **G4T0XX Music Player**
<img width="1248" height="1248" alt="icone" src="https://github.com/user-attachments/assets/c655bd87-81d0-4619-a8bb-0469fa4afc3c" />

## 🎵 O Player de Música Mais Avançado para Android

Um **aplicativo nativo de streaming de música** construído com React 19, TypeScript e Capacitor 8. O **G4T0XX** oferece uma experiência premium com suporte a múltiplas fontes de áudio e vídeo, modo cinema, letras sincronizadas, equalizador embutido e personalização total sem anúncios.

<br clear="left" />

---

## 🚀 Funcionalidades Principais

### ✨ Experiência de Streaming & Resiliência
*   **Integração Nativa Android:** Utiliza engine nativa baseada no AndroidX Media3 (ExoPlayer) para reprodução super leve, em segundo plano e com suporte total ao Picture-in-Picture (PiP).
*   **Busca Multi-Source com Fallback:** O sistema consulta simultaneamente múltiplos provedores. Se um falhar, o próximo assume automaticamente.
*   **Modo Cinema & Videoclipes:** Assista aos videoclipes com opções de qualidade em HD, alternando entre vídeo e apenas áudio com facilidade, contando com aceleração nativa.
*   **Agregador de Letras:** Consulta automática às bases do LRCLIB, Musixmatch e Lyrics.ovh para exibir letras sincronizadas (.lrc) em tempo real, permitindo personalização de fontes e temas.

### 💾 Offline, Playlists e Biblioteca Local
*   **Download Direto:** Baixe suas faixas e videoclipes favoritos para ouvir offline. Gerenciamento nativo de downloads para maior velocidade.
*   **Músicas Locais:** O G4T0XX consegue escanear e tocar arquivos MP3/FLAC armazenados diretamente no seu dispositivo, mesclando com o streaming.
*   **Importação Universal:** Traga suas playlists do YouTube, Spotify ou Deezer para o G4T0XX. O sistema converte automaticamente os metadados.

### 🎨 Customização & Áudio
*   **Interface Glassmorphism Dinâmica:** Personalização visual completa com ajuste de opacidade, desfoque (blur), e fundos dinâmicos baseados nas capas dos álbuns, imagens da galeria ou vídeos em loop.
*   **Controles de Áudio Profissionais:** 
    *   Equalizador integrado (Bass Boost, Rock, Pop, 8D Audio, etc.).
    *   Controle de velocidade (0.25x até 2.0x).
    *   Controle de qualidade de bit-depth (suporte a áudio de alta resolução).
    *   Integração total com a **Media Session** do Android (controles na tela de bloqueio e fones de ouvido via Bluetooth/cabo).

---

## 📊 Comparação com Concorrentes

| Funcionalidade | G4T0XX | Spotify | YouTube Music |
|---|:---:|:---:|:---:|
| Engine de Áudio Nativa | ✅ | ✅ | ✅ |
| Multi-Source Fallback | ✅ | ❌ | ❌ |
| Modo Cinema (PiP) Nativo | ✅ | ❌ | ✅ |
| Letras Sincronizadas | ✅ | ✅ | ✅ |
| Importar Playlists Externas | ✅ | ❌ | ❌ |
| Customização Visual Extrema | ✅ | ❌ | ❌ |
| Integração com Músicas Locais | ✅ | ✅ | ✅ |
| Sem Anúncios / Grátis | ✅ | ❌ | ❌ |

---

## 🛠️ Stack Tecnológico

| Tecnologia | Versão | Propósito |
|---|---|---|
| **React** | 19.2 | Interface reativa e moderna |
| **Capacitor** | 8.3 | Ponte nativa para Android e plugins essenciais |
| **TypeScript** | 5.6 | Estabilidade e segurança de código |
| **Tailwind CSS** | 4.1 | Design responsivo, animado e veloz |
| **Zustand** | 5.0 | Gerenciamento de estado global leve |
| **Motion** | 12.38 | Animações fluidas de interface |
| **Vite** | 7.1 | Build ultrarrápido para desenvolvimento |

---

## 🚀 Como Iniciar

### Instalação (APK)
1. Baixe o APK mais recente que foi gerado com sucesso na pasta `apk final/g4t0xx-music-player.apk` do projeto ou acesse a [Página de Releases](https://github.com/GABRIELMSORENSEN/G4T0XX-Music-Player/releases).
2. Ative a instalação de fontes desconhecidas no seu Android.
3. Instale o APK no seu celular e aproveite!

### Desenvolvimento Local
```bash
# Clone o repositório
git clone https://github.com/GABRIELMSORENSEN/G4T0XX-Music-Player.git

# Instale as dependências usando pnpm
pnpm install

# Inicie o servidor de desenvolvimento para visualizar a interface no navegador
pnpm dev

# Para compilar o projeto (Frontend)
pnpm run build

# Para sincronizar os arquivos compilados com o Android via Capacitor
npx cap sync android

# Para buildar o APK (Android Studio ou CLI)
cd android
./gradlew assembleDebug
```

---

## 📈 Roadmap

- [x] Transição para Player Nativo Android (ExoPlayer/Media3).
- [x] Reprodução em segundo plano com suporte a controles via Media Session.
- [x] Integração para ler e reproduzir músicas do armazenamento local.
- [ ] Sincronização de playlists entre dispositivos via Nuvem.
- [ ] Suporte a podcasts e feeds RSS.
- [ ] Modo social para compartilhar o que está ouvindo.
- [ ] Versão iOS experimental via Capacitor.

---

👨‍💻 Desenvolvedor
Gabriel Sorensen - @GABRIELMSORENSEN

🎵 Feito com ❤️ para amantes de música
⬇️ Baixar Agora | 📖 Wiki | 💬 Discussões
