#!/bin/sh
# Vercel derlemesi: oyun dosyalarını bu deponun belirli bir sürümünden (SHA) indirir,
# arkadaş sıralaması işlevini (api/lb) kurar. Kullanım: SHA=<commit> sh vercel/build.sh
set -e
R="https://raw.githubusercontent.com/kaanini870/muhbir/$SHA"
O=.vercel/output; S=$O/static; F=$O/functions/api/lb.func
rm -rf $O; mkdir -p $S/models $F
curl -fsS --retry 3 "$R/files.txt" -o files.txt
while read f; do [ -n "$f" ] && curl -fsS --retry 3 "$R/$f" -o "$S/$f"; done < files.txt
curl -fsS --retry 3 "$R/api/lb.bundle.mjs" -o $F/index.mjs
printf '{"runtime":"nodejs22.x","handler":"index.mjs","launcherType":"Nodejs","shouldAddHelpers":false,"maxDuration":10}' > $F/.vc-config.json
curl -fsS --retry 3 "$R/vercel/config.json" -o $O/config.json
echo "files $(wc -l < files.txt) static $(du -sh $S | cut -f1)"; sha1sum $S/index.html $S/game.js $F/index.mjs
