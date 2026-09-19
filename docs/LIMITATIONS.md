# LIMITATIONS.md — Dürüst Sınırlar (iskelet)

> CANON kural 12: **Dürüst LIMITATIONS.md > şişirilmiş demo.** Bu dosya jüriye ve sonraki geliştiricilere MVP'nin ne YAPMADIĞINI açıkça söyler. Her madde: durum, etki, yol haritası.

## 1. Tasdikçi (attester) — MOCK

- **Durum:** Son Saat'te teslim kanıtı, venue'nun ed25519 imzasıyla kontratta doğrulanır (`confirm_pickup`). Venue anahtarı demoda bizim elimizde; bağımsız/gerçek tasdikçi ağı **yok**.
- **Etki:** "Kanıtlanınca kendini icra eder" vaadi tek imzaya dayanır; venue ile satıcı gizli anlaşırsa (collusion) sistem bunu yakalayamaz.
- **Yol haritası:** Tasdikçi pazarı (CANON kural 8 gelir katmanı), çoklu imza (M-of-N) ve itibar kaydı. Won't listesindeki "gerçek attester" bu yüzden kapsam dışı.

## 2. Sybil kotası — temel, kırılgan

- **Durum:** Claim tarafında kimlik yok; sybil direnci yalnızca basit kota/ekran düzeyinde (kullanıcı başına sınırlı claim varsayımı). Zincirde sybil koruması **yok**.
- **Etki:** Kararlı bir saldırgan çok hesapla kampanya potunu boşaltabilir; demoda gösterilmez ama bilinir.
- **Yol haritası:** Operatör-taraflı KYA kaydı + hız limitleri; uzun vadede ZK anonimliği (kural 3) ile uyumlu kota kanıtı.

## 3. Offline claim — tek hop

- **Durum:** Offline claim kanıtı **tek-hop**: uçak modunda claim hazırlanır, online olunca gönderilir. Multi-hop el değiştirme **yok** (CANON Won't listesi). Banknot/kupür benzeri bir taşıma dili ve mekanizması **kasıtlı olarak kullanılmaz** (hukuki karar F4).
- **Etki:** İnternetsiz ortamda zincir kesinliği ancak yeniden bağlanınca; çift-harcama koruması zincire düşene kadar alıcının güvenine dayanır.
- **Yol haritası:** İmzalı kanıt dosyasının (İbraz Paketi) çevrimdışı doğrulaması; multi-hop ancak hukuki çerçeve netleşince.

## 4. ZK — stub / vitrin

- **Durum:** ZK anonimliği MVP'de **stub**: zincirde kanıt doğrulaması yok; yalnızca ölçüm/vitrin düzeyinde (CANON kapsam kilidi: "ZK vitrini, saat 2 ölçüm gate"). Kural 3'ün vaadi ("ZK anonimliği yalnızca agentsız claim'lerde") bu sürümde **karşılanmaz**.
- **Etki:** Tüm claim'ler izlenebilirdir; mahremiyet vaadi demoda **söylenmez**.
- **Yol haritası:** Agentsız claim için ZK üyelik/kota kanıtı; doğrulama maliyeti ölçümü sonrası karar.

## 5. Anchor tarafı — testnet simülasyonu

- **Durum:** tTRY temsilidir; banka bacağı Anchor Platform referans (mock) server ile **simüle edilir**. Gerçek FAST/EFT yok. "Gerçek TRY" kriteri **organizatör teyidi gerektirir** (bknz `anchor/README.md`).
- **Etki:** Esnafın "sadece TRY görmesi" (kural 4) demoda kavramsal gösterilir, fiilen gösterilmez.
- **Yol haritası:** Lisanslı anchor ortaklığı + MASAK ilk-çekim bekleme sürecinin (72 saat — dondurma kuyruğu ile **karıştırılmamalı**) ürüne yansıması.

## 6. Bilinen teknik sınırlar

- Tek kontratta template dispatch; Olay ve Vekil şablonları MVP'de **yok/taslak** (kapsam kilidi).
- `iade()` takdirdesizdir — bu bir sınır değil tasarımdır; ama "esneklik" bekleyen kullanıcı senaryolarını **kapsamaz**.
- Testnet resetlenirse demo verisi uçar; demo öncesi `scripts/deploy_testnet.sh` yeniden koşulur.

---

_Son güncelleme: MVP dondurma öncesi iskelet. Her madde demo günü fiilen doğrulanıp "durum" satırı kesinleştirilecek._
