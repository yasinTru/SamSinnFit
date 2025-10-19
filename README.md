# SamSin Fitness - Beslenme & Spor Takibi

Bu uygulama, beslenme ve spor takibi yapmanızı sağlayan modern bir web uygulamasıdır. CRUD (Create, Read, Update, Delete) işlemlerini destekler ve iki farklı kullanıcı için ayrı veri takibi yapabilir.

## Özellikler

- 📅 **Takvim Görünümü**: Aylık ve haftalık görünüm seçenekleri
- 🍎 **Beslenme Takibi**: Günlük kalori ve öğün kayıtları
- 🏋️‍♂️ **Spor Takibi**: Egzersiz ve aktivite kayıtları
- 👥 **Çoklu Kullanıcı**: İki farklı kullanıcı için ayrı veri yönetimi
- 💾 **Yerel Depolama**: Veriler tarayıcıda güvenli şekilde saklanır
- 📱 **Responsive Tasarım**: Mobil ve masaüstü uyumlu

## Teknolojiler

- **HTML5**: Semantik yapı
- **CSS3**: Modern styling ve responsive tasarım
- **Vanilla JavaScript**: Framework bağımsız, hızlı performans
- **LocalStorage**: Veri saklama

## Dosya Yapısı

```
SamSinFit/
├── index.html          # Ana HTML dosyası
├── styles.css          # CSS stilleri
├── script.js           # JavaScript kodu
├── package.json        # Node.js bağımlılıkları
├── render.yaml         # Render.com konfigürasyonu
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Pages deployment
└── README.md           # Bu dosya
```

## Yerel Geliştirme

1. Projeyi klonlayın:
```bash
git clone <repository-url>
cd SamSinFit
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

4. Tarayıcıda `http://localhost:3000` adresini açın.

## Deployment

### Render.com ile Deployment

1. GitHub repository'nizi Render.com'a bağlayın
2. `render.yaml` dosyası otomatik olarak konfigürasyonu sağlayacak
3. Deploy butonuna tıklayın

### GitHub Pages ile Deployment

1. Repository ayarlarında GitHub Pages'i etkinleştirin
2. Source olarak "GitHub Actions" seçin
3. `.github/workflows/deploy.yml` dosyası otomatik deployment sağlayacak

## Kullanım

### Beslenme Kaydı
1. Takvimden bir gün seçin
2. "Yeni Besin Ekle" butonuna tıklayın
3. Yiyecek adı, kalori ve öğün bilgilerini girin
4. "Kaydet" butonuna tıklayın

### Spor Kaydı
1. Takvimden bir gün seçin
2. "Yeni Spor Ekle" butonuna tıklayın
3. Aktivite adı, süre/tekrar ve notlarını girin
4. "Kaydet" butonuna tıklayın

### Kullanıcı Değiştirme
- Header'daki dropdown menüden farklı kullanıcı seçebilirsiniz
- Her kullanıcının verileri ayrı ayrı saklanır

### Ayarlar
- ⚙️ butonuna tıklayarak kullanıcı isimlerini değiştirebilirsiniz

## CRUD İşlemleri

- **Create**: Yeni besin/spor kaydı ekleme
- **Read**: Takvimde veri görüntüleme
- **Update**: Mevcut kayıtları düzenleme (gelecek sürümde)
- **Delete**: Kayıtları silme (x butonu ile)

## Tarayıcı Desteği

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push yapın (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## İletişim

Proje hakkında sorularınız için issue açabilirsiniz.
