# MUHBİR

Birinci şahıs, Türkçe "papaz kaçtı" tarzı soygun kart oyunu (three.js). Tarayıcıda çalışır; çevrimiçi odalar herkese açık MQTT aracıları üzerinden kurulur.

Bu depo yalnızca yayınlanan oyun dosyalarını içerir (Vercel bu dosyaları sunar).

## Yapı

- `index.html`, `game.js`: oyun (kaynaktan esbuild ile derlenir).
- `models/*.glb`: meshopt ile sıkıştırılmış modeller; `sfx.bin`/`voices.bin` + `.idx.json`: ses paketleri. Hepsi `?v=` sürümüyle istenir, bu yüzden bir yıl önbellekte kalır.
- `api/lb.mjs`: arkadaş sıralaması işlevi (ekip kodu başına bir JSON, özel Vercel Blob deposu). `api/lb.bundle.mjs` aynı kodun bağımlılıklarıyla paketlenmiş hâli.
- `vercel/build.sh` ve `vercel/config.json`: Vercel derlemesi bu depodan belirli bir sürümü indirir; önbellek başlıkları `config.json`'da.
- `files.txt`: yayınlanacak statik dosyaların listesi.
