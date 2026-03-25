/**
 * Ordjakt – nivå 1–7: 60 ord vardera (6 omgångar à 10). Måltid 2 min 30 s (150 s) på alla ordinarie nivåer.
 * Minuttest: 150 ord, långsammare progression, mest vardagssvenska (5–8 bokstäver i stora delen).
 */
window.ordjaktLevels = [
  {
    id: 1,
    title: "Nivå 1",
    targetTimeSeconds: 150,
    words: [
      "av", "på", "ur", "om", "en", "ett", "två", "tre", "fyra", "fem",
      "sex", "sju", "nio", "tio", "ja", "nej", "nu", "så", "här", "dit",
      "där", "mer", "oss", "ni", "vi", "du", "jag", "han", "hon", "den",
      "det", "dem", "min", "din", "vår", "er", "sin", "sig", "har", "var",
      "är", "bli", "gå", "se", "ge", "ta", "ha", "hus", "bil", "sol",
      "år", "tid", "väg", "bro", "by", "rum", "kö", "dörr", "bok", "mat"
    ]
  },
  {
    id: 2,
    title: "Nivå 2",
    targetTimeSeconds: 150,
    words: [
      "skola", "penna", "fisk", "bröd", "mjölk", "bord", "stol", "katt", "hund", "barn",
      "vägg", "hatt", "skor", "rock", "jacka", "mössa", "vante", "byxor", "tröja", "kjol",
      "sko", "båt", "tåg", "buss", "taxi", "stad", "land", "åker", "myra", "ost",
      "kött", "fläsk", "ägg", "soppa", "sås", "salt", "smör", "olja", "te", "öl",
      "kaka", "tårta", "glass", "bulle", "limpa", "råg", "havre", "ris", "pasta", "nöt",
      "lamm", "anka", "gås", "hare", "öring", "älg", "hjort", "varg", "björn", "säl"
    ]
  },
  {
    id: 3,
    title: "Nivå 3",
    targetTimeSeconds: 150,
    words: [
      "skriva", "lämna", "hämta", "sända", "behöva", "tycka", "vilja", "kunna", "måste", "borde",
      "skulle", "kunde", "ville", "aldrig", "alltid", "annars", "bakom", "börja", "invid", "därför",
      "endast", "fastän", "genom", "gärna", "ganska", "hjälpa", "ibland", "ingen", "inget", "jämför",
      "kanske", "knapp", "kring", "liten", "längre", "medan", "mellan", "minst", "mycket", "nästa",
      "någon", "något", "några", "numera", "oftast", "också", "prata", "rimlig", "sedan", "sällan",
      "samma", "sidan", "sista", "sluta", "snart", "spara", "stark", "svagt", "söker", "tänka"
    ]
  },
  {
    id: 4,
    title: "Nivå 4",
    targetTimeSeconds: 150,
    words: [
      "bibliotek", "klassrum", "lärare", "läsning", "räkning", "skrivning", "bokstav", "bokhylla", "bokmärke", "skolmat",
      "skolkök", "skollov", "skolår", "skolbild", "skolform", "skolstart", "skolslut", "skolplan", "skolchef", "skolhus",
      "klassen", "läraren", "eleven", "rasten", "matten", "engelska", "historia", "geografi", "biologi", "religion",
      "tentamen", "betygsbok", "omdöme", "föräldrar", "skolgård", "matsal", "rektor", "mentor", "kurator", "busskort",
      "gympasal", "gymnastik", "lagspel", "fairplay", "regelbok", "domare", "domslut", "straff", "utvisning", "målvakt",
      "försvar", "anfall", "mittfält", "passning", "målskott", "målchans", "suddgummi", "pennvässa", "stavning", "stavfel"
    ]
  },
  {
    id: 5,
    title: "Nivå 5",
    targetTimeSeconds: 150,
    words: [
      "skolgård", "järnvägslinje", "fotbollsplan", "simanläggning", "badhusbyggnad", "bibliotekarie", "klasskamrat", "studieplan", "läroplan", "kunskapskrav",
      "bedömningsmatris", "självbedömning", "kamratbedömning", "utvecklingssamtal", "åtgärdsprogram", "extraanpassning", "undervisningsgrupp", "språkvalskurs", "modersmålsundervisning", "studievägledare",
      "biblioteksbesök", "läsfrämjande", "naturvetenskap", "samhällsvetenskap", "humanvetenskap", "matematiksvårigheter", "rättstavning", "stavningsregel", "stavningslek", "ordbildning",
      "sammansättning", "grundord", "sammansatt", "särskrivning", "särskrivningsfel", "bestämdform", "obestämd", "substantiv", "adjektiv", "verbform",
      "tempuslära", "preteritum", "supinumform", "particip", "bisatsled", "huvudsats", "satsraden", "textbindning", "texttyper", "berättande",
      "beskrivande", "instruerande", "argumenterande", "jämförande", "sammanfattande", "översiktlig", "detaljerad", "huvudtanke", "stödmening", "slutsats"
    ]
  },
  {
    id: 6,
    title: "Nivå 6",
    targetTimeSeconds: 150,
    words: [
      "självständighetsförklaring", "miljökonsekvensbeskrivning", "grundlagstillämpning", "riksdagsordning", "regeringsform", "successionsordning", "tryckfrihetsförordning", "yttrandefrihetsgrundlag", "kommunfullmäktige", "regionfullmäktige",
      "folkomröstningsförfarande", "proportionalitetsprincip", "rättssäkerhetsgaranti", "integritetskyddsombud", "personuppgiftsbiträde", "dataskyddsförordning", "kakvarningsmeddelande", "säkerhetskopieringsrutin", "lösenordsåterställning", "tvåfaktorsautentisering",
      "översättningsminne", "språkteknologiverktyg", "korpuslingvistik", "morfologi", "syntaktik", "semantik", "pragmatik", "diskursanalys", "narratologi", "intertextualitet",
      "epistemologi", "ontologi", "metodologi", "hypotesprövning", "stickprovsfördelning", "signifikansnivå", "konfidensintervall", "regressionsanalys", "korrelationskoefficient", "kausalitetsproblem",
      "historiematerialism", "idealtyp", "hermeneutik", "fenomenologi", "etnografi", "longitudinell", "kvantitativ", "kvalitativ", "fokusgrupp", "enkätundersökning",
      "bildningsidealtradition", "folkbildningsrörelse", "studiecirkelledning", "läromedelsutvärdering", "bedömningsunderlag", "åtgärdsprogramskrivning", "särskiltstödinsats", "anpassningsåtgärder", "dokumentationsplikt", "sekretessprövning"
    ]
  },
  {
    id: 7,
    title: "Nivå 7",
    targetTimeSeconds: 150,
    words: [
      "multidisciplinäransats", "tvärvetenskapligmetod", "transdisciplinärproblemlösning", "interdisciplinärforskning", "vetenskapsfilosofiskgrund", "verklighetsuppfattningsfråga", "hermeneutisktolkningsproblem", "fenomenologiskbeskrivning", "poststrukturalistiskanalys", "postkolonialidentitetsfråga",
      "marknadsrationalitetskritik", "institutionellteoriramverk", "organisationskulturstudie", "maktresursfördelning", "socialrättviseprincip", "distributivrättvisebegrepp", "erkännandeteoretiskansats", "deliberativdemokratimodell", "participatoriskplanering", "transparensprincipimplementering",
      "hållbarhetsutvecklingsmål", "klimatpåverkansberäkning", "koldioxidavtrycksreducering", "cirkulärekonomiprincip", "biologiskmångfaldsstrategi", "ekosystemtjänstvärdering", "miljöbalkstillämpning", "naturvårdsbiotopskydd", "vattenförvaltningsområde", "övergödningsåtgärdsprogram",
      "neurovetenskapligkognitionsforskning", "psykofarmakologiskbehandling", "epidemiologiskriskbedömning", "statistiskosäkerhetsmarginal", "randomiseradkontrolleradstudie", "metastudiesystematisköversikt", "peerreviewkvalitetsgranskning", "forskningsetiskprövningsnämnd", "informationsmedgivandeprocess", "personidentitetsskyddsregel",
      "digitaliseringsstrategiimplementering", "cybersäkerhetsincidenthantering", "informationsklassificeringsmodell", "kryptografisknyckelhantering", "blockkedjetekniktillämpning", "algoritmiskbeslutsfattandeetik", "maskininlärningsmodellträning", "datadrivenprediktionsanalys", "robotiseringsarbetsmarknadseffekt", "automationstekniskprocessoptimering",
      "internationellrättskipningsmekanism", "folkrättssubjektstatus", "diplomatiskimmunitetsprincip", "humanitärrättsskyddsnorm", "flyktingkonventionstillämpning", "asylrättsligprövningsordning", "gränskontrollsamverkansmodell", "migrationsekonomiskonsekvens", "integrationspolitiskåtgärdsprogram", "mångfaldsstrategiförankring"
    ]
  }
];

/**
 * Minuttest: 150 unika ord, blandade kategorier (substantiv/verb/adj.) och teman – stigande svårighet.
 */
window.ordjaktMinuteWords = [
  "katt", "springa", "glad", "bord", "regn", "läsa", "varm", "skor", "moln", "vila",
  "hund", "simma", "snäll", "stol", "vind", "skriva", "kall", "hatt", "sand", "lyssna",
  "fisk", "dansa", "mjuk", "jacka", "berg", "tänka", "hård", "vägg", "buske", "sova",
  "bröd", "baka", "sötma", "klocka", "träd", "städa", "trött", "spegel", "bäck", "rita",
  "barn", "hoppa", "pigg", "lampa", "fors", "grilla", "lugn", "säng", "dimma", "minnas",
  "blomma", "klättra", "surhet", "trappa", "årstid", "vänta", "rödton", "fönster", "stjärna", "drömma",
  "gris", "steka", "finurlig", "kastrull", "ekorre", "parkera", "falsk", "tallrik", "måne", "vakna",
  "tomat", "skala", "mogen", "gryta", "fågel", "lyfta", "seghet", "balkong", "villa", "solstråle",
  "äpple", "koka", "bitter", "morot", "cykel", "dyrbar", "vacker", "radhus", "purjolök", "grädde",
  "banan", "skära", "väldig", "kanna", "råtta", "sväva", "tveksam", "dörr", "igelkott", "näbbmus",
  "lingon", "viska", "elak", "zucchini", "hare", "rosta", "stolt", "paprika", "vildgås", "vissla",
  "jordgubbe", "gnida", "latmask", "avokado", "anka", "sucka", "ärlig", "aubergine", "tupp", "knorra",
  "semester", "berättelse", "nervös", "födelsedag", "midnatt", "överväga", "bekymrad", "motorcykel", "sparkcykel", "midsommar",
  "kustband", "förklara", "otydlig", "havsvik", "gryning", "beundra", "nyfiken", "bostadskök", "takås", "norrsken",
  "hallon", "misstänka", "tystlåten", "körsbär", "krusbär", "erkänna", "förvirrad", "regnbåge", "stormby", "tågstation"
];
