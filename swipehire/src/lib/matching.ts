/**
 * matching.ts — local fallback scoring (used when the backend is unreachable)
 *
 * The primary scoring path is the Sentence-BERT backend (lib/api.ts).
 * This module provides:
 *   - parseCvs()              — split a pasted block into individual CV strings
 *   - mockCvs()               — realistic demo CVs for the "Load example" button
 *   - mockJobOffer()          — rich demo job description
 *   - buildCandidatesLocal()  — token-overlap fallback (no API required)
 */

import type { Candidate } from '../types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with',
  'as', 'is', 'are', 'be', 'from', 'this', 'that', 'it', 'your', 'you', 'we', 'our',
]);

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const summarize = (cvText: string): string => {
  const cleaned = cvText.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'No candidate summary available.';
  return cleaned.length > 170 ? `${cleaned.slice(0, 170)}...` : cleaned;
};

const SAMPLE_LOCATIONS = ['Madrid', 'Barcelona', 'Valencia', 'Remote (EU)', 'Seville', 'Bilbao'];

/** Split a block of text into individual CV strings (blank-line separator). */
export const parseCvs = (raw: string): string[] =>
  raw
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

/**
 * Local token-overlap scoring — used as a fallback when the backend is offline.
 */
export const scoreCandidate = (jobOffer: string, cvText: string): number => {
  const jobTokens = tokenize(jobOffer);
  const cvTokens = new Set(tokenize(cvText));
  if (!jobTokens.length) return 0;
  const hits = jobTokens.reduce((acc, token) => acc + Number(cvTokens.has(token)), 0);
  return Math.round((hits / jobTokens.length) * 100);
};

/**
 * Build Candidate objects using local scoring only (no API call).
 */
export const buildCandidatesLocal = (jobOffer: string, cvs: string[]): Candidate[] => {
  const jobTokens = tokenize(jobOffer);

  return cvs
    .map((text, index) => {
      const cvTokens = new Set(tokenize(text));
      const matched = jobTokens.filter((t) => cvTokens.has(t));
      const missing = jobTokens.filter((t) => !cvTokens.has(t));
      const matchScore = jobTokens.length
        ? Math.round((matched.length / jobTokens.length) * 100)
        : 0;

      // Try to extract name from the first line
      const firstLine = text.split('\n')[0].trim();
      const secondLine = (text.split('\n')[1] ?? '').trim();
      const nameWords = firstLine.split(/\s+/);
      const hasName =
        nameWords.length >= 2 &&
        nameWords.length <= 4 &&
        nameWords.every((w) => /^[A-Z]/.test(w)) &&
        !/\d/.test(firstLine);

      return {
        id: `local-${index + 1}-${Date.now()}`,
        name: hasName ? firstLine : `Candidate ${index + 1}`,
        role: secondLine || 'Applicant',
        location: SAMPLE_LOCATIONS[index % SAMPLE_LOCATIONS.length],
        yearsExperience: 3 + (index % 7),
        topSkills: matched.slice(0, 4),
        text,
        matchScore,
        summary: summarize(text),
        matchedKeywords: matched.slice(0, 15),
        missingKeywords: missing.slice(0, 10),
        explanation: `(Offline mode — keyword overlap only) ${matchScore}% of the job description's key terms were found in this profile. Matched: ${matched.slice(0, 5).join(', ') || 'none'}. For semantic scoring, start the backend server.`,
        scoreBreakdown: { semantic: matchScore, keywordCoverage: matchScore },
        scoredByAI: false,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

/**
 * Rich demo job description — used by the "Load example pipeline data" button.
 * Deliberately packed with keywords so SBERT can meaningfully differentiate candidates.
 */
export const mockJobOffer = (): string =>
  `We are looking for a Senior Full Stack Engineer to join our product team. The ideal candidate brings strong experience with React and TypeScript for building modern, performant web applications, Node.js for backend services and REST API design, and hands-on cloud deployment on AWS or GCP. You will collaborate closely with our HR and talent acquisition teams to build recruiter-facing features and improve candidate pipeline workflows. Strong communication skills and the ability to work cross-functionally with product managers, recruiters, and designers is essential. Experience with CI/CD pipelines, Docker, PostgreSQL, and software architecture is highly valued. We are looking for a product-minded engineer who takes ownership, writes clean maintainable code, and can translate complex hiring workflows into elegant software solutions.`;

/**
 * Ten realistic demo CVs — each formatted with a name on line 1, job title on
 * line 2, and structured content using single newlines (no blank lines within
 * a CV so parseCvs() keeps each one intact).
 *
 * Ranked roughly from best to worst match for the demo job offer above.
 */
export const mockCvs = (): string[] => [
  // ── 1. Excellent match ────────────────────────────────────────────────────
  `Elena Alvarez
Senior Full Stack Engineer
9 years experience | Madrid, Spain
Profile: Product-minded senior engineer with 9 years building React and TypeScript applications at scale. Expert in cloud deployment on AWS, REST API design, and cross-functional collaboration with HR and product teams. Led the end-to-end architecture of a recruiter-facing hiring platform serving 200+ talent acquisition specialists.
Technical Skills: React, TypeScript, Node.js, AWS (EC2, Lambda, S3), Docker, PostgreSQL, GraphQL, REST APIs, CI/CD, GitHub Actions, Tailwind CSS
Communication: Partnered with HR directors and product managers weekly to align roadmaps. Ran stakeholder demos and translated hiring workflow requirements into technical solutions.
Experience: Principal Engineer at HireFlow (2019–present) — architected candidate screening platform, built TypeScript dashboards for recruiters, deployed microservices on AWS. Senior Developer at StackBuild (2015–2019) — full-stack web apps for HR tech clients.`,

  // ── 2. Excellent match ────────────────────────────────────────────────────
  `Marcus Chen
Product Software Engineer
7 years experience | Barcelona, Spain
Profile: Full-stack engineer with a strong product mindset and 7 years of experience in React, TypeScript and Node.js. Passionate about building tools that empower recruiting teams and hiring managers. Extensive experience with cloud infrastructure on GCP and CI/CD automation.
Technical Skills: React, TypeScript, Node.js, GCP, Kubernetes, Docker, PostgreSQL, REST API, GraphQL, Jest, CI/CD pipelines
Collaboration: Worked embedded in product teams alongside recruiters, product managers and designers. Delivered candidate pipeline dashboards and ATS integrations. Presented at quarterly HR technology review sessions.
Experience: Senior Product Engineer at TalentOS (2021–present) — built React/TypeScript recruiter portal, REST API backend in Node.js, deployed on GCP. Software Engineer at DevBridge (2017–2021) — full-stack features for talent management SaaS.`,

  // ── 3. Good match ─────────────────────────────────────────────────────────
  `Priya Sharma
Frontend Developer
6 years experience | Valencia, Spain
Profile: Frontend-focused developer with 6 years of experience in React, TypeScript and modern CSS frameworks. Solid understanding of REST APIs and cloud basics. Comfortable collaborating with product and design teams on hiring-related web applications.
Technical Skills: React, TypeScript, Astro, Tailwind CSS, JavaScript, REST APIs, Git, Figma, basic AWS (S3, CloudFront), Webpack, Vite
Collaboration: Regular collaboration with product managers and UX designers to deliver recruiter-facing features. Good written and verbal communication skills. Participated in cross-functional sprint planning.
Experience: Senior Frontend Engineer at RecruitCraft (2022–present) — React/TypeScript UI for candidate tracking. Frontend Developer at WebAgency (2018–2022) — client-facing web applications.
Gaps: Limited backend experience; currently upskilling in Node.js and Docker.`,

  // ── 4. Good match ─────────────────────────────────────────────────────────
  `Daniel Costa
Cloud Platform Engineer
5 years experience | Remote (EU)
Profile: Cloud and DevOps specialist with 5 years of experience in AWS, GCP, Docker and Kubernetes. Strong in CI/CD automation, infrastructure as code, and backend API services. Some frontend experience with React. Worked alongside product teams to deploy recruitment tooling.
Technical Skills: AWS (EC2, RDS, Lambda, ECS), GCP, Docker, Kubernetes, Terraform, Node.js, REST APIs, PostgreSQL, Python, React (intermediate), GitHub Actions, CI/CD
Collaboration: Worked closely with engineering and product managers on deployment pipelines for HR technology platforms. Documented architecture and ran knowledge-sharing sessions.
Experience: Senior Cloud Engineer at NexaDeploy (2022–present) — AWS infrastructure for HR SaaS, Node.js microservices. Platform Engineer at CloudBase (2019–2022) — GCP deployments, Docker orchestration for recruitment software.`,

  // ── 5. Moderate match ─────────────────────────────────────────────────────
  `Amina Yusuf
Software Engineer
4 years experience | Seville, Spain
Profile: Software engineer with 4 years working in JavaScript, React and basic Node.js. Experience building internal tools and moderate cloud exposure on AWS. Comfortable working with product and recruiting teams in fast-paced environments.
Technical Skills: React, JavaScript, TypeScript (basic), Node.js, Express, MySQL, basic AWS (S3), Git, Agile/Scrum
Collaboration: Participated in cross-functional teams with product managers and HR coordinators. Decent communication skills and experience presenting work in sprint reviews.
Experience: Software Engineer at InternalTools Co (2022–present) — React dashboards and Node/Express APIs for HR operations. Junior Developer at WebStart (2020–2022) — JavaScript and basic React projects.
Note: Looking to deepen TypeScript and cloud deployment skills.`,

  // ── 6. Moderate match ─────────────────────────────────────────────────────
  `Luca Moretti
Backend Developer
5 years experience | Bilbao, Spain
Profile: Backend-focused developer with 5 years in Node.js, Express, REST API design and SQL databases. Good understanding of Docker and basic cloud services. Minimal frontend work but comfortable reading React code. Worked occasionally with product and HR stakeholders.
Technical Skills: Node.js, Express, TypeScript (backend), PostgreSQL, MySQL, Docker, REST APIs, Redis, basic AWS, Git, Mocha/Jest
Collaboration: Collaborated with product managers to define API contracts. Occasional communication with HR teams to understand workflow requirements. Written documentation and onboarding guides.
Experience: Senior Backend Developer at APIcraft (2021–present) — Node.js REST APIs and PostgreSQL for HR platform backend. Backend Engineer at DataServe (2019–2021) — Express services and database design.
Note: Limited React or frontend deployment experience; prefers backend and API work.`,

  // ── 7. Weak match ─────────────────────────────────────────────────────────
  `Sofia Marin
Data Analyst
4 years experience | Madrid, Spain
Profile: Data analyst with 4 years of experience in Python, SQL and business intelligence dashboards. Built reporting tools for HR and talent acquisition teams. Good communication and stakeholder management but no hands-on React, TypeScript or cloud deployment experience.
Technical Skills: Python (pandas, numpy, matplotlib), SQL, Tableau, Power BI, Excel, dbt, Looker, basic statistics
Communication: Strong written and verbal communication. Presented monthly hiring funnel reports to HR leadership. Worked closely with talent acquisition to understand recruiting KPIs.
Experience: Senior Data Analyst at PeopleMetrics (2022–present) — built hiring analytics dashboards for talent teams. Data Analyst at Insights Ltd (2020–2022) — SQL reports and Python pipelines for HR operations.
Note: No software engineering background; transitioning towards data engineering.`,

  // ── 8. Weak match ─────────────────────────────────────────────────────────
  `James Park
Machine Learning Engineer
6 years experience | Barcelona, Spain
Profile: Machine learning engineer with 6 years in Python, NLP, deep learning and MLOps. Experienced in building recommendation and screening systems using transformer models (BERT, sentence-transformers). Strong technical depth but limited product engineering stack and minimal React or TypeScript work.
Technical Skills: Python, PyTorch, TensorFlow, scikit-learn, sentence-transformers, BERT, NLP, MLflow, Docker, AWS SageMaker, FastAPI, SQL
Communication: Collaborated with data science teams and product managers on ML product features. Some experience explaining ML outputs to non-technical stakeholders in HR.
Experience: Senior ML Engineer at AI Talent (2021–present) — NLP models for candidate screening and resume ranking. ML Engineer at DeepHire (2018–2021) — recommendation systems for job matching.
Note: Interested in transitioning to a more product-engineering oriented role.`,

  // ── 9. Low match ──────────────────────────────────────────────────────────
  `Anna Fischer
QA Automation Engineer
3 years experience | Remote (EU)
Profile: QA engineer with 3 years of experience in test automation using Cypress and Playwright. Strong in defining test strategies and quality processes. Limited cloud architecture ownership and no TypeScript-heavy product delivery or frontend development.
Technical Skills: Cypress, Playwright, Selenium, JavaScript (test scripts), Postman, REST API testing, JIRA, TestRail, CI/CD (basic), Git
Collaboration: Good team player and communicator. Worked with developers and product managers to define acceptance criteria. Some experience with HR software quality testing.
Experience: QA Engineer at SoftTest (2023–present) — automated test suites for web platforms. Junior QA at QualityFirst (2021–2023) — manual and basic automated testing.
Note: Does not have experience in software development, cloud deployment, or React/TypeScript engineering.`,

  // ── 10. Very low match ────────────────────────────────────────────────────
  `Carlos Reyes
IT Support Specialist
2 years experience | Madrid, Spain
Profile: IT support specialist with 2 years of experience in systems administration, helpdesk support and end-user training. Strong communication and problem-solving skills but no background in modern web development, cloud architecture, React, TypeScript, Node.js or product engineering.
Technical Skills: Windows Server, Active Directory, Office 365, ticketing systems (ServiceNow, Zendesk), basic networking, hardware troubleshooting, end-user support
Communication: Excellent customer-facing communication. Trained users on software tools and documented IT procedures. Responsive and organised in high-volume support environments.
Experience: IT Support Specialist at TechDesk (2024–present) — level 2 support, network administration. IT Helpdesk Technician at SupportCo (2022–2024) — user support, hardware setup, ticket management.
Note: Looking to grow into a software development role; currently self-studying Python.`,
];
