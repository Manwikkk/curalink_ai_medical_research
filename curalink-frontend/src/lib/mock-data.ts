import type {
  AnswerSection,
  ChatMessage,
  ClinicalTrial,
  Conversation,
  Publication,
  Source,
} from "./types";

export const examplePrompts = [
  "Latest treatment options for non-small cell lung cancer",
  "Active clinical trials for type 2 diabetes in Europe",
  "Top researchers in early-onset Alzheimer's disease",
  "Breakthroughs in CAR-T therapy for solid tumors",
  "Long-term outcomes of GLP-1 agonists in obesity",
];

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    title: "NSCLC immunotherapy outcomes",
    condition: "Non-small cell lung cancer",
    updatedAt: Date.now() - 1000 * 60 * 12,
    messageCount: 6,
  },
  {
    id: "c2",
    title: "Type 2 diabetes — GLP-1 trials",
    condition: "Type 2 diabetes",
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
    messageCount: 4,
  },
  {
    id: "c3",
    title: "Early Alzheimer's biomarkers",
    condition: "Alzheimer's disease",
    updatedAt: Date.now() - 1000 * 60 * 60 * 28,
    messageCount: 9,
  },
  {
    id: "c4",
    title: "Pediatric ALL CAR-T review",
    condition: "Acute lymphoblastic leukemia",
    updatedAt: Date.now() - 1000 * 60 * 60 * 72,
    messageCount: 3,
  },
  {
    id: "c5",
    title: "Heart failure with preserved EF",
    condition: "HFpEF",
    updatedAt: Date.now() - 1000 * 60 * 60 * 120,
    messageCount: 5,
  },
];

export const mockPublications: Publication[] = [
  {
    id: "p1",
    title:
      "Pembrolizumab plus chemotherapy versus chemotherapy alone for previously untreated metastatic non-squamous NSCLC: 5-year outcomes",
    authors: ["Gandhi L", "Rodríguez-Abreu D", "Gadgeel S", "Esteban E"],
    year: 2024,
    source: "PubMed",
    journal: "The Lancet Oncology",
    citations: 412,
    abstract:
      "In this updated 5-year analysis of KEYNOTE-189, pembrolizumab combined with pemetrexed-platinum chemotherapy continued to demonstrate clinically meaningful improvements in overall survival and progression-free survival across PD-L1 expression subgroups, with manageable safety.",
    url: "https://pubmed.ncbi.nlm.nih.gov/example/p1",
  },
  {
    id: "p2",
    title:
      "Tumor mutational burden as a predictive biomarker for immune checkpoint inhibitor response in advanced NSCLC",
    authors: ["Hellmann MD", "Ciuleanu T", "Pluzanski A"],
    year: 2023,
    source: "OpenAlex",
    journal: "New England Journal of Medicine",
    citations: 1284,
    abstract:
      "We assessed tumor mutational burden (TMB) as an independent predictor of response to dual checkpoint blockade. High TMB was associated with longer progression-free survival regardless of PD-L1 status, supporting TMB as a complementary stratification biomarker.",
    url: "https://openalex.org/works/example/p2",
  },
  {
    id: "p3",
    title:
      "Adagrasib in KRAS G12C–mutated advanced non-small cell lung cancer: efficacy and resistance mechanisms",
    authors: ["Jänne PA", "Riely GJ", "Gadgeel SM", "Heist RS"],
    year: 2024,
    source: "PubMed",
    journal: "Nature Medicine",
    citations: 287,
    abstract:
      "Adagrasib produced durable clinical activity in pretreated patients with KRAS G12C–mutated NSCLC. Resistance mechanisms included acquired RTK alterations and bypass MAPK reactivation, informing rational combination strategies.",
    url: "https://pubmed.ncbi.nlm.nih.gov/example/p3",
  },
  {
    id: "p4",
    title:
      "Real-world effectiveness of osimertinib as first-line therapy in EGFR-mutated advanced NSCLC: a multinational cohort",
    authors: ["Soria JC", "Ohe Y", "Vansteenkiste J"],
    year: 2023,
    source: "OpenAlex",
    journal: "JAMA Oncology",
    citations: 198,
    abstract:
      "In a real-world cohort of 3,412 patients across 14 countries, first-line osimertinib was associated with improved progression-free and overall survival compared with earlier-generation EGFR TKIs, including in patients with brain metastases at diagnosis.",
    url: "https://openalex.org/works/example/p4",
  },
];

export const mockTrials: ClinicalTrial[] = [
  {
    id: "t1",
    title:
      "A Phase 3 Study of Datopotamab Deruxtecan (Dato-DXd) Versus Docetaxel in Previously Treated Advanced NSCLC",
    status: "Recruiting",
    phase: "Phase 3",
    eligibility:
      "Adults ≥18 years with histologically confirmed advanced or metastatic NSCLC; progression after platinum-based chemotherapy and immunotherapy; ECOG 0–1.",
    location: "Memorial Sloan Kettering, New York, NY (and 142 sites globally)",
    contact: "TROPION-Lung01 Study Coordinator — trials@example.org",
    source: "ClinicalTrials.gov",
    sponsor: "Daiichi Sankyo / AstraZeneca",
    startDate: "2023-04-12",
  },
  {
    id: "t2",
    title:
      "Neoadjuvant Pembrolizumab Plus Chemotherapy in Resectable Stage II–IIIB NSCLC (KEYNOTE-671)",
    status: "Active, not recruiting",
    phase: "Phase 3",
    eligibility:
      "Treatment-naive resectable stage II, IIIA, or IIIB (T3-4N2) NSCLC; surgical candidate; adequate organ function.",
    location: "Multi-center — 189 sites across North America, Europe, Asia",
    contact: "Merck Clinical Trials Hotline — +1 (888) 577-8839",
    source: "ClinicalTrials.gov",
    sponsor: "Merck Sharp & Dohme",
    startDate: "2018-05-22",
  },
  {
    id: "t3",
    title:
      "Adagrasib in Combination With Pembrolizumab for First-Line Treatment of KRAS G12C–Mutated Advanced NSCLC",
    status: "Recruiting",
    phase: "Phase 2",
    eligibility:
      "Untreated advanced NSCLC with KRAS G12C mutation; PD-L1 TPS ≥1%; no actionable EGFR/ALK alteration.",
    location: "Dana-Farber Cancer Institute, Boston, MA (and 47 sites)",
    contact: "KRYSTAL-7 Study Team — krystal7@example.org",
    source: "ClinicalTrials.gov",
    sponsor: "Mirati Therapeutics",
    startDate: "2022-09-08",
  },
];

export const mockSources: Source[] = [
  {
    id: "s1",
    title:
      "Five-Year Outcomes With Pembrolizumab Plus Chemotherapy in Metastatic NSCLC",
    authors: ["Garassino MC", "Gadgeel S", "Speranza G"],
    year: 2024,
    platform: "PubMed",
    url: "https://pubmed.ncbi.nlm.nih.gov/example/s1",
    snippet:
      "Sustained overall survival benefit (HR 0.60) was observed at 5 years for pembrolizumab plus pemetrexed-platinum versus chemotherapy alone, with no new safety signals.",
  },
  {
    id: "s2",
    title: "NCCN Clinical Practice Guidelines in Oncology: NSCLC, Version 5.2024",
    authors: ["NCCN Panel"],
    year: 2024,
    platform: "NIH",
    url: "https://www.nccn.org/example/s2",
    snippet:
      "First-line therapy recommendations for advanced NSCLC are stratified by histology, PD-L1 expression, and the presence of actionable driver alterations including EGFR, ALK, ROS1, KRAS G12C, and MET.",
  },
  {
    id: "s3",
    title:
      "Global Burden of Lung Cancer: Incidence, Mortality, and Disability-Adjusted Life Years",
    authors: ["WHO Global Cancer Observatory"],
    year: 2023,
    platform: "WHO",
    url: "https://gco.iarc.fr/example/s3",
    snippet:
      "Lung cancer remains the leading cause of cancer-related mortality worldwide, with 2.48 million new cases and 1.81 million deaths estimated in 2023.",
  },
];

export const mockAnswer: AnswerSection = {
  conditionOverview:
    "Non-small cell lung cancer (NSCLC) accounts for approximately 85% of lung cancer cases. Treatment is increasingly stratified by histology, PD-L1 expression, and the presence of actionable molecular alterations (EGFR, ALK, ROS1, BRAF, KRAS G12C, MET, RET, NTRK, HER2). For metastatic disease without driver mutations, first-line standard of care typically combines anti–PD-1/PD-L1 immunotherapy with platinum-based chemotherapy.",
  personalizedInsights:
    "Based on the uploaded pathology report (adenocarcinoma, PD-L1 TPS 65%, KRAS G12C positive, EGFR/ALK wild-type), the patient profile aligns with first-line pembrolizumab combination therapy and is also a candidate for KRAS G12C–targeted regimens such as adagrasib, including ongoing combination trials.",
  researchInsights:
    "Recent evidence (2023–2024) reinforces durable 5-year survival gains with pembrolizumab plus chemotherapy in non-squamous NSCLC. Real-world data confirm osimertinib's first-line superiority in EGFR-mutated disease, while novel KRAS G12C inhibitors and antibody-drug conjugates such as datopotamab deruxtecan are reshaping later-line options.",
  publications: mockPublications,
  trials: mockTrials,
  sources: mockSources,
};

export const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content:
      "What are the latest first-line treatment options for metastatic non-small cell lung cancer with high PD-L1 expression?",
    timestamp: Date.now() - 1000 * 60 * 14,
    context: {
      condition: "Non-small cell lung cancer",
      intent: "Treatment options",
      location: "United States",
    },
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Here is a synthesized overview based on current literature, active trials, and the clinical context you provided.",
    timestamp: Date.now() - 1000 * 60 * 13,
    answer: mockAnswer,
  },
];
