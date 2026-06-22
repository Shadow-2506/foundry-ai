export const demoGeneratorService = {
  technologies: [
    'React 19', 'Next.js 15', 'Rust Core Engine', 'Go Microservices', 'Python FastAPI',
    'GraphQL Federation', 'PostgreSQL Sharding', 'Redis Cluster', 'Apache Kafka', 'Docker & K8s',
    'Tailwind CSS v4', 'TypeScript 5.5', 'WebAssembly', 'TensorFlow Lite', 'Supabase Auth',
    'Stripe Billing', 'Elasticsearch', 'AWS Lambda', 'Google Cloud Run', 'Vercel Edge'
  ],

  companies: [
    'FoundryAI', 'Apex Logistics', 'Nova Health', 'Quantum Finance', 'Stellar Retail',
    'AeroSpace Labs', 'BioTech Solutions', 'EcoSphere', 'CloudScale', 'DataVibe'
  ],

  architectures: [
    'Micro-frontends with Module Federation', 'Event-Driven Architecture with Kafka',
    'Serverless Edge Computing', 'Hexagonal Clean Architecture', 'CQRS with Event Sourcing',
    'Monolithic to Microservices Migration', 'Zero-Trust Security Architecture',
    'Multi-Region Active-Active Database Setup', 'Component-First Design System',
    'Server-Side Rendered (SSR) Static Generation'
  ],

  outcomes: [
    'Successfully reduced initial load times by 45%.',
    'Improved developer onboarding speed by 2x.',
    'Decreased cloud infrastructure costs by 30%.',
    'Achieved 99.99% uptime during peak traffic.',
    'Accelerated feature delivery cycles by 3 days.',
    'Eliminated legacy technical debt in core modules.',
    'Enhanced data security compliance to SOC2 standards.',
    'Boosted user engagement metrics by 18%.',
    'Reduced API response latency to under 50ms.',
    'Streamlined deployment pipeline to under 5 minutes.'
  ],

  risks: [
    'Potential legacy system integration overhead.',
    'Temporary learning curve for engineering teams.',
    'API rate limits and third-party dependency risks.',
    'Data migration complexity and potential downtime.',
    'Maintaining backward compatibility with older clients.',
    'Increased initial development effort and setup time.',
    'Security vulnerabilities in newly adopted packages.',
    'Resource constraints during the transition phase.',
    'Potential vendor lock-in with cloud providers.',
    'Complexity in debugging distributed microservices.'
  ],

  lessons: [
    'Component reusability is critical for long-term maintainability.',
    'Premature optimization leads to unnecessary architectural complexity.',
    'Comprehensive automated testing prevents regression bugs.',
    'Clear API contracts facilitate parallel frontend/backend development.',
    'Continuous monitoring is essential for serverless deployments.',
    'Standardizing design tokens ensures visual consistency.',
    'Investing in developer tooling pays off in velocity.',
    'Decoupling state management simplifies component logic.',
    'Regular security audits are non-negotiable for enterprise apps.',
    'User feedback should drive architectural refactoring decisions.'
  ],

  getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  getRandomSubset<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  generateProject(): { name: string; description: string } {
    const tech = this.getRandomItem(this.technologies);
    const company = this.getRandomItem(this.companies);
    const arch = this.getRandomItem(this.architectures);
    
    return {
      name: `${company} - ${tech} Integration`,
      description: `A strategic initiative to implement ${arch} using ${tech} to optimize performance and scalability.`
    };
  },

  generateDecision(): { title: string; description: string; outcome: string; department: string } {
    const tech = this.getRandomItem(this.technologies);
    const arch = this.getRandomItem(this.architectures);
    const outcome = this.getRandomItem(this.outcomes);
    
    return {
      title: `Adopt ${tech} for Core Services`,
      description: `Decided to standardize our core services on ${tech} using a ${arch} pattern to address scalability bottlenecks.`,
      outcome,
      department: this.getRandomItem(['Engineering', 'Product', 'Operations', 'Security'])
    };
  },

  generateLesson(): string {
    const lesson = this.getRandomItem(this.lessons);
    const tech = this.getRandomItem(this.technologies);
    return `${lesson} This was highly evident during our recent ${tech} migration.`;
  },

  generatePolicy(): string {
    const tech = this.getRandomItem(this.technologies);
    const arch = this.getRandomItem(this.architectures);
    return `All new initiatives must evaluate ${tech} and adhere to the ${arch} guidelines to ensure organizational alignment.`;
  }
};