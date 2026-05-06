# G4T0XX Music Player

Player de musica em React, Vite e Capacitor para Android, com foco em YouTube, modo cinema, biblioteca local, offline, favoritos e personalizacao visual.

## Recursos

- Busca de musicas do YouTube por provedores alternativos.
- Fallback de audio por Cobalt, YT5S, Piped, Invidious, yt-dlp local e Loader.to.
- Modo Cinema com YouTube IFrame rapido, fila/playlist no embed e botao para sair da tela cheia.
- Aba YouTube/Brave com interface do app por cima, busca Brave e atalho de login Google externo.
- Musicas offline e musicas locais integradas na mesma aba.
- Favoritos com remocao por botao de lixeira.
- Preferencias persistentes: tamanho da interface, cores, fundo, icone interno, equalizador, velocidade e aviso de permissoes.
- Icone web e Android gerado a partir de `icone.png`.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- IndexedDB
- Capacitor 8
- Android Gradle

## Requisitos

- Node.js 22 ou superior
- pnpm
- Android Studio ou Android SDK configurado
- Celular Android com depuracao USB ativada para instalar direto pelo terminal

## Rodar no navegador

```bash
pnpm install
pnpm dev
```

## Build web

```bash
pnpm build
```

O build web sai em `dist/public`.

## Sincronizar Android

```bash
pnpm build
pnpm exec cap sync android
```

## Gerar APK pelo terminal

```bash
cd android
./gradlew.bat :app:assembleDebug
```

APK gerado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Instalar no celular via USB

Com o celular conectado e autorizado:

```bash
adb devices
cd android
./gradlew.bat :app:installDebug
```

Para abrir o app:

```bash
adb shell monkey -p com.g4t0xx.musicplayer 1
```

## Build pelo Android Studio

1. Rode `pnpm build`.
2. Rode `pnpm exec cap sync android`.
3. Abra a pasta `android` no Android Studio.
4. Use `File > Sync Project with Gradle Files`.
5. Use `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

## Icones

O arquivo fonte do icone do app fica em:

```text
icone.png
```

Os icones web ficam em `client/public/`.
Os icones Android ficam em `android/app/src/main/res/mipmap-*`.

## Observacoes

- Login Google dentro de iframe pode ser bloqueado pelo proprio Google/YouTube. Por isso a aba YouTube/Brave tambem inclui botao de login externo.
- O player de audio nativo continua existindo para tocar com a tela desligada. O modo cinema adiciona o caminho rapido por YouTube IFrame sem remover os provedores antigos.
