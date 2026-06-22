export const MOCK_DATA = {
  fitnessScore: 84,
  activeProjects: 12,
  totalDecisions: 1240,
  memoryEntries: 4521,
  lessonsLearned: 328,
  
  recentDecisions: [
    { id: 1, title: "Migrate to Micro-frontends", date: "2024-03-15", status: "Implemented", impact: "High" },
    { id: 2, title: "Adopt Rust for Core Engine", date: "2024-03-10", status: "In Review", impact: "Critical" },
    { id: 3, title: "Remote-First Policy Update", date: "2024-03-05", status: "Active", impact: "Medium" },
  ],
  
  recentLessons: [
    { id: 1, title: "Database Sharding Complexity", category: "Infrastructure", lesson: "Premature sharding led to 2x maintenance overhead." },
    { id: 2, title: "AI Model Hallucinations", category: "Product", lesson: "Human-in-the-loop is essential for legal document summaries." },
  ],
  
  genome: [
    { subject: 'Innovation', A: 120, B: 110, fullMark: 150 },
    { subject: 'Quality', A: 98, B: 130, fullMark: 150 },
    { subject: 'Speed', A: 86, B: 130, fullMark: 150 },
    { subject: 'Risk Tolerance', A: 99, B: 100, fullMark: 150 },
    { subject: 'Cost Sensitivity', A: 85, B: 90, fullMark: 150 },
    { subject: 'Reliability', A: 65, B: 85, fullMark: 150 },
    { subject: 'Adaptability', A: 110, B: 120, fullMark: 150 },
  ],
  
  evolutionData: [
    { month: 'Jan', score: 65, innovation: 40, quality: 70 },
    { month: 'Feb', score: 68, innovation: 45, quality: 72 },
    { month: 'Mar', score: 72, innovation: 55, quality: 75 },
    { month: 'Apr', score: 75, innovation: 60, quality: 78 },
    { month: 'May', score: 80, innovation: 75, quality: 82 },
    { month: 'Jun', score: 84, innovation: 85, quality: 85 },
  ],
  
  memoryVault: [
    { id: 1, type: 'Decision', title: 'Cloud Provider Selection', date: '2023-10-12', tags: ['Infrastructure', 'Cost'] },
    { id: 2, type: 'Success', title: 'Q3 Product Launch', date: '2023-09-30', tags: ['Product', 'Marketing'] },
    { id: 3, type: 'Failure', title: 'Legacy API Deprecation', date: '2023-08-15', tags: ['Engineering', 'Breaking Change'] },
    { id: 4, type: 'Lesson', title: 'Onboarding Bottlenecks', date: '2023-07-20', tags: ['HR', 'Operations'] },
    { id: 5, type: 'Policy', title: 'Security First Protocol', date: '2023-06-01', tags: ['Security', 'Compliance'] },
  ],
  
  timeMachine: {
    question: "Why did we choose React?",
    timeline: [
      { year: '2018', event: 'Initial Evaluation', detail: 'Compared React, Vue, and Angular.' },
      { year: '2019', event: 'Pilot Project', detail: 'Internal dashboard built with React.' },
      { year: '2020', event: 'Standardization', detail: 'React declared official frontend framework.' },
      { year: '2024', event: 'Current State', detail: '95% of frontend codebase is React.' },
    ]
  }
};
