import type { Article, ContentType, IndustrySlug, Source } from "@/lib/types";
import { shortHash, slugify } from "@/lib/classify/text";

/**
 * DEMO MODE SAMPLE CONTENT
 * ------------------------
 * These items are illustrative samples used only when no real news has been
 * ingested. Every organization named here is FICTIONAL, nothing here reports a
 * real event, and the UI labels each item as "Sample" with no outbound link.
 */

export const DEMO_SOURCE: Source = {
  id: "demo",
  name: "AI Atlas sample content",
  url: "/admin",
  country: null,
  kind: "demo",
  reliability: 0.5,
};

type Row = [hoursAgo: number, events: string[], industries: IndustrySlug[], type: ContentType, title: string, summary: string, orgs: string[], topics: string[], mentioned?: string[]];

const ROWS: Row[] = [
  [2, ["KE"], ["healthcare"], "deployment", "Nairobi clinics pilot an AI triage assistant in Swahili and English", "A network of community clinics trials a bilingual triage assistant that helps nurses prioritise patients during peak hours.", ["Savanna Health Labs"], ["llms"]],
  [3, ["JP"], ["manufacturing"], "deployment", "Osaka electronics plant deploys vision models for zero-defect inspection", "A mid-sized electronics manufacturer reports moving its final inspection line to computer-vision models trained on its own defect library.", ["Kansai Precision Systems"], ["computer-vision", "robotics"]],
  [4, ["FR"], ["government"], "regulation", "French regulator opens consultation on AI in public hiring", "The consultation asks employers and unions how automated screening tools should be audited when used for public-sector recruitment.", ["Ministry of Public Service"], ["privacy"]],
  [5, ["IN"], ["agriculture"], "deployment", "Voice assistant helps Indian smallholders read soil test results", "A farmer-facing voice service translates soil reports into crop advice in eight Indian languages.", ["Krishi Signal AI"], ["multimodal", "climate-ai"]],
  [6, ["US"], ["general"], "products", "Open-weight reasoning model released with long-context benchmarks", "A research lab releases an open-weight model focused on step-by-step reasoning, publishing evaluation code alongside the weights.", ["Northbeam AI"], ["open-source", "llms"]],
  [7, ["BR"], ["finance"], "deployment", "Brazilian digital bank uses AI to flag instant-payment fraud in real time", "A digital bank says a new anomaly-detection model screens instant transfers before settlement.", ["Banco Aurora Digital"], []],
  [8, ["DE"], ["manufacturing", "energy"], "partnership", "German automakers and grid operator partner on AI-scheduled EV charging", "The partnership will test machine-learning forecasts to shift fleet charging away from grid peaks.", ["Rhein Mobility Group", "Nordnetz Energy"], ["climate-ai"]],
  [9, ["SG"], ["government", "finance"], "regulation", "Singapore publishes testing toolkit for generative AI in financial services", "The voluntary toolkit sets out evaluation steps for hallucination, bias and data leakage before deployment.", ["Monetary Innovation Office"], ["generative-ai", "ai-safety"]],
  [10, ["NG"], ["education"], "startups", "Lagos edtech startup raises seed round for AI tutoring in Yoruba and Hausa", "The startup builds mobile tutoring that adapts maths exercises to each learner's pace.", ["Ìmọ̀ Learning"], ["llms"]],
  [12, ["KR"], ["telecom"], "infrastructure", "Korean operator turns on edge AI inference across its 5G network", "Inference nodes at network edge sites aim to cut latency for on-device assistants and smart-factory workloads.", ["Hangang Telecom"], ["ai-chips"]],
  [13, ["AE"], ["government"], "infrastructure", "Abu Dhabi expands sovereign AI compute cluster", "A government-backed data center adds capacity reserved for national research and public-sector models.", ["Falcon Compute Authority"], ["sovereign-ai", "data-centers"]],
  [14, ["GB"], ["healthcare"], "research", "UK study finds AI-assisted mammography reading cut workload without missing cancers", "Researchers report that using AI as a second reader reduced radiologist workload in a retrospective study.", ["Thames Imaging Institute"], ["computer-vision"]],
  [16, ["CA"], ["general"], "research", "Montreal lab publishes method to make small models reason more reliably", "The paper describes a training recipe that improves consistency of small language models on multi-step problems.", ["Mont-Royal Learning Institute"], ["llms", "open-source"]],
  [18, ["CN"], ["transportation"], "deployment", "Shenzhen expands robotaxi service area to the airport corridor", "An autonomous-driving operator says its driverless fleet now serves routes linking the city centre and the airport.", ["Pearl River Autonomy"], ["autonomous-vehicles"]],
  [20, ["IL"], ["cybersecurity"], "startups", "Tel Aviv startup launches agent that triages security alerts", "The tool groups alerts into incidents and drafts an investigation plan for analysts to approve.", ["Sentinel Grove"], ["ai-agents"]],
  [22, ["ZA"], ["finance", "retail"], "products", "South African retailer adds AI budgeting coach to loyalty app", "The feature summarises spending patterns and suggests savings goals in plain language.", ["Karoo Retail Group"], ["generative-ai"]],
  [24, ["MX"], ["government"], "deployment", "Mexico City pilots AI to route citizen service requests", "The pilot classifies incoming reports such as potholes and water leaks and routes them to the right department.", ["Digital Agency of Mexico City"], ["llms"]],
  [26, ["SE", "FI"], ["energy"], "partnership", "Nordic utilities share data to forecast wind output with machine learning", "Two utilities pool turbine data to improve short-term forecasts used in power trading.", ["Boreal Grid", "Aalto Wind Systems"], ["climate-ai"]],
  [28, ["AU"], ["agriculture", "science"], "research", "Australian researchers use satellite AI to map drought stress paddock by paddock", "A model combining satellite imagery and weather data estimates crop stress at field scale.", ["Outback Earth Observation Lab"], ["climate-ai", "computer-vision"]],
  [30, ["RW"], ["healthcare", "transportation"], "deployment", "Rwanda's medical drone network adds AI route planning", "Route optimisation is used to schedule blood and vaccine deliveries to rural health centres.", ["Kivu Air Logistics"], ["robotics"]],
  [33, ["US"], ["legal"], "products", "Legal research assistant adds citations to every generated answer", "A legal-tech company says its assistant now links each statement to the source document it relied on.", ["Lexway"], ["generative-ai"]],
  [36, ["EG"], ["education", "government"], "partnership", "Egypt partners with universities on national Arabic language model", "The effort will curate Arabic text and train a model for public-sector and education use.", ["Nile Language Consortium"], ["sovereign-ai", "llms"]],
  [40, ["NL"], ["manufacturing"], "infrastructure", "Dutch chip-equipment supplier opens AI-driven process control lab", "The lab tests machine-learning control loops that adjust lithography settings during production.", ["Polder Photonics"], ["ai-chips"]],
  [44, ["SA"], ["energy", "government"], "investment", "Saudi fund backs AI startups focused on industrial efficiency", "A new fund will invest in companies applying AI to energy, water and heavy industry.", ["Najd Ventures"], []],
  [48, ["ES"], ["real-estate"], "startups", "Barcelona proptech uses AI to estimate renovation energy savings", "The startup estimates the impact of insulation and heat-pump upgrades from building photos and plans.", ["Casa Clara Analytics"], ["climate-ai", "computer-vision"]],
  [52, ["TW"], ["manufacturing"], "infrastructure", "Taiwanese server maker ramps liquid-cooled AI rack production", "The company says demand for high-density AI racks is driving a new assembly line.", ["Formosa Rackworks"], ["ai-chips", "data-centers"]],
  [56, ["CO"], ["agriculture"], "deployment", "Colombian coffee cooperative uses phone cameras to detect leaf rust early", "Growers photograph leaves and receive an early warning when the model detects signs of disease.", ["Andes Agro Vision"], ["computer-vision"]],
  [60, ["EE"], ["government"], "deployment", "Estonia adds AI assistant to its e-services portal", "The assistant helps residents find the right public service and pre-fill forms.", ["e-Government Agency"], ["ai-agents"]],
  [66, ["GH"], ["finance"], "startups", "Accra fintech uses alternative data to score first-time borrowers", "The lender uses mobile-money histories, with consent, to assess applicants without credit files.", ["Sika Credit"], []],
  [72, ["FR"], ["general"], "investment", "Paris AI lab closes Series B to scale enterprise assistants", "The company says the round will fund multilingual models for regulated industries.", ["Lumière AI"], ["llms", "generative-ai"]],
  [76, ["IN"], ["healthcare"], "deployment", "Bengaluru hospital network rolls out AI discharge summaries", "Doctors review and sign AI-drafted discharge summaries, which the network says saves documentation time.", ["Deccan Care Hospitals"], ["generative-ai"]],
  [82, ["CL"], ["energy", "science"], "research", "Chilean observatory data trains models to forecast solar output in the Atacama", "Researchers repurpose sky-imaging data to predict short-term solar-farm output.", ["Atacama Solar Institute"], ["climate-ai"]],
  [88, ["JP"], ["retail"], "products", "Tokyo convenience chain tests AI demand forecasting for fresh food", "Store-level forecasts aim to reduce waste of short-shelf-life products.", ["Hinode Mart"], []],
  [94, ["PL"], ["cybersecurity", "government"], "partnership", "Polish agencies team up with universities on deepfake detection", "The program funds tools to detect manipulated audio and video during elections.", ["Vistula Security Lab"], ["deepfakes"]],
  [100, ["VN"], ["manufacturing"], "investment", "Vietnam electronics hub attracts AI-enabled factory investment", "A manufacturer plans an automated plant using machine vision and predictive maintenance.", ["Red River Electronics"], ["robotics"]],
  [108, ["CH"], ["science", "healthcare"], "research", "Swiss team uses protein models to design candidate enzymes", "Researchers used generative protein models to propose enzymes and validated several in the lab.", ["Alpine Bio Design Lab"], ["generative-ai"]],
  [116, ["MA"], ["agriculture", "energy"], "deployment", "Moroccan farms test AI irrigation scheduling to save water", "Sensors and weather forecasts feed a model that decides when and how much to irrigate.", ["Atlas Water Tech"], ["climate-ai"]],
  [124, ["US", "GB"], ["general"], "regulation", "Allied safety institutes publish joint evaluation of frontier models", "The joint report describes pre-deployment tests for cyber and biological misuse risks.", ["Transatlantic AI Safety Network"], ["ai-safety"]],
  [132, ["ID"], ["retail", "marketing"], "products", "Jakarta e-commerce platform launches AI shopping assistant in Bahasa Indonesia", "The assistant answers product questions and compares listings in conversational Indonesian.", ["Nusantara Commerce"], ["generative-ai", "llms"]],
  [140, ["IE"], ["finance"], "regulation", "Irish regulator issues guidance on AI in insurance pricing", "The guidance asks insurers to explain automated pricing decisions to customers.", ["Financial Conduct Office of Ireland"], ["privacy"]],
  [150, ["AR"], ["education"], "startups", "Buenos Aires startup builds AI coding mentor for bootcamps", "The tool reviews student code and explains errors in Spanish.", ["Pampa Code Labs"], ["ai-talent"]],
  [160, ["SN"], ["agriculture", "government"], "partnership", "Senegal and regional researchers launch Wolof speech dataset", "The open dataset aims to support speech tools for farmers and public services.", ["Dakar Language Lab"], ["open-source", "multimodal"]],
  [170, ["TR"], ["transportation"], "deployment", "Istanbul port deploys AI to schedule container cranes", "The port says optimisation software reduces idle time between vessel arrivals.", ["Bosphorus Port Systems"], []],
  [180, ["NZ"], ["media"], "regulation", "New Zealand broadcasters adopt AI disclosure standard", "Broadcasters agree to label content substantially generated by AI.", ["Aotearoa Media Council"], ["deepfakes", "copyright"]],
  [190, ["PH"], ["marketing", "telecom"], "products", "Manila BPO firms adopt AI copilots for customer support", "Contact-centre agents use assistants that draft replies and summarise calls.", ["Luzon Outsourcing Group"], ["generative-ai", "ai-talent"]],
  [205, ["KR"], ["manufacturing"], "investment", "Korean humanoid robot startup raises growth round", "The company plans pilot deployments of humanoid robots in logistics warehouses.", ["Hanbit Robotics"], ["robotics"]],
  [220, ["DK"], ["healthcare"], "research", "Danish registry study tests AI for early heart-failure risk", "Researchers trained models on anonymised registry data to flag patients for earlier follow-up.", ["Øresund Health Data Institute"], []],
  [240, ["PK"], ["education"], "deployment", "Pakistani province pilots AI lesson planning for teachers", "Teachers receive AI-drafted lesson plans aligned with the provincial curriculum.", ["Indus Learning Initiative"], ["generative-ai"]],
  [260, ["QA"], ["transportation", "government"], "deployment", "Doha traffic center tests AI signal timing", "Adaptive signal timing is being trialled at busy intersections.", ["Doha Mobility Office"], []],
  [280, ["IT"], ["media"], "products", "Italian publisher launches AI audio editions of daily news", "Articles are converted to narrated audio with human editorial review.", ["Gazzetta Futura"], ["multimodal"]],
  [300, ["BD"], ["manufacturing", "retail"], "deployment", "Bangladeshi garment makers use AI to cut fabric waste", "Pattern-nesting software optimises how pieces are cut from fabric rolls.", ["Dhaka Textile Tech"], ["climate-ai"]],
  [330, ["UA"], ["government", "cybersecurity"], "deployment", "Ukrainian digital ministry uses AI to process public reports faster", "Incoming citizen reports are categorised automatically for faster handling.", ["Ministry of Digital Transformation"], []],
  [360, ["TH"], ["healthcare"], "partnership", "Bangkok hospitals partner on Thai medical speech recognition", "The partnership will build speech-to-text tuned for Thai medical vocabulary.", ["Chao Phraya Health Tech"], ["multimodal"]],
  [400, ["NO"], ["energy"], "research", "Norwegian researchers apply AI to predict offshore wind turbine faults", "Models trained on vibration data aim to schedule maintenance before failures.", ["Fjord Energy Research"], ["climate-ai"]],
  [450, ["MY"], ["energy"], "infrastructure", "Johor data center campus adds capacity for AI workloads", "The operator says new halls are designed for high-density GPU racks.", ["Straits Data Parks"], ["data-centers"]],
  [500, ["PT"], ["general"], "startups", "Lisbon startup builds open evaluation suite for Portuguese-language models", "The suite tests models on European and Brazilian Portuguese tasks.", ["Tejo Evals"], ["open-source", "llms"], ["BR"]],
  [560, [], ["general"], "research", "International survey maps how companies measure AI productivity gains", "A multi-country survey compares how firms track the impact of generative AI on work.", ["Global Productivity Observatory"], ["ai-talent", "generative-ai"]],
  [620, [], ["general"], "regulation", "Multilateral forum agrees principles for AI compute transparency", "Participants agreed voluntary principles for reporting large training runs.", ["Forum on Responsible Compute"], ["ai-safety"]],
];

export function buildDemoArticles(now = new Date()): Article[] {
  return ROWS.map(([hoursAgo, events, industries, contentType, title, summary, orgs, topics, mentioned = []]) => {
    const id = `demo-${shortHash(title)}`;
    const publishedAt = new Date(now.getTime() - hoursAgo * 3600_000 - 7 * 60_000).toISOString();
    return {
      id,
      slug: `${slugify(title)}-${id.slice(5)}`,
      title,
      summary,
      summarySource: "curated" as const,
      url: "",
      canonicalUrl: `demo://${id}`,
      imageUrl: null,
      language: "en",
      publishedAt,
      ingestedAt: publishedAt,
      source: DEMO_SOURCE,
      countries: [
        ...events.map((code) => ({ code, role: "event" as const, confidence: 1 })),
        ...mentioned.map((code) => ({ code, role: "mentioned" as const, confidence: 0.6 })),
      ],
      industries,
      contentType,
      topics,
      organizations: orgs,
      quality: 0.6 + ((hoursAgo * 7) % 30) / 100,
      coverage: 1, // no multi-outlet claims for sample items
      status: "classified" as const,
      trace: { geo: ["Sample content: labels curated by hand"], industries: [], type: [], method: "curated" as const },
      isDemo: true,
    };
  });
}
