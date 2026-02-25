export const PROJECTS = [
  {
    title: "Aivon Arena",
    highlight: true,
    year: "2026",
    status: "shipped", 
    description: "Real-time remote code execution engine scaling across ephemeral Docker instances. Supports Python, TypeScript, Java, and C++.",
    tags: ["Docker", "WebSockets", "Node.js", "Redis"],
    stats: { stars: 120, forks: 45 }
  },
  {
    title: "Learning Brain v2",
    highlight: false,
    year: "2026",
    status: "in-progress",
    description: "Ollama-based mentor system (Qwen3 context pipeline) providing Socratic problem-solving guidance over direct answers.",
    tags: ["Ollama", "Qwen3", "NLP Pipeline"],
    stats: { stars: 89, forks: 12 }
  },
  {
    title: "JWT RBAC Authenticator",
    highlight: false,
    year: "2025",
    status: "shipped",
    description: "A stateless, cross-service JWT authentication middleware supporting role-based logic.",
    tags: ["Security", "JWT", "Motia"],
    stats: { stars: 34, forks: 5 }
  },
  {
    title: "Leaderboard ELO Syncer",
    highlight: false,
    year: "2026",
    status: "in-progress",
    description: "Chron-based CRON service recalculating global ELO standings via background BullMQ queues.",
    tags: ["BullMQ", "PostgreSQL", "Prisma"],
    stats: { stars: 15, forks: 2 }
  }
];

export const LAB_NOTES = [
  {
    id: 1,
    date: "Feb 2026",
    title: "Scaling WebSockets in Next.js",
    description: "How we implemented a dual-server architecture decoupling stateless API requests from stateful Socket.IO connections.",
    gradient: "from-blue-500/20 to-cyan-500/20"
  },
  {
    id: 2,
    date: "Feb 2026",
    title: "Local LLM Inference with Ollama",
    description: "Routing prompts through Qwen2.5 Coder for error resolution and Qwen3 for Socratic dialogue without token cut-offs.",
    gradient: "from-purple-500/20 to-pink-500/20"
  },
  {
    id: 3,
    date: "Jan 2026",
    title: "Remote Code Execution Sandboxing",
    description: "A deep dive into restricting syscalls and mounting ephemeral networks using gVisor inside user payload containers.",
    gradient: "from-green-500/20 to-emerald-500/20"
  },
  {
    id: 4,
    date: "Dec 2025",
    title: "Building the Motia Framework",
    description: "Creating a step-based architecture framework mapping discrete API and Event procedures locally.",
    gradient: "from-orange-500/20 to-amber-500/20"
  }
];

export const WIP_ITEMS = [
  {
    title: "Aivon System Migration",
    description: "Converting the full-stack architecture to the Hacker Glassmorphism UI.",
    progress: 85
  },
  {
    title: "Python Sandbox Validation",
    description: "Testing strict edge cases within the Docker Execution pipeline.",
    progress: 95
  },
  {
    title: "Dynamic AI Routing logic",
    description: "Upgrading the heuristic classifier for prompt intent.",
    progress: 55
  },
  {
    title: "Multi-Language Autocomplete",
    description: "Porting robust Monaco Editor language server configurations.",
    progress: 30
  }
];
