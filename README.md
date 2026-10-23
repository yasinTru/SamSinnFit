# SamSinn Fitness - Beslenme & Spor Takibi

İki kişinin beslenme ve spor kayıtlarını takvim üzerinde tuttuğu, cihazlar arasında anlık eşitlenen bir web uygulaması. Kayıt ekleme, görüntüleme, düzenleme ve silme (CRUD) desteklenir.

## Özellikler

- 📅 **Takvim**: Haftalık ve aylık görünüm, "Bugün" kısayolu, sağa/sola kaydırarak gezinme; günlerde beslenme/spor noktaları ve haftalık görünümde günlük kalori
- 🎯 **Günlük özet**: Kişi başı kalori hedefi, ilerleme halkası ve kalan/aşan kalori
- 🍎 **Beslenme Takibi**: Kayıtlar Sabah, Öğle, Akşam ve Ara Öğün başlıklarında, öğün başına ara toplamla
- ⚡ **Hızlı ekleme**: Son eklenenlerden tek dokunuşla seçim, bilinen isimde kalorinin otomatik dolması, saate göre önceden seçilen öğün
- 🏋️‍♂️ **Spor Takibi**: Aktivite, süre/tekrar ve not
- ✎ **Düzenleme ve silme**: Kayda dokunarak düzenleme; silinen kayıt "Geri al" ile geri getirilebilir
- 👥 **İki kişi**: Üstteki düğmelerle tek dokunuşla geçiş; her cihaz son seçilen kişiyi ve görünümü hatırlar
- ☁️ **Cihazlar arası eşitleme**: Bir telefonda eklenen kayıt diğer cihazlarda anında görünür (Firebase)
- 📴 **Çevrimdışı çalışma**: İnternet yokken yapılan değişiklikler bağlantı gelince gönderilir
- 🔒 **Google ile giriş**: Verilere sadece izin verilen iki Google hesabı erişebilir
- 📱 **Mobil öncelikli tasarım**: Alttan açılan paneller, büyük dokunma alanları, masaüstünde iki sütunlu düzen
- 🌙 **Karanlık mod**: Cihazın tema ayarını otomatik izler

## Teknolojiler

- **HTML5 / CSS3 / Vanilla JavaScript (ES modülleri)**: Derleme adımı yok
- **Firebase Authentication**: Google ile giriş
- **Cloud Firestore**: Veri saklama, anlık eşitleme ve çevrimdışı önbellek

Firebase ayarlanmadığında uygulama **yerel modda** çalışır: kayıtlar sadece o tarayıcının `localStorage`'ında tutulur ve cihazlar arasında paylaşılmaz.

## Dosya Yapısı

```
SamSinnFit/
├── index.html          # Sayfa yapısı (giriş ekranı, takvim, kayıt kartları, ayarlar)
├── styles.css          # Stiller
├── script.js           # Arayüz mantığı (takvim, formlar, olaylar)
├── store.js            # Veri katmanı: Firestore veya localStorage
├── firebase-config.js  # Firebase proje ayarları (kurulumda doldurulur)
├── firestore.rules     # Firestore güvenlik kuralları (izinli e-postalar burada)
├── firebase.json       # Firebase CLI / emülatör ayarları
├── package.json        # Geliştirme sunucusu komutları
├── render.yaml         # Render.com konfigürasyonu
└── .github/workflows/
    └── deploy.yml      # GitHub Pages deployment
```

## Firebase Kurulumu

Cihazlar arası eşitleme için bir kerelik kurulum gerekir (ücretsiz Spark planı iki kişilik kullanım için fazlasıyla yeterli).

1. **Proje oluşturun**: [Firebase Console](https://console.firebase.google.com/) > *Proje oluştur*. Google Analytics gerekmez.
2. **Google ile girişi açın**: *Build > Authentication > Başlayın* > *Sign-in method* sekmesi > **Google** > *Etkinleştir*, destek e-postasını seçip kaydedin.
3. **Yayın adreslerini yetkilendirin**: *Authentication > Settings > Authorized domains* bölümüne uygulamanın yayınlandığı adresleri ekleyin:
   - `samsin-fit.onrender.com`
   - `<github-kullanıcı-adınız>.github.io` (GitHub Pages kullanıyorsanız)

   `localhost` varsayılan olarak eklidir.
4. **Veritabanını oluşturun**: *Build > Firestore Database > Veritabanı oluştur*. Konum olarak Avrupa'da bir bölge seçin (ör. `europe-west3` Frankfurt), **production mode** ile başlayın.
5. **Güvenlik kurallarını yayınlayın**: `firestore.rules` dosyasındaki `kisi1@gmail.com` ve `kisi2@gmail.com` adreslerini ikinizin Google e-posta adresleriyle (küçük harfle) değiştirin. Dosyanın tamamını *Firestore Database > Kurallar (Rules)* sekmesine yapıştırıp **Yayınla**'ya basın.

   Gerçek adresleri bu dosyada commit etmeniz gerekmez: kurallar Console'da yayınlandığı anda geçerli olur. Repo ve yayınlanan site bu dosyayı herkese açık gösterdiği için adreslerin görünmesini istemiyorsanız repodaki örnek adresleri olduğu gibi bırakın.
6. **Web uygulamasını kaydedin**: *Proje ayarları (⚙️) > Genel > Uygulamalarınız* > Web simgesi (`</>`). Bir takma ad verin (Firebase Hosting gerekmez). Gösterilen `firebaseConfig` değerlerini `firebase-config.js` dosyasına yapıştırın.
7. Değişiklikleri commit edip push edin. Uygulama açıldığında Google ile giriş ekranı gelecektir.

> `firebase-config.js` içindeki değerler gizli değildir; tarayıcıya zaten gönderilirler. Verileri koruyan şey 5. adımdaki güvenlik kurallarıdır. İzinli listede olmayan bir hesap giriş yaparsa "erişim izni yok" mesajı görür.

İzinli e-postaları sonradan değiştirmek için `firestore.rules` dosyasını güncelleyip 5. adımı tekrarlayın.

## Yerel Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın. Uygulama ES modülleri kullandığı için `index.html` dosyasını doğrudan (`file://`) açmak çalışmaz; bir sunucu üzerinden açılmalıdır.

### Firebase emülatörü ile test

Gerçek projeye dokunmadan bulut modunu denemek için (Java 11+ gerekir):

```bash
npm run emulators   # Auth (9099) ve Firestore (8080) emülatörlerini başlatır
npm run dev         # başka bir terminalde
```

Ardından `http://localhost:3000/?emulator` adresini açın. Emülatör `firestore.rules` dosyasındaki kuralları uygular. Giriş penceresinde listedeki e-postalardan biriyle sahte bir hesap oluşturabilirsiniz.

## Deployment

### Render.com
1. GitHub repository'sini Render.com'a bağlayın; `render.yaml` statik site ayarlarını sağlar.
2. Adres: `https://samsin-fit.onrender.com`

### GitHub Pages
1. Repository *Settings > Pages* > Source: **GitHub Actions**
2. `main` dalına yapılan her push `.github/workflows/deploy.yml` ile yayınlanır.

Hangi adresi kullanırsanız kullanın, o adresin Firebase'de yetkili alan adı olarak eklenmiş olması gerekir (Kurulum 3. adım).

## Kullanım

- **Kayıt eklemek**: Takvimden günü seçin; öğün başlığındaki **+** düğmesine veya "Besin ekle" / "Aktivite ekle"ye dokunun. "Son eklenenler"den birine dokunarak formu hızlıca doldurabilirsiniz.
- **Düzenlemek**: Kayda dokunun. Düzenleme panelinden silebilirsiniz de.
- **Silmek**: Kaydın yanındaki çöp kutusu. Yanlışlıkla silerseniz alttaki bildirimden **Geri al**'a dokunun.
- **Kişi değiştirmek**: Üstteki isim düğmeleri.
- **İsimler ve kalori hedefi**: ⚙️ Ayarlar. Değişiklikler tüm cihazlarda güncellenir. Çıkış da buradan yapılır.
- **Durum rozeti**: Sadece dikkat gerektiğinde görünür (Çevrimdışı, Kaydediliyor…, Yerel mod).

## Test Senaryoları

1. **Tarih doğruluğu**: Farklı günlere kayıt ekleyin; kayıt hem aylık hem haftalık görünümde aynı günde görünmeli.
2. **Cihazlar arası eşitleme**: İki cihazda iki farklı izinli hesapla giriş yapın; birinde eklenen, düzenlenen veya silinen kayıt diğerinde anında görünmeli.
3. **Çevrimdışı**: İnterneti kapatıp kayıt ekleyin; durum çubuğu "Çevrimdışı" göstermeli, internet gelince kayıt diğer cihaza ulaşmalı.
4. **Yetkisiz hesap**: Listede olmayan bir Google hesabıyla girişte "erişim izni yok" mesajı görünmeli.

## Tarayıcı Desteği

- Chrome / Edge 85+
- Firefox 98+
- Safari 15.4+ (iOS 15.4+)

## Lisans

MIT
