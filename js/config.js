/* =====================================================================
   BURASI SİTENİN KONTROL MERKEZİ
   ---------------------------------------------------------------------
   Sitedeki bütün yazılar, fotoğraflar, müzik ve tarih buradan değişir.
   index.html, style.css, main.js veya puzzle.js dosyalarına dokunmana
   gerek yok. Sadece tırnak ("...") içindeki yazıları değiştir.

   İPUÇLARI
   - Tırnak işareti içinde tırnak kullanacaksan başına ters eğik çizgi
     koy:  "Ona \"merhaba\" dedim"
   - Her satırın sonundaki virgülü silme.
   - Bir paragraf = mektup listesindeki bir satır.
   - Vurgulu (italik, bordo) kelime için yazıyı *yıldız* içine al:
     "Sana *çok* özür borçluyum"   (sadece başlıklarda çalışır)
   ===================================================================== */

window.SITE = {

  /* ---------- GENEL ---------- */
  meta: {
    pageTitle: "Sana bir şey anlatmak istedim",   // tarayıcı sekmesindeki başlık
    description: "Küçük bir köşe, sadece ikimiz için.",
    language: "tr"
  },

  /* ---------- KİMDEN KİME ---------- */
  names: {
    to:   "İrem",       // alıcının adı
    from: "Emir"       // gönderenin adı (imzalarda görünür)
  },

  /* ---------- 0) KAPI (ilk açılış perdesi) ----------
     Tarayıcılar sesi kendiliğinden çaldırmaya izin vermez. Bu perde,
     müziği başlatmak için kullanıcıya nazik bir seçenek sunar.
     enabled: false yaparsan perde hiç çıkmaz (müzik sağ alttaki
     düğmeden elle açılır). */
  gate: {
    enabled: false,   // false = perde yok, site doğrudan açılır
    kicker: "Sadece senin için",
    title: "Bir şey hazırladım",
    withMusic: "Müzikle gir",
    withoutMusic: "Sessiz devam et",
    hint: "Daha güzel bir deneyim için sesini aç."
  },

  /* ---------- 1) AÇILIŞ EKRANI ---------- */
  hero: {
    kicker: "Emir'den İrem'e",
    // Başlık satırları. Her satır sırayla belirir.
    // *Yıldızlı* kelimeler italik ve bordo olur.
    titleLines: [
      "Biraz durup",
      "sana bir şey",
      "anlatmak *istedim.*"
    ],
    whisper: "Bazı şeyleri kelimelere dökmek kolay değil...",
    subtitle: "Bu küçük köşe, bizim için.",
    scrollLabel: "Aşağı kaydır",
    // Açılıştaki çerçeveli fotoğraf. Boş bırakırsan ("") fotoğraf görünmez.
    photo: "assets/photos/foto-03.jpg",
    photoAlt: "İrem ve Emir",
    photoCaption: "Fotoğraf No. 01",
    year: "2026"
  },

  /* ---------- 2) MEKTUP ---------- */
  letter: {
    sectionNumber: "I",
    sectionLabel: "Mektup",
    envelopeHint: "Mührü açmak için dokun",
    // Mühürün üstünde görünen tek harf (boş bırakırsan adından alınır)
    sealLetter: "",
    title: "Sana söylemek istediklerim...",
    greeting: "{to},",                  // {to} = names.to  (ör. "Sevgili {to},")
    // Mektubun paragrafları. Her satır ayrı bir paragraf olur.
    paragraphs: [
      "\"Senden hayal kırıklığısın\" lafını duymak canımı çok yaktı. Ama bu duyguyu sana hissettirdiğim için pişmanım, hem de çok pişmanım.",
      "Senin benden beklentini, bana olan inancını ve bana verdiğin değeri biliyorum. Buna rağmen seni bu noktaya getirecek bir yalan söylemiş olmak beni gerçekten çok üzüyor.",
      "Bunu sadece geçiştirmek ya da \"özür dilerim\" deyip kapatmak için yazmıyorum. Yaptığım hatayı, seni nerede eksik hissettirdiğimi çok iyi anladım.",
      "Sen benim için sadece bir ilişki değilsin, hayat arkadaşımsın. Senin güvenini ve saygını kaybetmek, kabullenmek istediğim bir şey değil.",
      "Senden hemen her şeyi unutmanı beklemiyorum. Kızgınlığının ve kırgınlığının farkındayım. Ama sadece beni dinlemene ve bu durumu gerçekten telafi etmeme bir şans vermeni istiyorum.",
      "Bana bunu çok görme, lütfen."
    ],
    closing: "Hep seninle,",
    signature: "{from}",               // {from} = names.from
    // Yazı animasyonu: kelimeler tek tek belirir.
    typewriter: true,
    wordDelayMs: 38,                    // ne kadar küçükse o kadar hızlı
    skipLabel: "Hepsini göster"
  },

  /* ---------- 3) YAPBOZ ---------- */
  puzzle: {
    sectionNumber: "II",
    sectionLabel: "Yapboz",
    title: "Dağılan parçaları *birlikte* toplayalım",
    intro: "56 küçük parça. Her biri bir anının köşesi. Parçayı sürükleyip doğru yerine bırak; ya da dokun, sonra yerleştirmek istediğin yere dokun.",
    image: "assets/puzzle-photo.jpg",   // yapboz fotoğrafı (3:4 dikey önerilir)
    columns: 7,                         // sütun sayısı  (7 x 8 = 56 parça)
    rows: 8,                            // satır sayısı
    seed: 1907,                         // parça şekillerini değiştirmek istersen bu sayıyı değiştir
    // Arayüz yazıları
    labels: {
      progress: "{done} / {total} parça tamamlandı",
      trayTitle: "Parçalar",
      trayHint: "Sürükle ya da dokun",
      shuffle: "Karıştır",
      restart: "Baştan başla",
      restartConfirm: "Emin misin? Tekrar dokun",
      edges: "Kenarlar",
      allPieces: "Tümü",
      guide: "Kılavuz",
      preview: "Fotoğrafı göster",
      wrong: "Burası değil, bir daha dene",
      selectHint: "Şimdi tahtada yerine dokun",
      placed: "Yerine oturdu"
    },
    // Yapboz bittiğinde çıkan mesaj
    completion: {
      kicker: "Tamamlandı",
      title: "Bak, bütün parçalar yeniden bir araya geldi.",
      text: "Kırılan şeyler özenle onarılabilir. Eğer bana bir şans daha verirsen, her günü böyle parça parça, ama eksiksiz bir şekilde yeniden kurmak istiyorum.",
      button: "Devam et",
      replay: "Yeniden oyna"
    }
  },

  /* ---------- 4) FOTOĞRAF GALERİSİ ----------
     Yeni fotoğraf eklemek için: dosyayı assets/photos/ klasörüne koy,
     sonra aşağıdaki listeye { ... } satırı ekle. Başka bir şey gerekmez.
     Fotoğraflar kendi oranını korur, düzen otomatik ayarlanır. */
  gallery: {
    sectionNumber: "III",
    sectionLabel: "Galeri",
    title: "Saklanan *anılar*",
    intro: "Bazı anlar fotoğraf olur, bazıları ise kalbimizde kalır.",
    photos: [
      { src: "assets/photos/foto-01.jpg", alt: "Gülümseyen biz", date: "Yaz, 2026",  caption: "Bu günü hatırlıyor musun? Hiç bu kadar çok gülmemiştim." },
      { src: "assets/photos/foto-02.jpg", alt: "Yan yana biz",   date: "Sonbahar",   caption: "Yan yana durmak bile yetiyordu." },
      { src: "assets/photos/foto-03.jpg", alt: "Ahşap tavanın altında", date: "Ekim 2026", caption: "Dünyanın en sakin köşesi, senin yanın." },
      { src: "assets/photos/foto-04.jpg", alt: "Masa başında biz",      date: "Kış",       caption: "Sıradan bir gün, benim için en özel olanlardan." }
    ]
  },

  /* ---------- 5) KAPANIŞ ---------- */
  closing: {
    sectionNumber: "IV",
    sectionLabel: "Son söz",
    lines: [
      "Her şeyi doğru yapamam.",
      "Ama seni sevmeyi, her seferinde yeniden seçerim."
    ],
    text: "Bu sayfa kapanınca da söylediklerim geçerli kalacak. Ne zaman istersen, ben buradayım.",
    signoff: "Sevgiyle,",
    signature: "{from}",
    date: "31 Ekim 2026",               // boş bırakırsan ("") tarih gizlenir
    backToTop: "Başa dön"
  },

  /* ---------- MÜZİK ----------
     Dosyayı assets/ klasörüne koy ve adını aşağıya yaz. */
  music: {
    file: "assets/music.mp3",
    title: "Sen Benim Şarkılarımsın",
    artist: "Cem Adrian & Hande Mehan",
    volume: 0.5,                        // 0 ile 1 arası başlangıç ses seviyesi
    // true: kullanıcı sayfada ilk kez kaydırınca / dokununca müzik kendiliğinden başlar.
    // (Tarayıcılar sesi hiçbir etkileşim olmadan çaldırmaya izin vermez.)
    startOnFirstInteraction: true,
    hint: "Müzik için dokun",
    labelOn: "Müziği kapat",
    labelOff: "Müziği aç",
    labelVolume: "Ses seviyesi"
  }
};
