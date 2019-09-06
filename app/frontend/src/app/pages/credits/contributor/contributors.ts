/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

export interface IAffiliation {
  readonly title: string;
  readonly city: string;
  readonly country: string;
  readonly link: string;
  readonly logo?: string;
}

export interface IContributor {
  readonly name: string;
  readonly affiliations: IAffiliation[];
}

export namespace Affiliations {
  /** Russia Affiliations */
  export const MSU: IAffiliation = {
    title:   'Moscow State University',
    city:    'Moscow',
    country: 'Russia',
    link:    'https://www.msu.ru/en/',
    logo:    'assets/images/universities/msu.jpg'
  };
  export const PIROGOV: IAffiliation = {
    title:   'Pirogov Russian Medical State University',
    city:    'Moscow',
    country: 'Russia',
    link:    'http://pirogov-university.com',
    logo:    'assets/images/universities/rnimu.png'
  };
  export const SHEMYAKIN: IAffiliation = {
    title:   'Shemyakin and Ovchinnikov Institute of Bioorganic Chemistry',
    city:    'Moscow',
    country: 'Russia',
    link:    'http://www.ibch.ru/en',
    logo:    'assets/images/universities/ibch.png'
  };
  export const SKOLKOVO: IAffiliation = {
    title:   'Skolkovo Institute of Science and Technology',
    city:    'Moscow',
    country: 'Russia',
    link:    'http://sk.ru/news/',
    logo:    'assets/images/universities/sk.jpg'
  };

  /** The Netherlands Affiliations */
  export const ORIGINS_CENTER: IAffiliation = {
    title:   'Origins Center',
    city:    'Groningen',
    country: 'The Netherlands',
    link:    'https://www.origins-center.nl',
    logo:    'assets/images/universities/origins.png'
  };
  export const AMSTERDAM: IAffiliation = {
    title:   'University of Amsterdam',
    city:    'Amsterdam',
    country: 'The Netherlands',
    link:    'https://www.uva.nl',
    logo:    'assets/images/universities/uoa.png'
  };
  export const UTRECHT: IAffiliation = {
    title:   'Utrecht University',
    city:    'Utrecht',
    country: 'The Netherlands',
    link:    'https://www.uu.nl/en',
    logo:    'assets/images/universities/utrecht.png'
  };
  export const UTRECHT_H: IAffiliation = {
    title:   'National Institute for Public Health and the Environment',
    city:    'Utrecht',
    country: 'The Netherlands',
    link:    'https://www.rivm.nl/en',
    logo:    'assets/images/universities/utrecht_h.jpeg'
  };
  export const NKI: IAffiliation = {
    title:   'Netherlands Cancer Institute',
    city:    'Amsterdam',
    country: 'The Netherlands',
    link:    'https://www.nki.nl',
    logo:    'assets/images/universities/nki.jpg'
  };

  /** Germany Affiliations */
  export const RUHR: IAffiliation = {
    title:   'Ruhr-University Bochum',
    city:    'Herne',
    country: 'Germany',
    link:    'https://www.ruhr-uni-bochum.de/en',
    logo:    'assets/images/universities/ruhr.jpg'
  };
  export const REGENERATIVE: IAffiliation = {
    title:   'Berlin-Brandenburg Center for Regenerative Therapies',
    city:    'Berlin',
    country: 'Germany',
    link:    'https://b-crt.de/en/home/',
    logo:    'assets/images/universities/regen.jpg'
  };

  /** Australia Affiliations */
  export const UNSW: IAffiliation = {
    title:   'University of New South Wales',
    city:    'Sydney',
    country: 'Australia',
    link:    'https://www.unsw.edu.au',
    logo:    'assets/images/universities/unsw.jpg'
  };
  export const MELBOURNE: IAffiliation = {
    title:   'University of Melbourne',
    city:    'Melbourne',
    country: 'Australia',
    link:    'https://www.unimelb.edu.au',
    logo:    'assets/images/universities/melbourne.jpg'
  };

  /** UK Affiliations */
  export const CARDIFF: IAffiliation = {
    title:   'Cardiff University',
    city:    'Cardiff',
    country: 'United Kingdom',
    link:    'https://www.cardiff.ac.uk',
    logo:    'assets/images/universities/cardiff.png'
  };

  /** USA Affiliations */
  export const NIAID: IAffiliation = {
    title:   'NIAID & NIH',
    city:    'Rockville',
    country: 'USA',
    link:    'https://www.niaid.nih.gov',
    logo:    'assets/images/universities/niaid.jpg'
  };
  export const STJUDE: IAffiliation = {
    title:   'St. Jude Children\'s Research Hospital',
    city:    'Memphis',
    country: 'USA',
    link:    'https://www.stjude.org',
    logo:    'assets/images/universities/stjude.png'
  };
}

export const contributors: IContributor[] = [
  /** Pirogov Contributors */
  { name: 'Dmitry V. Bagaev', affiliations: [ Affiliations.PIROGOV, Affiliations.MSU, Affiliations.SHEMYAKIN ] },
  { name: 'Mikhail Shugay', affiliations: [ Affiliations.PIROGOV, Affiliations.SHEMYAKIN, Affiliations.SKOLKOVO ] },
  { name: 'Ivan V. Zvyagin', affiliations: [ Affiliations.PIROGOV, Affiliations.SHEMYAKIN ] },
  { name: 'Dmitriy M. Chudakov', affiliations: [ Affiliations.PIROGOV, Affiliations.SHEMYAKIN, Affiliations.SKOLKOVO ] },
  { name: 'Ekaterina A Komech', affiliations: [ Affiliations.PIROGOV, Affiliations.SHEMYAKIN ] },

  /** Shemyakin Contributors */
  { name: 'Evgeny S. Egorov', affiliations: [ Affiliations.SHEMYAKIN ] },
  { name: 'Anastasiya L Sycheva', affiliations: [ Affiliations.SHEMYAKIN ] },

  /** Utrecht Contributors */
  { name: 'Renske M.A. Vroomans', affiliations: [ Affiliations.UTRECHT, Affiliations.ORIGINS_CENTER, Affiliations.AMSTERDAM ] },
  { name: 'Ewald Van Dyk', affiliations: [ Affiliations.UTRECHT ] },
  { name: 'Can Kesmir', affiliations: [ Affiliations.UTRECHT ] },

  /** Utrecht National Institute Contributors */
  { name: 'Debbie van Baarle', affiliations: [ Affiliations.UTRECHT_H ] },

  /** Cardiff Contributors */
  { name: 'Kristin Ladell', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'David K. Cole', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Andrew J. Godkin', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Andrew K Sewell', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Cristina R. Rius', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Garry Dolton', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Meriem Attaf', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Alexander Greenshields-Watson', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'James E. McLaren', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'Katherine K. Matthews', affiliations: [ Affiliations.CARDIFF ] },
  { name: 'David A. Price', affiliations: [ Affiliations.CARDIFF ] },

  /** RUHR Contributors */
  { name: 'Ulrik Stervbo', affiliations: [ Affiliations.RUHR, Affiliations.REGENERATIVE ] },
  { name: 'Nina Babel', affiliations: [ Affiliations.RUHR, Affiliations.REGENERATIVE ] },

  /** UNSW Contributors */
  { name: 'Jerome Samir', affiliations: [ Affiliations.UNSW ] },
  { name: 'Fabio Luciani', affiliations: [ Affiliations.UNSW ] },

  /** NIAID Contributors */
  { name: 'Daniel C. Douek', affiliations: [ Affiliations.NIAID ] },

  /** NKI Contributors */
  { name: 'Ton Schumacher', affiliations: [ Affiliations.NKI ] },

  /** Melbourne Contributors */
  { name: 'Bridie Clemens', affiliations: [ Affiliations.MELBOURNE ] },
  { name: 'Katherine Kedzierska', affiliations: [ Affiliations.MELBOURNE ] },

  /** STJUDE Contributors */
  { name: 'Jeremy C. Crawford', affiliations: [ Affiliations.STJUDE ] },
  { name: 'Pradyot Dash', affiliations: [ Affiliations.STJUDE ] },
  { name: 'Paul G. Thomas', affiliations: [ Affiliations.STJUDE ] }
].sort((l, r) => l.name.localeCompare(r.name));

export interface IContributorsAffiliationGroup {
  readonly affiliation: IAffiliation;
  readonly contributors: IContributor[];
}

export const contributorsGroupedByAffiliations: IContributorsAffiliationGroup[] = (() => {
  const groups: IContributorsAffiliationGroup[] = [];

  const map: Map<IAffiliation, IContributor[]> = new Map<IAffiliation, IContributor[]>();

  contributors.forEach((contributor) => {
    contributor.affiliations.forEach((affiliation) => {
      const cs = map.get(affiliation);
      map.set(affiliation, [ contributor, ...(cs !== undefined ? cs : []) ]);
    });
  });

  map.forEach((value, key) => groups.push({ affiliation: key, contributors: value }));

  groups.forEach((g) => g.contributors.sort((l, r) => l.name.localeCompare(r.name)));

  return groups;
})();
