export interface UniversityEntry {
  name: string;
  turkishName: string;
  city: string;
  country: string;
}

export interface CityGroup {
  city: string;
  universities: UniversityEntry[];
}

export interface CountryGroup {
  country: string;
  cities: CityGroup[];
}

const UNIVERSITY_DATA: CountryGroup[] = [
  {
    country: "Türkiye",
    cities: [
      {
        city: "Adana",
        universities: [
          { name: "Adana Alparslan Türkeş Bilim Ve Teknoloji University", turkishName: "ADANA ALPARSLAN TÜRKEŞ BİLİM VE TEKNOLOJİ ÜNİVERSİTESİ", city: "Adana", country: "Türkiye" },
          { name: "Çukurova University", turkishName: "ÇUKUROVA ÜNİVERSİTESİ", city: "Adana", country: "Türkiye" },
        ],
      },
      {
        city: "Adıyaman",
        universities: [
          { name: "Adiyaman University", turkishName: "ADIYAMAN ÜNİVERSİTESİ", city: "Adıyaman", country: "Türkiye" },
        ],
      },
      {
        city: "Afyonkarahisar",
        universities: [
          { name: "Afyon Kocatepe University", turkishName: "AFYON KOCATEPE ÜNİVERSİTESİ", city: "Afyonkarahisar", country: "Türkiye" },
          { name: "Afyonkarahisar Sağlik Bilimleri University", turkishName: "AFYONKARAHİSAR SAĞLIK BİLİMLERİ ÜNİVERSİTESİ", city: "Afyonkarahisar", country: "Türkiye" },
        ],
      },
      {
        city: "Ağrı",
        universities: [
          { name: "Ağri İbrahim Çeçen University", turkishName: "AĞRI İBRAHİM ÇEÇEN ÜNİVERSİTESİ", city: "Ağrı", country: "Türkiye" },
        ],
      },
      {
        city: "Aksaray",
        universities: [
          { name: "Aksaray University", turkishName: "AKSARAY ÜNİVERSİTESİ", city: "Aksaray", country: "Türkiye" },
        ],
      },
      {
        city: "Amasya",
        universities: [
          { name: "Amasya University", turkishName: "AMASYA ÜNİVERSİTESİ", city: "Amasya", country: "Türkiye" },
        ],
      },
      {
        city: "Ankara",
        universities: [
          { name: "Ankara Bilim University", turkishName: "ANKARA BİLİM ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ankara Haci Bayram Veli University", turkishName: "ANKARA HACI BAYRAM VELİ ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ankara Medipol University", turkishName: "ANKARA MEDİPOL ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ankara Müzik Ve Güzel Sanatlar University", turkishName: "ANKARA MÜZİK VE GÜZEL SANATLAR ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ankara Sosyal Bilimler University", turkishName: "ANKARA SOSYAL BİLİMLER ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ankara University", turkishName: "ANKARA ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ankara Yildirim Beyazit University", turkishName: "ANKARA YILDIRIM BEYAZIT ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Atilim University", turkishName: "ATILIM ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Başkent University", turkishName: "BAŞKENT ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Çankaya University", turkishName: "ÇANKAYA ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Gazi University", turkishName: "GAZİ ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Hacettepe University", turkishName: "HACETTEPE ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "İhsan Doğramaci Bilkent University", turkishName: "İHSAN DOĞRAMACI BİLKENT ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Lokman Hekim University", turkishName: "LOKMAN HEKİM ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Orta Doğu Teknik University", turkishName: "ORTA DOĞU TEKNİK ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ostim Teknik University", turkishName: "OSTİM TEKNİK ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ted University", turkishName: "TED ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Tobb Ekonomi Ve Teknoloji University", turkishName: "TOBB EKONOMİ VE TEKNOLOJİ ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Türk Hava Kurumu University", turkishName: "TÜRK HAVA KURUMU ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Ufuk University", turkishName: "UFUK ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
          { name: "Yüksek İhtisas University", turkishName: "YÜKSEK İHTİSAS ÜNİVERSİTESİ", city: "Ankara", country: "Türkiye" },
        ],
      },
      {
        city: "Antalya",
        universities: [
          { name: "Akdeniz University", turkishName: "AKDENİZ ÜNİVERSİTESİ", city: "Antalya", country: "Türkiye" },
          { name: "Alanya Alaaddin Keykubat University", turkishName: "ALANYA ALAADDİN KEYKUBAT ÜNİVERSİTESİ", city: "Antalya", country: "Türkiye" },
          { name: "Alanya University", turkishName: "ALANYA ÜNİVERSİTESİ", city: "Antalya", country: "Türkiye" },
          { name: "Antalya Belek University", turkishName: "ANTALYA BELEK ÜNİVERSİTESİ", city: "Antalya", country: "Türkiye" },
          { name: "Antalya Bilim University", turkishName: "ANTALYA BİLİM ÜNİVERSİTESİ", city: "Antalya", country: "Türkiye" },
        ],
      },
      {
        city: "Ardahan",
        universities: [
          { name: "Ardahan University", turkishName: "ARDAHAN ÜNİVERSİTESİ", city: "Ardahan", country: "Türkiye" },
        ],
      },
      {
        city: "Artvin",
        universities: [
          { name: "Artvin Çoruh University", turkishName: "ARTVİN ÇORUH ÜNİVERSİTESİ", city: "Artvin", country: "Türkiye" },
        ],
      },
      {
        city: "Aydın",
        universities: [
          { name: "Aydin Adnan Menderes University", turkishName: "AYDIN ADNAN MENDERES ÜNİVERSİTESİ", city: "Aydın", country: "Türkiye" },
        ],
      },
      {
        city: "Balıkesir",
        universities: [
          { name: "Balikesir University", turkishName: "BALIKESİR ÜNİVERSİTESİ", city: "Balıkesir", country: "Türkiye" },
          { name: "Bandirma Onyedi Eylül University", turkishName: "BANDIRMA ONYEDİ EYLÜL ÜNİVERSİTESİ", city: "Balıkesir", country: "Türkiye" },
        ],
      },
      {
        city: "Bartın",
        universities: [
          { name: "Bartin University", turkishName: "BARTIN ÜNİVERSİTESİ", city: "Bartın", country: "Türkiye" },
        ],
      },
      {
        city: "Batman",
        universities: [
          { name: "Batman University", turkishName: "BATMAN ÜNİVERSİTESİ", city: "Batman", country: "Türkiye" },
        ],
      },
      {
        city: "Bayburt",
        universities: [
          { name: "Bayburt University", turkishName: "BAYBURT ÜNİVERSİTESİ", city: "Bayburt", country: "Türkiye" },
        ],
      },
      {
        city: "Bilecik",
        universities: [
          { name: "Bilecik Şeyh Edebali University", turkishName: "BİLECİK ŞEYH EDEBALİ ÜNİVERSİTESİ", city: "Bilecik", country: "Türkiye" },
        ],
      },
      {
        city: "Bingöl",
        universities: [
          { name: "Bingöl University", turkishName: "BİNGÖL ÜNİVERSİTESİ", city: "Bingöl", country: "Türkiye" },
        ],
      },
      {
        city: "Bitlis",
        universities: [
          { name: "Bitlis Eren University", turkishName: "BİTLİS EREN ÜNİVERSİTESİ", city: "Bitlis", country: "Türkiye" },
        ],
      },
      {
        city: "Bolu",
        universities: [
          { name: "Bolu Abant İzzet Baysal University", turkishName: "BOLU ABANT İZZET BAYSAL ÜNİVERSİTESİ", city: "Bolu", country: "Türkiye" },
        ],
      },
      {
        city: "Burdur",
        universities: [
          { name: "Burdur Mehmet Akif Ersoy University", turkishName: "BURDUR MEHMET AKİF ERSOY ÜNİVERSİTESİ", city: "Burdur", country: "Türkiye" },
        ],
      },
      {
        city: "Bursa",
        universities: [
          { name: "Bursa Teknik University", turkishName: "BURSA TEKNİK ÜNİVERSİTESİ", city: "Bursa", country: "Türkiye" },
          { name: "Bursa Uludağ University", turkishName: "BURSA ULUDAĞ ÜNİVERSİTESİ", city: "Bursa", country: "Türkiye" },
          { name: "Mudanya University", turkishName: "MUDANYA ÜNİVERSİTESİ", city: "Bursa", country: "Türkiye" },
        ],
      },
      {
        city: "Çanakkale",
        universities: [
          { name: "Çanakkale Onsekiz Mart University", turkishName: "ÇANAKKALE ONSEKİZ MART ÜNİVERSİTESİ", city: "Çanakkale", country: "Türkiye" },
        ],
      },
      {
        city: "Çankırı",
        universities: [
          { name: "Çankiri Karatekin University", turkishName: "ÇANKIRI KARATEKİN ÜNİVERSİTESİ", city: "Çankırı", country: "Türkiye" },
        ],
      },
      {
        city: "Çorum",
        universities: [
          { name: "Hitit University", turkishName: "HİTİT ÜNİVERSİTESİ", city: "Çorum", country: "Türkiye" },
        ],
      },
      {
        city: "Denizli",
        universities: [
          { name: "Pamukkale University", turkishName: "PAMUKKALE ÜNİVERSİTESİ", city: "Denizli", country: "Türkiye" },
        ],
      },
      {
        city: "Diyarbakır",
        universities: [
          { name: "Dicle University", turkishName: "DİCLE ÜNİVERSİTESİ", city: "Diyarbakır", country: "Türkiye" },
        ],
      },
      {
        city: "Düzce",
        universities: [
          { name: "Düzce University", turkishName: "DÜZCE ÜNİVERSİTESİ", city: "Düzce", country: "Türkiye" },
        ],
      },
      {
        city: "Edirne",
        universities: [
          { name: "Trakya University", turkishName: "TRAKYA ÜNİVERSİTESİ", city: "Edirne", country: "Türkiye" },
        ],
      },
      {
        city: "Elazığ",
        universities: [
          { name: "Firat University", turkishName: "FIRAT ÜNİVERSİTESİ", city: "Elazığ", country: "Türkiye" },
        ],
      },
      {
        city: "Erzincan",
        universities: [
          { name: "Erzincan Binali Yildirim University", turkishName: "ERZİNCAN BİNALİ YILDIRIM ÜNİVERSİTESİ", city: "Erzincan", country: "Türkiye" },
        ],
      },
      {
        city: "Erzurum",
        universities: [
          { name: "Atatürk University", turkishName: "ATATÜRK ÜNİVERSİTESİ", city: "Erzurum", country: "Türkiye" },
          { name: "Erzurum Teknik University", turkishName: "ERZURUM TEKNİK ÜNİVERSİTESİ", city: "Erzurum", country: "Türkiye" },
        ],
      },
      {
        city: "Eskişehir",
        universities: [
          { name: "Anadolu University", turkishName: "ANADOLU ÜNİVERSİTESİ", city: "Eskişehir", country: "Türkiye" },
          { name: "Eskişehir Osmangazi University", turkishName: "ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ", city: "Eskişehir", country: "Türkiye" },
          { name: "Eskişehir Teknik University", turkishName: "ESKİŞEHİR TEKNİK ÜNİVERSİTESİ", city: "Eskişehir", country: "Türkiye" },
        ],
      },
      {
        city: "Gaziantep",
        universities: [
          { name: "Gaziantep İslam Bilim Ve Teknoloji University", turkishName: "GAZİANTEP İSLAM BİLİM VE TEKNOLOJİ ÜNİVERSİTESİ", city: "Gaziantep", country: "Türkiye" },
          { name: "Gaziantep University", turkishName: "GAZİANTEP ÜNİVERSİTESİ", city: "Gaziantep", country: "Türkiye" },
          { name: "Hasan Kalyoncu University", turkishName: "HASAN KALYONCU ÜNİVERSİTESİ", city: "Gaziantep", country: "Türkiye" },
          { name: "Sanko University", turkishName: "SANKO ÜNİVERSİTESİ", city: "Gaziantep", country: "Türkiye" },
        ],
      },
      {
        city: "Giresun",
        universities: [
          { name: "Giresun University", turkishName: "GİRESUN ÜNİVERSİTESİ", city: "Giresun", country: "Türkiye" },
        ],
      },
      {
        city: "Gümüşhane",
        universities: [
          { name: "Gümüşhane University", turkishName: "GÜMÜŞHANE ÜNİVERSİTESİ", city: "Gümüşhane", country: "Türkiye" },
        ],
      },
      {
        city: "Hakkari",
        universities: [
          { name: "Hakkari University", turkishName: "HAKKARİ ÜNİVERSİTESİ", city: "Hakkari", country: "Türkiye" },
        ],
      },
      {
        city: "Hatay",
        universities: [
          { name: "Hatay Mustafa Kemal University", turkishName: "HATAY MUSTAFA KEMAL ÜNİVERSİTESİ", city: "Hatay", country: "Türkiye" },
          { name: "İskenderun Teknik University", turkishName: "İSKENDERUN TEKNİK ÜNİVERSİTESİ", city: "Hatay", country: "Türkiye" },
        ],
      },
      {
        city: "Iğdır",
        universities: [
          { name: "Iğdir University", turkishName: "IĞDIR ÜNİVERSİTESİ", city: "Iğdır", country: "Türkiye" },
        ],
      },
      {
        city: "Isparta",
        universities: [
          { name: "Isparta Uygulamali Bilimler University", turkishName: "ISPARTA UYGULAMALI BİLİMLER ÜNİVERSİTESİ", city: "Isparta", country: "Türkiye" },
          { name: "Süleyman Demirel University", turkishName: "SÜLEYMAN DEMİREL ÜNİVERSİTESİ", city: "Isparta", country: "Türkiye" },
        ],
      },
      {
        city: "İstanbul",
        universities: [
          { name: "Acibadem Mehmet Ali Aydinlar University", turkishName: "ACIBADEM MEHMET ALİ AYDINLAR ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Altinbas University", turkishName: "ALTINBAŞ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Atlas University", turkishName: "İSTANBUL ATLAS ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Bahcesehir University", turkishName: "BAHÇEŞEHİR ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Beykent University", turkishName: "İSTANBUL BEYKENT ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Beykoz University", turkishName: "BEYKOZ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Bezm-i Âlem Vakif University", turkishName: "BEZM-İ ÂLEM VAKIF ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Bilgi University (Istanbul Bilgi)", turkishName: "İSTANBUL BİLGİ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Biruni University", turkishName: "BİRUNİ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Bogazici University", turkishName: "BOĞAZİÇİ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Cerrahpasa University (Istanbul University-Cerrahpasa)", turkishName: "İSTANBUL ÜNİVERSİTESİ-CERRAHPAŞA", city: "İstanbul", country: "Türkiye" },
          { name: "Demiroğlu Bilim University", turkishName: "DEMİROĞLU BİLİM ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Dogus University", turkishName: "DOĞUŞ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Esenyurt University", turkishName: "İSTANBUL ESENYURT ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Fatih Sultan Mehmet Vakif University", turkishName: "FATİH SULTAN MEHMET VAKIF ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Fenerbahçe University", turkishName: "FENERBAHÇE ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Galatasaray University", turkishName: "GALATASARAY ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Gedik University", turkishName: "İSTANBUL GEDİK ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Halic University", turkishName: "HALİÇ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "İbn Haldun University", turkishName: "İBN HALDUN ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Isik University", turkishName: "IŞIK ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "İstanbul 29 Mayis University", turkishName: "İSTANBUL 29 MAYIS ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Arel University", turkishName: "İSTANBUL AREL ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Aydin University", turkishName: "İSTANBUL AYDIN ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Commerce University (Istanbul Ticaret)", turkishName: "İSTANBUL TİCARET ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "İstanbul Galata University", turkishName: "İSTANBUL GALATA ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Gelisim University", turkishName: "İSTANBUL GELİŞİM ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Kent University", turkishName: "İSTANBUL KENT ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Kultur University", turkishName: "İSTANBUL KÜLTÜR ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Medeniyet University", turkishName: "İSTANBUL MEDENİYET ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Medipol University", turkishName: "İSTANBUL MEDİPOL ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Okan University", turkishName: "İSTANBUL OKAN ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "İstanbul Rumeli University", turkishName: "İSTANBUL RUMELİ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Sabahattin Zaim University", turkishName: "İSTANBUL SABAHATTİN ZAİM ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "İstanbul Sağlik Ve Sosyal Bilimler Meslek Yüksekokulu University", turkishName: "İSTANBUL SAĞLIK VE SOSYAL BİLİMLER MESLEK YÜKSEKOKULU", city: "İstanbul", country: "Türkiye" },
          { name: "İstanbul Sağlik Ve Teknoloji University", turkishName: "İSTANBUL SAĞLIK VE TEKNOLOJİ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Technical University (ITU)", turkishName: "İSTANBUL TEKNİK ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul Topkapi University", turkishName: "İSTANBUL TOPKAPI ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istanbul University", turkishName: "İSTANBUL ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "İstanbul Yeni Yüzyil University", turkishName: "İSTANBUL YENİ YÜZYIL ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Istinye University", turkishName: "İSTİNYE ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Kadir Has University", turkishName: "KADİR HAS ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Koc University", turkishName: "KOÇ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Maltepe University", turkishName: "MALTEPE ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Marmara University", turkishName: "MARMARA ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "MEF University", turkishName: "MEF ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Mimar Sinan Güzel Sanatlar University", turkishName: "MİMAR SİNAN GÜZEL SANATLAR ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Nisantasi University", turkishName: "İSTANBUL NİŞANTAŞI ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Özyeğin University", turkishName: "ÖZYEĞİN ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Piri Reis University", turkishName: "PİRİ REİS ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Sabanci University", turkishName: "SABANCI ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Sağlik Bilimleri University", turkishName: "SAĞLIK BİLİMLERİ ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Turkish-German University", turkishName: "TÜRK-ALMAN ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Uskudar University", turkishName: "ÜSKÜDAR ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Yeditepe University", turkishName: "YEDİTEPE ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
          { name: "Yildiz Technical University", turkishName: "YILDIZ TEKNİK ÜNİVERSİTESİ", city: "İstanbul", country: "Türkiye" },
        ],
      },
      {
        city: "İzmir",
        universities: [
          { name: "Dokuz Eylül University", turkishName: "DOKUZ EYLÜL ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "Ege University", turkishName: "EGE ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "İzmir Bakirçay University", turkishName: "İZMİR BAKIRÇAY ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "İzmir Demokrasi University", turkishName: "İZMİR DEMOKRASİ ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "İzmir Ekonomi University", turkishName: "İZMİR EKONOMİ ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "İzmir Katip Çelebi University", turkishName: "İZMİR KATİP ÇELEBİ ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "İzmir Tinaztepe University", turkishName: "İZMİR TINAZTEPE ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
          { name: "İzmir Yüksek Teknoloji Enstitüsü University", turkishName: "İZMİR YÜKSEK TEKNOLOJİ ENSTİTÜSÜ", city: "İzmir", country: "Türkiye" },
          { name: "Yaşar University", turkishName: "YAŞAR ÜNİVERSİTESİ", city: "İzmir", country: "Türkiye" },
        ],
      },
      {
        city: "Kahramanmaraş",
        universities: [
          { name: "Kahramanmaraş İstiklal University", turkishName: "KAHRAMANMARAŞ İSTİKLAL ÜNİVERSİTESİ", city: "Kahramanmaraş", country: "Türkiye" },
          { name: "Kahramanmaraş Sütçü İmam University", turkishName: "KAHRAMANMARAŞ SÜTÇÜ İMAM ÜNİVERSİTESİ", city: "Kahramanmaraş", country: "Türkiye" },
        ],
      },
      {
        city: "Karabük",
        universities: [
          { name: "Karabük University", turkishName: "KARABÜK ÜNİVERSİTESİ", city: "Karabük", country: "Türkiye" },
        ],
      },
      {
        city: "Karaman",
        universities: [
          { name: "Karamanoğlu Mehmetbey University", turkishName: "KARAMANOĞLU MEHMETBEY ÜNİVERSİTESİ", city: "Karaman", country: "Türkiye" },
        ],
      },
      {
        city: "Kars",
        universities: [
          { name: "Kafkas University", turkishName: "KAFKAS ÜNİVERSİTESİ", city: "Kars", country: "Türkiye" },
        ],
      },
      {
        city: "Kastamonu",
        universities: [
          { name: "Kastamonu University", turkishName: "KASTAMONU ÜNİVERSİTESİ", city: "Kastamonu", country: "Türkiye" },
        ],
      },
      {
        city: "Kayseri",
        universities: [
          { name: "Abdullah Gül University", turkishName: "ABDULLAH GÜL ÜNİVERSİTESİ", city: "Kayseri", country: "Türkiye" },
          { name: "Erciyes University", turkishName: "ERCİYES ÜNİVERSİTESİ", city: "Kayseri", country: "Türkiye" },
          { name: "Kayseri University", turkishName: "KAYSERİ ÜNİVERSİTESİ", city: "Kayseri", country: "Türkiye" },
          { name: "Nuh Naci Yazgan University", turkishName: "NUH NACİ YAZGAN ÜNİVERSİTESİ", city: "Kayseri", country: "Türkiye" },
        ],
      },
      {
        city: "Kırıkkale",
        universities: [
          { name: "Kirikkale University", turkishName: "KIRIKKALE ÜNİVERSİTESİ", city: "Kırıkkale", country: "Türkiye" },
        ],
      },
      {
        city: "Kırklareli",
        universities: [
          { name: "Kirklareli University", turkishName: "KIRKLARELİ ÜNİVERSİTESİ", city: "Kırklareli", country: "Türkiye" },
        ],
      },
      {
        city: "Kırşehir",
        universities: [
          { name: "Kirşehir Ahi Evran University", turkishName: "KIRŞEHİR AHİ EVRAN ÜNİVERSİTESİ", city: "Kırşehir", country: "Türkiye" },
        ],
      },
      {
        city: "Kilis",
        universities: [
          { name: "Kilis 7 Aralik University", turkishName: "KİLİS 7 ARALIK ÜNİVERSİTESİ", city: "Kilis", country: "Türkiye" },
        ],
      },
      {
        city: "Kocaeli",
        universities: [
          { name: "Gebze Teknik University", turkishName: "GEBZE TEKNİK ÜNİVERSİTESİ", city: "Kocaeli", country: "Türkiye" },
          { name: "Kocaeli Sağlik Ve Teknoloji University", turkishName: "KOCAELİ SAĞLIK VE TEKNOLOJİ ÜNİVERSİTESİ", city: "Kocaeli", country: "Türkiye" },
          { name: "Kocaeli University", turkishName: "KOCAELİ ÜNİVERSİTESİ", city: "Kocaeli", country: "Türkiye" },
        ],
      },
      {
        city: "Konya",
        universities: [
          { name: "Konya Gida Ve Tarim University", turkishName: "KONYA GIDA VE TARIM ÜNİVERSİTESİ", city: "Konya", country: "Türkiye" },
          { name: "Konya Teknik University", turkishName: "KONYA TEKNİK ÜNİVERSİTESİ", city: "Konya", country: "Türkiye" },
          { name: "Kto Karatay University", turkishName: "KTO KARATAY ÜNİVERSİTESİ", city: "Konya", country: "Türkiye" },
          { name: "Necmettin Erbakan University", turkishName: "NECMETTİN ERBAKAN ÜNİVERSİTESİ", city: "Konya", country: "Türkiye" },
          { name: "Selçuk University", turkishName: "SELÇUK ÜNİVERSİTESİ", city: "Konya", country: "Türkiye" },
        ],
      },
      {
        city: "Kütahya",
        universities: [
          { name: "Kütahya Dumlupinar University", turkishName: "KÜTAHYA DUMLUPINAR ÜNİVERSİTESİ", city: "Kütahya", country: "Türkiye" },
          { name: "Kütahya Sağlik Bilimleri University", turkishName: "KÜTAHYA SAĞLIK BİLİMLERİ ÜNİVERSİTESİ", city: "Kütahya", country: "Türkiye" },
        ],
      },
      {
        city: "Malatya",
        universities: [
          { name: "İnönü University", turkishName: "İNÖNÜ ÜNİVERSİTESİ", city: "Malatya", country: "Türkiye" },
          { name: "Malatya Turgut Özal University", turkishName: "MALATYA TURGUT ÖZAL ÜNİVERSİTESİ", city: "Malatya", country: "Türkiye" },
        ],
      },
      {
        city: "Manisa",
        universities: [
          { name: "Manisa Celâl Bayar University", turkishName: "MANİSA CELÂL BAYAR ÜNİVERSİTESİ", city: "Manisa", country: "Türkiye" },
        ],
      },
      {
        city: "Mardin",
        universities: [
          { name: "Mardin Artuklu University", turkishName: "MARDİN ARTUKLU ÜNİVERSİTESİ", city: "Mardin", country: "Türkiye" },
        ],
      },
      {
        city: "Mersin",
        universities: [
          { name: "Çağ University", turkishName: "ÇAĞ ÜNİVERSİTESİ", city: "Mersin", country: "Türkiye" },
          { name: "Mersin University", turkishName: "MERSİN ÜNİVERSİTESİ", city: "Mersin", country: "Türkiye" },
          { name: "Tarsus University", turkishName: "TARSUS ÜNİVERSİTESİ", city: "Mersin", country: "Türkiye" },
          { name: "Toros University", turkishName: "TOROS ÜNİVERSİTESİ", city: "Mersin", country: "Türkiye" },
        ],
      },
      {
        city: "Muğla",
        universities: [
          { name: "Muğla Sitki Koçman University", turkishName: "MUĞLA SITKI KOÇMAN ÜNİVERSİTESİ", city: "Muğla", country: "Türkiye" },
        ],
      },
      {
        city: "Muş",
        universities: [
          { name: "Muş Alparslan University", turkishName: "MUŞ ALPARSLAN ÜNİVERSİTESİ", city: "Muş", country: "Türkiye" },
        ],
      },
      {
        city: "Nevşehir",
        universities: [
          { name: "Kapadokya University", turkishName: "KAPADOKYA ÜNİVERSİTESİ", city: "Nevşehir", country: "Türkiye" },
          { name: "Nevşehir Haci Bektaş Veli University", turkishName: "NEVŞEHİR HACI BEKTAŞ VELİ ÜNİVERSİTESİ", city: "Nevşehir", country: "Türkiye" },
        ],
      },
      {
        city: "Niğde",
        universities: [
          { name: "Niğde Ömer Halisdemir University", turkishName: "NİĞDE ÖMER HALİSDEMİR ÜNİVERSİTESİ", city: "Niğde", country: "Türkiye" },
        ],
      },
      {
        city: "Ordu",
        universities: [
          { name: "Ordu University", turkishName: "ORDU ÜNİVERSİTESİ", city: "Ordu", country: "Türkiye" },
        ],
      },
      {
        city: "Osmaniye",
        universities: [
          { name: "Osmaniye Korkut Ata University", turkishName: "OSMANİYE KORKUT ATA ÜNİVERSİTESİ", city: "Osmaniye", country: "Türkiye" },
        ],
      },
      {
        city: "Rize",
        universities: [
          { name: "Recep Tayyip Erdoğan University", turkishName: "RECEP TAYYİP ERDOĞAN ÜNİVERSİTESİ", city: "Rize", country: "Türkiye" },
        ],
      },
      {
        city: "Sakarya",
        universities: [
          { name: "Sakarya University", turkishName: "SAKARYA ÜNİVERSİTESİ", city: "Sakarya", country: "Türkiye" },
          { name: "Sakarya Uygulamali Bilimler University", turkishName: "SAKARYA UYGULAMALI BİLİMLER ÜNİVERSİTESİ", city: "Sakarya", country: "Türkiye" },
        ],
      },
      {
        city: "Samsun",
        universities: [
          { name: "Ondokuz Mayis University", turkishName: "ONDOKUZ MAYIS ÜNİVERSİTESİ", city: "Samsun", country: "Türkiye" },
          { name: "Samsun University", turkishName: "SAMSUN ÜNİVERSİTESİ", city: "Samsun", country: "Türkiye" },
        ],
      },
      {
        city: "Siirt",
        universities: [
          { name: "Siirt University", turkishName: "SİİRT ÜNİVERSİTESİ", city: "Siirt", country: "Türkiye" },
        ],
      },
      {
        city: "Sinop",
        universities: [
          { name: "Sinop University", turkishName: "SİNOP ÜNİVERSİTESİ", city: "Sinop", country: "Türkiye" },
        ],
      },
      {
        city: "Sivas",
        universities: [
          { name: "Sivas Bilim Ve Teknoloji University", turkishName: "SİVAS BİLİM VE TEKNOLOJİ ÜNİVERSİTESİ", city: "Sivas", country: "Türkiye" },
          { name: "Sivas Cumhuriyet University", turkishName: "SİVAS CUMHURİYET ÜNİVERSİTESİ", city: "Sivas", country: "Türkiye" },
        ],
      },
      {
        city: "Şanlıurfa",
        universities: [
          { name: "Harran University", turkishName: "HARRAN ÜNİVERSİTESİ", city: "Şanlıurfa", country: "Türkiye" },
        ],
      },
      {
        city: "Şırnak",
        universities: [
          { name: "Şirnak University", turkishName: "ŞIRNAK ÜNİVERSİTESİ", city: "Şırnak", country: "Türkiye" },
        ],
      },
      {
        city: "Tekirdağ",
        universities: [
          { name: "Tekirdağ Namik Kemal University", turkishName: "TEKİRDAĞ NAMIK KEMAL ÜNİVERSİTESİ", city: "Tekirdağ", country: "Türkiye" },
        ],
      },
      {
        city: "Tokat",
        universities: [
          { name: "Tokat Gaziosmanpaşa University", turkishName: "TOKAT GAZİOSMANPAŞA ÜNİVERSİTESİ", city: "Tokat", country: "Türkiye" },
        ],
      },
      {
        city: "Trabzon",
        universities: [
          { name: "Avrasya University", turkishName: "AVRASYA ÜNİVERSİTESİ", city: "Trabzon", country: "Türkiye" },
          { name: "Karadeniz Teknik University", turkishName: "KARADENİZ TEKNİK ÜNİVERSİTESİ", city: "Trabzon", country: "Türkiye" },
          { name: "Trabzon University", turkishName: "TRABZON ÜNİVERSİTESİ", city: "Trabzon", country: "Türkiye" },
        ],
      },
      {
        city: "Tunceli",
        universities: [
          { name: "Munzur University", turkishName: "MUNZUR ÜNİVERSİTESİ", city: "Tunceli", country: "Türkiye" },
        ],
      },
      {
        city: "Uşak",
        universities: [
          { name: "Uşak University", turkishName: "UŞAK ÜNİVERSİTESİ", city: "Uşak", country: "Türkiye" },
        ],
      },
      {
        city: "Van",
        universities: [
          { name: "Van Yüzüncü Yil University", turkishName: "VAN YÜZÜNCÜ YIL ÜNİVERSİTESİ", city: "Van", country: "Türkiye" },
        ],
      },
      {
        city: "Yalova",
        universities: [
          { name: "Yalova University", turkishName: "YALOVA ÜNİVERSİTESİ", city: "Yalova", country: "Türkiye" },
        ],
      },
      {
        city: "Yozgat",
        universities: [
          { name: "Yozgat Bozok University", turkishName: "YOZGAT BOZOK ÜNİVERSİTESİ", city: "Yozgat", country: "Türkiye" },
        ],
      },
      {
        city: "Zonguldak",
        universities: [
          { name: "Zonguldak Bülent Ecevit University", turkishName: "ZONGULDAK BÜLENT ECEVİT ÜNİVERSİTESİ", city: "Zonguldak", country: "Türkiye" },
        ],
      },
    ],
  },
];

export { UNIVERSITY_DATA };

/** Flat list of all university entries (for search) */
export const ALL_UNIVERSITIES: UniversityEntry[] = UNIVERSITY_DATA.flatMap(
  (country) => country.cities.flatMap((city) => city.universities)
);

/** Flat list of university names (backwards compat) */
export const UNIVERSITIES = ALL_UNIVERSITIES.map((u) => u.name);

export type University = string;
