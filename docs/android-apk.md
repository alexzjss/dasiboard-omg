# APK Android (TWA) do daSIboard

O workflow `.github/workflows/android-apk.yml` gera um APK **assinado** que abre https://dasiboard.vercel.app como Trusted Web Activity (pacote `app.vercel.dasiboard.twa`). Sem Play Store: o APK vai para as Releases do GitHub.

## 1. Criar o keystore (uma única vez)

Guarde o arquivo e as senhas em local seguro: sem a mesma chave não dá para atualizar o app instalado.

```bash
keytool -genkeypair -v -keystore dasiboard.keystore -alias dasiboard \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 dasiboard.keystore > dasiboard.keystore.b64   # macOS: base64 -i dasiboard.keystore
```

## 2. Secrets do repositório

Em *Settings → Secrets and variables → Actions → New repository secret*:

| Secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | conteúdo de `dasiboard.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | senha do keystore |
| `ANDROID_KEY_ALIAS` | `dasiboard` (alias usado acima) |
| `ANDROID_KEY_PASSWORD` | senha da chave |

## 3. Publicar uma versão

```bash
git tag v1.0.0 && git push origin v1.0.0
```

A tag `vX.Y.Z` vira `versionName` X.Y.Z; o `versionCode` é o `run_number` do workflow. A release recebe o APK (`dasiboard-X.Y.Z.apk`) e o `assetlinks.json`. Também é possível rodar manualmente (*Actions → Run workflow*): nesse caso o APK fica só como artifact do workflow.

Pushes que alteram `android/`, o workflow, o manifest ou os ícones também disparam um build de teste. Sem os secrets, ele assina com uma chave temporária: serve para validar o pipeline, não para distribuir (uma tag `v*` sem secrets falha de propósito).

## 4. Digital Asset Links (remove a barra de URL)

O `public/.well-known/assetlinks.json` está com o placeholder `REPLACE_WITH_SHA256_FINGERPRINT`. **Enquanto não for substituído, o app mostra a barra de URL do Chrome.**

1. Abra o *job summary* da execução (ou baixe o artifact/asset `assetlinks.json`): ele mostra o fingerprint SHA-256 do certificado e o JSON completo.
2. Copie o conteúdo para `public/.well-known/assetlinks.json`, faça commit e deploy na Vercel.
3. Confira: `https://dasiboard.vercel.app/.well-known/assetlinks.json` deve responder JSON. Reinstale/abra o app (o Android pode demorar a revalidar).

A Vercel serve arquivos de `public/` antes dos rewrites, então o `vercel.json` não precisa de ajustes.

## 5. Instalar no celular

1. Baixe o `.apk` em *Releases* no celular.
2. Ao abrir, permita instalar de **fontes desconhecidas** para o navegador/gerenciador de arquivos usado.
3. Para notificações, conceda a permissão de notificações ao app.

### Atualizações automáticas (opcional)

Instale o [Obtainium](https://github.com/ImranR98/Obtainium), adicione o app com a URL do repositório GitHub e ele passará a avisar/instalar novas releases.

## 6. Quando gerar um novo APK

O conteúdo web atualiza a cada deploy na Vercel; **não** precisa de novo APK. Só gere uma nova versão ao mudar nome, ícones, cores ou configurações do TWA (`android/twa-manifest.json`). Os ícones do app Android vêm de `public/icons/icon-512.png` e `icon-maskable-512.png` do próprio repositório (servidos localmente por `android/generate.mjs` durante o build).
