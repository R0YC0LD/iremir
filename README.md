# Küçük Bir Köşe — kişisel anı defteri sitesi

Tek sayfalık, tamamen statik (HTML + CSS + Vanilla JS) bir site. Sunucu, veritabanı, npm veya build gerektirmez. GitHub Pages'te doğrudan çalışır.

Bölümler: **Kapı (müzik seçeneği) → Açılış → Mektup → 56 parçalık yapboz → Fotoğraf galerisi → Kapanış**

---

## Dosyalar ne işe yarar?

```
index.html            Sayfa iskeleti. Yazılar buradan değil config.js'ten gelir.
css/style.css         Tüm tasarım (renkler en üstteki :root bloğunda).
css/fonts.css         Yazı tipleri (assets/fonts içinden, internet gerekmez).
js/config.js          ★ SENİN DOSYAN: tüm yazılar, fotoğraf listesi, müzik, tarih.
js/main.js            Müzik, mektup animasyonu, galeri, lightbox, scroll efektleri.
js/puzzle.js          56 parçalık yapboz motoru.
assets/puzzle-photo.jpg   Yapboz fotoğrafı.
assets/music.mp3          Arka plan müziği.
assets/photos/            Galeri fotoğrafları.
assets/fonts/             Yazı tipi dosyaları.
```

---

## Mesajları nerede düzenlerim?

Hepsi **`js/config.js`** içinde, Türkçe yorumlarla:

| Ne | Config'teki yeri |
|---|---|
| Sekme başlığı | `meta.pageTitle` |
| Alıcı / gönderen adı | `names.to`, `names.from` |
| Açılış perdesi yazıları | `gate` |
| Açılış başlığı, alt yazı | `hero.titleLines`, `hero.whisper`, `hero.subtitle` |
| Mektup başlığı, hitap, paragraflar, imza | `letter.title`, `letter.greeting`, `letter.paragraphs`, `letter.signature` |
| Yapboz başlığı ve tamamlanma mesajı | `puzzle.title`, `puzzle.completion` |
| Galeri fotoğrafları ve anı yazıları | `gallery.photos` |
| Kapanış mesajı, imza, tarih | `closing.lines`, `closing.text`, `closing.signature`, `closing.date` |
| Müzik dosyası ve şarkı adı | `music.file`, `music.title`, `music.artist` |

İpuçları: `{to}` ve `{from}` yazdığın yere alıcı/gönderen adı gelir. Başlıklarda `*kelime*` yazarsan o kelime italik ve bordo olur.

---

## Fotoğrafları nereye koyarım?

1. Galeri fotoğraflarını **`assets/photos/`** klasörüne at.
2. `js/config.js` içindeki `gallery.photos` listesine bir satır ekle:

```js
{ src: "assets/photos/yeni-foto.jpg", alt: "Kısa tanım", date: "Mart 2026", caption: "O gün çok güldük." },
```

Başka bir şey gerekmez. Fotoğraflar kendi oranını korur, düzen otomatik ayarlanır. Dosya adında boşluk ve Türkçe karakter kullanmamaya çalış (`foto-05.jpg` gibi). Fotoğrafları yüklemeden önce uzun kenarı ~1600 px'e küçültmen sayfanın hızlı açılmasını sağlar.

## Yapboz fotoğrafını nasıl değiştiririm?

1. Yeni fotoğrafı **`assets/puzzle-photo.jpg`** adıyla üzerine yaz (dikey 3:4 oran en iyisidir; oran bozulmaz, parçalar fotoğrafa göre otomatik üretilir).
2. Farklı bir ad kullanacaksan `js/config.js` → `puzzle.image` satırını güncelle.
3. Parça şekillerini değiştirmek istersen `puzzle.seed` sayısını değiştir. Parça sayısı `puzzle.columns` x `puzzle.rows` (7 x 8 = 56).

Tarayıcı ilerlemeyi hatırlar. Yeni fotoğraf koyduktan sonra "Baştan başla" butonuna bas ya da `seed` değiştir.

## Müzik dosyasını nasıl değiştiririm?

1. Yeni `.mp3` dosyasını **`assets/music.mp3`** olarak kaydet (ya da başka bir adla `assets/` içine koy).
2. `js/config.js` → `music.file`, `music.title`, `music.artist` alanlarını güncelle.

Müzik ilk kaydırma/dokunuşta kendiliğinden başlar (tarayıcılar hiç etkileşim olmadan ses çaldırmaz; bazı tarayıcılarda ilk dokunuş ya da tıklama gerekebilir). Sağ alttaki düğmeden her zaman açılıp kapanır, ses ayarı yapılabilir (iPhone ses ayarını sistem tuşlarından yapar). Açılış perdesini geri istersen `gate.enabled: true` yap.

---

## GitHub Pages'te nasıl yayımlarım?

1. [github.com](https://github.com) hesabına gir → sağ üstte **+ → New repository**. Bir ad ver (ör. `sana-bir-sey`), **Public** seç, **Create repository**.
2. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
3. Bu klasörün **içindekileri** (`index.html`, `css`, `js`, `assets`, `README.md`) sürükleyip bırak. `index.html` deponun ana dizininde olmalı.
   - Aşağıdaki **orijinal dosyaları yükleme** (zaten `assets/` içine optimize edilip alındılar): `WhatsApp Image ... .jpeg`, `Cem Adrian ... .mp3`, `fotograf_yapboz_10x12_120_parca/`. Klasörde hazır bir `.gitignore` var; Git kullanırsan bunları kendiliğinden dışarıda bırakır.
4. **Commit changes** düğmesine bas.
5. Depoda **Settings → Pages**. *Build and deployment* altında **Source: Deploy from a branch**, **Branch: main** ve **/(root)** seç, **Save**.
6. 1-2 dakika bekle. Aynı sayfanın üstünde `https://KULLANICIADIN.github.io/sana-bir-sey/` adresi belirir. Linki sevgiline gönder.

Güncelleme yapmak için dosyayı GitHub'da açıp kalem simgesiyle düzenleyebilir (özellikle `js/config.js`) ya da yeni dosyayı aynı adla yükleyebilirsin. Değişiklik 1-2 dakikada yayına girer.

Yerelde denemek için: klasörde `python -m http.server 8000` çalıştırıp `http://localhost:8000` adresini aç. (`index.html`'e çift tıklamak da büyük ölçüde çalışır, ama bazı tarayıcılar yerel dosyadan müzik ve fotoğrafı kısıtlayabilir.)

---

## Örnek kişiselleştirme

`js/config.js` içinde şu alanları değiştir:

```js
names: { to: "Elif", from: "Can" },

letter: {
  // ...
  greeting: "Sevgili {to},",          // → "Sevgili Elif,"
  paragraphs: [
    "Dün akşam söylediklerim için çok üzgünüm.",
    "Seni kırmak son istediğim şeydi; ama kırdım ve bunu düzeltmek istiyorum.",
    "Bana bir şans daha verirsen, sana kahveni yaparak güne başlamak istiyorum."
  ],
  signature: "{from}"                 // → "Can"
},

puzzle: {
  completion: {
    title: "Bak, bütün parçalar yeniden bir araya geldi.",
    text: "İkimizin de hatalarına rağmen en güzel resim yine birlikte olduğumuz resim."
  }
},

gallery: {
  photos: [
    { src: "assets/photos/foto-05.jpg", alt: "Sahilde", date: "Haziran 2025", caption: "İlk tatilimiz." }
  ]
},

closing: { date: "14 Şubat 2027" }
```

Kaydet, sayfayı yenile; hepsi güncellenir.

---

## Renkleri / hissi değiştirmek

`css/style.css` dosyasının en üstündeki `:root` bloğunda `--wine` (bordo), `--paper` (krem), `--ink` (yazı rengi) gibi değişkenler var. Hareketi azalt ayarı (`prefers-reduced-motion`) açık olan cihazlarda animasyonlar otomatik sadeleşir.

## Yapboz nasıl oynanır?

- **Sürükle:** Parçayı tut, yapboz alanındaki yerine bırak. Doğruysa yerine oturur ve kilitlenir; yanlışsa parça alanına geri döner.
- **Dokun-yerleştir:** Parçaya dokun (seçilir), sonra yapboz alanında yerleştirmek istediğin kareye dokun.
- **Telefonda:** Parça şeridi yatay kayar. Parçayı **yukarı doğru sürükle** ya da parmağını parçanın üstünde **bir an basılı tut** ve sürükle.
- **Kenarlar** düğmesi sadece kenar/köşe parçalarını gösterir. **Kılavuz** kesim çizgilerini, **Fotoğrafı göster** soluk bir önizlemeyi açar.
