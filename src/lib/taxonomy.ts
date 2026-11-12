import type { ContentType, IndustrySlug, RegionSlug } from "./types";

interface Labelled {
  en: string;
  fr: string;
}

export interface IndustryDef extends Labelled {
  slug: IndustrySlug;
  /** Lower-case keyword stems (EN + FR) used by the rules classifier. */
  keywords: string[];
  blurb: Labelled;
}

export const INDUSTRIES: IndustryDef[] = [
  { slug: "healthcare", en: "Healthcare", fr: "Santé", keywords: ["health", "hospital", "clinic", "patient", "medical", "medicine", "diagnos", "radiolog", "drug discovery", "pharma", "biotech", "cancer", "santé", "hôpital", "médic", "patient", "clinique", "protein", "genom"], blurb: { en: "Diagnostics, drug discovery and clinical operations.", fr: "Diagnostic, découverte de médicaments et opérations cliniques." } },
  { slug: "finance", en: "Finance", fr: "Finance", keywords: ["bank", "fintech", "finance", "financial", "payment", "insurance", "insurer", "trading", "credit", "lending", "fraud detection", "banque", "assurance", "paiement", "crédit", "stock exchange"], blurb: { en: "Banking, insurance, payments and capital markets.", fr: "Banque, assurance, paiements et marchés de capitaux." } },
  { slug: "education", en: "Education", fr: "Éducation", keywords: ["education", "school", "student", "teacher", "university", "classroom", "tutor", "edtech", "learning platform", "éducation", "école", "élève", "étudiant", "enseignant", "université"], blurb: { en: "Learning, tutoring and academic institutions.", fr: "Apprentissage, tutorat et institutions académiques." } },
  { slug: "manufacturing", en: "Manufacturing", fr: "Industrie", keywords: ["manufactur", "factory", "factories", "industrial", "robot", "assembly line", "supply chain", "semiconductor fab", "usine", "industriel", "robotique", "production line"], blurb: { en: "Factories, robotics and industrial automation.", fr: "Usines, robotique et automatisation industrielle." } },
  { slug: "retail", en: "Retail", fr: "Commerce", keywords: ["retail", "e-commerce", "ecommerce", "shopping", "store", "consumer goods", "merchant", "commerce", "magasin", "distribution", "supermarket"], blurb: { en: "Commerce, e-commerce and consumer experiences.", fr: "Commerce, e-commerce et expérience client." } },
  { slug: "energy", en: "Energy", fr: "Énergie", keywords: ["energy", "grid", "power plant", "electricity", "solar", "wind farm", "nuclear", "oil", "utility", "utilities", "battery", "énergie", "électricité", "réseau électrique", "data center power"], blurb: { en: "Grids, renewables, utilities and resources.", fr: "Réseaux, renouvelables, services publics et ressources." } },
  { slug: "transportation", en: "Transportation", fr: "Transports", keywords: ["autonomous vehicle", "self-driving", "driverless", "robotaxi", "transport", "logistics", "aviation", "airline", "railway", "shipping", "port", "traffic", "mobility", "véhicule autonome", "logistique", "ferroviaire", "aérien"], blurb: { en: "Autonomous mobility, logistics and aviation.", fr: "Mobilité autonome, logistique et aviation." } },
  { slug: "government", en: "Government", fr: "Secteur public", keywords: ["government", "ministry", "public sector", "parliament", "agency", "municipal", "city council", "public service", "gouvernement", "ministère", "secteur public", "administration", "état"], blurb: { en: "Public services, policy and administration.", fr: "Services publics, politiques et administration." } },
  { slug: "marketing", en: "Marketing", fr: "Marketing", keywords: ["marketing", "advertis", "brand", "campaign", "customer engagement", "publicité", "marque", "adtech"], blurb: { en: "Advertising, brands and customer engagement.", fr: "Publicité, marques et relation client." } },
  { slug: "real-estate", en: "Real Estate", fr: "Immobilier", keywords: ["real estate", "property", "proptech", "housing", "construction", "building", "immobilier", "logement", "bâtiment"], blurb: { en: "Property, construction and smart buildings.", fr: "Immobilier, construction et bâtiments intelligents." } },
  { slug: "cybersecurity", en: "Cybersecurity", fr: "Cybersécurité", keywords: ["cyber", "security", "malware", "ransomware", "phishing", "vulnerabilit", "threat", "hacker", "deepfake", "cybersécurité", "sécurité informatique"], blurb: { en: "Threat detection, defense and digital trust.", fr: "Détection des menaces, défense et confiance numérique." } },
  { slug: "agriculture", en: "Agriculture", fr: "Agriculture", keywords: ["agricultur", "farm", "crop", "harvest", "livestock", "agritech", "irrigation", "food security", "agriculteur", "récolte", "élevage"], blurb: { en: "Farming, food systems and climate resilience.", fr: "Agriculture, systèmes alimentaires et résilience climatique." } },
  { slug: "media", en: "Media & Culture", fr: "Médias & culture", keywords: ["media", "newsroom", "journalis", "film", "music", "entertainment", "publisher", "copyright", "artist", "médias", "journalisme", "cinéma", "musique", "droit d'auteur"], blurb: { en: "Newsrooms, creative industries and copyright.", fr: "Rédactions, industries créatives et droit d'auteur." } },
  { slug: "telecom", en: "Telecom", fr: "Télécoms", keywords: ["telecom", "5g", "6g", "network operator", "mobile operator", "carrier", "télécom", "opérateur"], blurb: { en: "Networks, operators and connectivity.", fr: "Réseaux, opérateurs et connectivité." } },
  { slug: "defense", en: "Defense", fr: "Défense", keywords: ["defense", "defence", "military", "armed forces", "drone warfare", "pentagon", "nato", "défense", "militaire", "armée"], blurb: { en: "Military, national security and dual-use AI.", fr: "Militaire, sécurité nationale et IA à double usage." } },
  { slug: "legal", en: "Legal", fr: "Juridique", keywords: ["law firm", "legal", "lawyer", "court", "lawsuit", "litigation", "judge", "avocat", "tribunal", "juridique", "procès"], blurb: { en: "Courts, law firms and legal services.", fr: "Tribunaux, cabinets et services juridiques." } },
  { slug: "science", en: "Science", fr: "Science", keywords: ["climate model", "physics", "chemistry", "materials", "astronomy", "weather forecast", "laboratory", "scientific", "scientifique", "météo", "climat"], blurb: { en: "Scientific discovery, climate and materials.", fr: "Découverte scientifique, climat et matériaux." } },
  { slug: "general", en: "Cross-industry", fr: "Transversal", keywords: [], blurb: { en: "Foundation models and economy-wide developments.", fr: "Modèles de fondation et développements transversaux." } },
];

export interface ContentTypeDef extends Labelled {
  slug: ContentType;
  keywords: string[];
}

/** Order matters: earlier types win ties in the rules classifier. */
export const CONTENT_TYPES: ContentTypeDef[] = [
  { slug: "regulation", en: "Regulation", fr: "Régulation", keywords: ["regulat", "law", "act ", "bill", "legislat", "policy", "ban", "guideline", "compliance", "oversight", "framework", "executive order", "réglement", "loi", "législ", "encadrement", "règles", "commission"] },
  { slug: "investment", en: "Investment", fr: "Investissement", keywords: ["raises", "raised", "funding", "series a", "series b", "series c", "seed round", "investment", "invests", "valuation", "acquire", "acquisition", "ipo", "billion", "million", "lève", "levée", "investissement", "rachat"] },
  { slug: "infrastructure", en: "Infrastructure", fr: "Infrastructure", keywords: ["data center", "datacenter", "supercomputer", "gpu", "chip", "semiconductor", "compute", "cloud region", "fab", "centre de données", "supercalculateur", "puce"] },
  { slug: "partnership", en: "Partnership", fr: "Partenariat", keywords: ["partner", "partnership", "collaborat", "alliance", "memorandum", "mou", "teams up", "joins forces", "partenariat", "s'associe", "accord"] },
  { slug: "research", en: "Research", fr: "Recherche", keywords: ["research", "study", "paper", "researchers", "scientists", "benchmark", "arxiv", "university", "published in", "recherche", "étude", "chercheurs"] },
  { slug: "startups", en: "Startups", fr: "Startups", keywords: ["startup", "start-up", "founder", "founded", "spin-off", "incubator", "accelerator", "jeune pousse"] },
  { slug: "deployment", en: "Real-world deployment", fr: "Déploiement réel", keywords: ["deploy", "rolls out", "rolled out", "pilot", "implement", "adopt", "in use", "launches in", "goes live", "déploie", "déploiement", "pilote", "met en service"] },
  { slug: "products", en: "Tools & products", fr: "Outils & produits", keywords: ["launch", "launches", "release", "unveil", "introduc", "model", "app", "feature", "update", "assistant", "lance", "dévoile", "nouvelle version"] },
  { slug: "innovation", en: "Innovation", fr: "Innovation", keywords: ["breakthrough", "first", "novel", "new approach", "innovation", "percée", "inédit"] },
];

export interface TopicDef {
  slug: string;
  en: string;
  fr: string;
  keywords: string[];
}

export const TOPICS: TopicDef[] = [
  { slug: "generative-ai", en: "Generative AI", fr: "IA générative", keywords: ["generative", "genai", "gen ai", "générative"] },
  { slug: "llms", en: "Language models", fr: "Modèles de langage", keywords: ["llm", "language model", "chatbot", "gpt", "claude", "gemini", "llama", "mistral", "modèle de langage"] },
  { slug: "ai-agents", en: "AI agents", fr: "Agents IA", keywords: ["agent", "agentic", "agents ia"] },
  { slug: "computer-vision", en: "Computer vision", fr: "Vision par ordinateur", keywords: ["computer vision", "image recognition", "facial recognition", "reconnaissance faciale", "vision"] },
  { slug: "robotics", en: "Robotics", fr: "Robotique", keywords: ["robot", "humanoid", "robotique", "humanoïde"] },
  { slug: "autonomous-vehicles", en: "Autonomous vehicles", fr: "Véhicules autonomes", keywords: ["autonomous vehicle", "self-driving", "driverless", "robotaxi", "véhicule autonome"] },
  { slug: "ai-chips", en: "AI chips & compute", fr: "Puces & calcul IA", keywords: ["chip", "gpu", "semiconductor", "npu", "tpu", "accelerator", "puce", "semi-conducteur"] },
  { slug: "data-centers", en: "Data centers", fr: "Centres de données", keywords: ["data center", "datacenter", "data centre", "centre de données"] },
  { slug: "ai-safety", en: "AI safety", fr: "Sûreté de l'IA", keywords: ["ai safety", "alignment", "safety institute", "red team", "sûreté", "sécurité de l'ia"] },
  { slug: "open-source", en: "Open source AI", fr: "IA open source", keywords: ["open source", "open-source", "open weights", "open-weight", "libre"] },
  { slug: "sovereign-ai", en: "Sovereign AI", fr: "IA souveraine", keywords: ["sovereign", "national ai", "souverain", "souveraineté"] },
  { slug: "deepfakes", en: "Deepfakes & misinformation", fr: "Deepfakes & désinformation", keywords: ["deepfake", "misinformation", "disinformation", "désinformation", "hypertrucage"] },
  { slug: "copyright", en: "Copyright & data rights", fr: "Droit d'auteur & données", keywords: ["copyright", "licensing deal", "training data", "droit d'auteur"] },
  { slug: "privacy", en: "Privacy", fr: "Vie privée", keywords: ["privacy", "gdpr", "personal data", "data protection", "vie privée", "rgpd", "données personnelles"] },
  { slug: "ai-talent", en: "Talent & skills", fr: "Talents & compétences", keywords: ["talent", "skills", "workforce", "jobs", "reskilling", "emploi", "compétences", "formation"] },
  { slug: "climate-ai", en: "AI for climate", fr: "IA pour le climat", keywords: ["climate", "emissions", "carbon", "weather", "climat", "carbone"] },
  { slug: "multimodal", en: "Multimodal AI", fr: "IA multimodale", keywords: ["multimodal", "video generation", "text-to-video", "speech", "voice", "multimodale"] },
];

export const REGIONS: { slug: RegionSlug; en: string; fr: string }[] = [
  { slug: "north-america", en: "North America", fr: "Amérique du Nord" },
  { slug: "latin-america", en: "Latin America & Caribbean", fr: "Amérique latine & Caraïbes" },
  { slug: "europe", en: "Europe", fr: "Europe" },
  { slug: "mena", en: "Middle East & North Africa", fr: "Moyen-Orient & Afrique du Nord" },
  { slug: "africa", en: "Sub-Saharan Africa", fr: "Afrique subsaharienne" },
  { slug: "asia", en: "Asia", fr: "Asie" },
  { slug: "oceania", en: "Oceania", fr: "Océanie" },
];

export const industryBySlug = new Map(INDUSTRIES.map((i) => [i.slug, i]));
export const typeBySlug = new Map(CONTENT_TYPES.map((t) => [t.slug, t]));
export const topicBySlug = new Map(TOPICS.map((t) => [t.slug, t]));
export const regionBySlug = new Map(REGIONS.map((r) => [r.slug, r]));

export function isIndustry(s: string): s is IndustrySlug {
  return industryBySlug.has(s as IndustrySlug);
}
export function isContentType(s: string): s is ContentType {
  return typeBySlug.has(s as ContentType);
}
export function isRegion(s: string): s is RegionSlug {
  return regionBySlug.has(s as RegionSlug);
}
