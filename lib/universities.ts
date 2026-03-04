export interface UniversityEntry {
  name: string;
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
        city: "Istanbul",
        universities: [
          "Istinye University",
          "Altinbas University",
          "Atlas University",
          "Bahcesehir University",
          "Beykent University",
          "Beykoz University",
          "Bilgi University (Istanbul Bilgi)",
          "Biruni University",
          "Bogazici University",
          "Cerrahpasa University (Istanbul University-Cerrahpasa)",
          "Dogus University",
          "Esenyurt University",
          "Galatasaray University",
          "Gedik University",
          "Halic University",
          "Isik University",
          "Istanbul Arel University",
          "Istanbul Aydin University",
          "Istanbul Commerce University (Istanbul Ticaret)",
          "Istanbul Gelisim University",
          "Istanbul Kent University",
          "Istanbul Kultur University",
          "Istanbul Medeniyet University",
          "Istanbul Medipol University",
          "Istanbul Okan University",
          "Istanbul Sabahattin Zaim University",
          "Istanbul Technical University (ITU)",
          "Istanbul Topkapi University",
          "Istanbul University",
          "Kadir Has University",
          "Koc University",
          "Maltepe University",
          "Marmara University",
          "MEF University",
          "Nisantasi University",
          "Piri Reis University",
          "Sabanci University",
          "Turkish-German University",
          "Uskudar University",
          "Yeditepe University",
          "Yildiz Technical University",
        ].map((name) => ({ name, city: "Istanbul", country: "Türkiye" })),
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
