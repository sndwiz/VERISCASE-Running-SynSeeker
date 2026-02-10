export interface VibeResource {
  name: string;
  url: string;
  description: string;
  category: string;
}

export const VIBE_RESOURCE_CATEGORIES = [
  "browser-tools",
  "ides",
  "plugins",
  "cli-tools",
  "task-management",
  "documentation",
  "communities",
  "learning",
] as const;

export const VIBE_CATEGORY_LABELS: Record<string, string> = {
  "browser-tools": "Browser-based Tools",
  "ides": "IDEs & Code Editors",
  "plugins": "Plugins & Extensions",
  "cli-tools": "Command Line Tools",
  "task-management": "Task Management",
  "documentation": "Documentation",
  "communities": "Communities & Jobs",
  "learning": "Learning & News",
};

export const VIBE_RESOURCES: VibeResource[] = [
  { name: "Bolt.new", url: "https://bolt.new/", description: "Prompt, run, edit, and deploy full-stack web and mobile apps", category: "browser-tools" },
  { name: "Lovable", url: "https://lovable.dev/", description: "Idea to app in seconds. Your superhuman full stack engineer", category: "browser-tools" },
  { name: "v0 by Vercel", url: "https://v0.dev/chat", description: "AI assistant to build Next.js frontend components", category: "browser-tools" },
  { name: "Replit", url: "https://replit.com/", description: "Describe your idea and let the Agent build it for you", category: "browser-tools" },
  { name: "Firebase Studio", url: "https://studio.firebase.google.com/", description: "Google's agentic cloud-based environment for production-quality full-stack AI apps", category: "browser-tools" },
  { name: "Tempo", url: "https://www.tempo.new/", description: "Build React apps 10x faster with AI", category: "browser-tools" },
  { name: "Softgen", url: "https://softgen.ai/", description: "Describe your vision and build full-stack web apps", category: "browser-tools" },
  { name: "Create", url: "https://www.create.xyz/", description: "Turn your words into sites, tools, apps, and products", category: "browser-tools" },
  { name: "Capacity", url: "https://capacity.so/", description: "Turn ideas into fully functional web apps in minutes using AI", category: "browser-tools" },
  { name: "CHAI.new", url: "https://chai.new/", description: "Prompt to vibe code any AI agent and deploy", category: "browser-tools" },
  { name: "Lazy AI", url: "https://getlazy.ai/", description: "Build reliable business apps with prompts", category: "browser-tools" },
  { name: "HeyBoss", url: "https://www.heyboss.xyz/", description: "Build apps and sites in minutes", category: "browser-tools" },
  { name: "Rork", url: "https://rork.app/", description: "Build any mobile app, fast", category: "browser-tools" },
  { name: "Napkins.dev", url: "https://www.napkins.dev/", description: "Screenshot to code conversion", category: "browser-tools" },
  { name: "Rocket.new", url: "https://www.rocket.new/", description: "Build Web and Mobile Apps 10x Faster Without Code", category: "browser-tools" },
  { name: "Google AI Studio", url: "https://aistudio.google.com/", description: "Vibecode with Gemini. Great for experimenting", category: "browser-tools" },
  { name: "HeroUI Chat", url: "https://heroui.chat/", description: "Generate beautiful apps regardless of your design experience", category: "browser-tools" },
  { name: "Trickle AI", url: "https://www.trickle.so/", description: "Build stunning websites, AI apps, and forms with ease", category: "browser-tools" },
  { name: "Creatr", url: "https://getcreatr.com/", description: "Create and deploy web apps and landing pages in seconds", category: "browser-tools" },

  { name: "Cursor", url: "https://www.cursor.com/", description: "AI Code Editor - the best way to code with AI", category: "ides" },
  { name: "Windsurf", url: "https://codeium.com/windsurf", description: "Agentic IDE where developer and AI work truly flows together", category: "ides" },
  { name: "Zed", url: "https://zed.dev/", description: "Code editor designed for high-performance collaboration with humans and AI", category: "ides" },
  { name: "Amazon Kiro", url: "https://kiro.dev/", description: "The AI IDE for prototype to production", category: "ides" },
  { name: "Google Antigravity", url: "https://antigravity.google/", description: "Google's IDE built around an agent-first approach", category: "ides" },
  { name: "Orchids", url: "https://www.orchids.app/", description: "The Vibe Coding IDE", category: "ides" },
  { name: "Dyad", url: "https://www.dyad.sh/", description: "Free, local, open-source AI app builder", category: "ides" },

  { name: "Cline", url: "https://cline.bot/", description: "AI assistant that can use your CLI and Editor, for VS Code", category: "plugins" },
  { name: "Roo Code", url: "https://github.com/RooVetGit/Roo-Code", description: "Fork of Cline with extra features and enhancements", category: "plugins" },
  { name: "Kilo Code", url: "https://kilocode.ai/", description: "Open-source AI coding agent extension for VS Code and JetBrains", category: "plugins" },
  { name: "Amp", url: "https://ampcode.com/", description: "Frontier coding agent for your terminal and editor by Sourcegraph", category: "plugins" },
  { name: "GitHub Copilot", url: "https://github.com/features/copilot", description: "AI pair programmer with code completion, chat, and agent mode", category: "plugins" },
  { name: "Continue", url: "https://github.com/continuedev/continue", description: "Build, share, and use custom AI code assistants with open-source IDE extensions", category: "plugins" },
  { name: "Augment Code", url: "https://www.augmentcode.com/", description: "AI coding assistant built for professional engineers and large codebases", category: "plugins" },
  { name: "avante.nvim", url: "https://github.com/yetone/avante.nvim", description: "Neovim plugin emulating Cursor AI IDE with AI-driven code suggestions", category: "plugins" },
  { name: "Amazon Q Developer", url: "https://aws.amazon.com/q/developer", description: "Amazon's Generative AI Assistant for Software Development", category: "plugins" },
  { name: "Superdesign.dev", url: "https://www.superdesign.dev/", description: "Open Source Design Agent", category: "plugins" },

  { name: "Claude Code", url: "https://github.com/anthropics/claude-code", description: "Coding agent that understands your codebase, automates tasks, and manages Git via natural language", category: "cli-tools" },
  { name: "aider", url: "https://aider.chat/", description: "AI pair programming in your terminal", category: "cli-tools" },
  { name: "Codename Goose", url: "https://block.github.io/goose/", description: "Local AI Agent with any LLM and MCP server extensions", category: "cli-tools" },
  { name: "OpenAI Codex CLI", url: "https://github.com/openai/codex", description: "OpenAI's lightweight coding agent that runs in the terminal", category: "cli-tools" },
  { name: "Gemini CLI", url: "https://github.com/google-gemini/gemini-cli", description: "Open-source AI agent from Google bringing Gemini to your terminal", category: "cli-tools" },
  { name: "MyCoder.ai", url: "https://github.com/drivecore/mycoder", description: "Open source AI coding assistant with Git/GitHub integration and parallel execution", category: "cli-tools" },
  { name: "Warp", url: "https://www.warp.dev/", description: "Rust-based command line featuring native AI integration", category: "cli-tools" },
  { name: "opencode", url: "https://opencode.ai/", description: "AI coding agent built for the terminal", category: "cli-tools" },
  { name: "Qwen Code", url: "https://github.com/QwenLM/qwen-code", description: "Coding agent that lives in the digital world", category: "cli-tools" },
  { name: "GitHub Copilot CLI", url: "https://github.com/github/copilot-cli", description: "GitHub Copilot coding agent in your terminal with agentic capabilities", category: "cli-tools" },
  { name: "Cloudflare VibeSDK", url: "https://github.com/cloudflare/vibesdk", description: "Cloudflare's SDK for vibe coding", category: "cli-tools" },
  { name: "Mistral Vibe", url: "https://github.com/mistralai/mistral-vibe", description: "Mistral AI's vibe coding tool", category: "cli-tools" },

  { name: "Vibe Kanban", url: "https://github.com/BloopAI/vibe-kanban", description: "Kanban board to manage and orchestrate AI coding agents", category: "task-management" },
  { name: "Claude Task Master", url: "https://github.com/eyaltoledano/claude-task-master", description: "AI-powered task management for Cursor, Lovable, Windsurf, and more", category: "task-management" },
  { name: "Boomerang Tasks", url: "https://docs.roocode.com/features/boomerang-tasks", description: "Automatically break down complex projects into manageable pieces", category: "task-management" },

  { name: "CodeGuide", url: "https://www.codeguide.dev/", description: "Creates detailed documentation for your AI coding projects", category: "documentation" },
  { name: "AGENTS.md", url: "https://agents.md/", description: "A simple, open format for guiding coding agents", category: "documentation" },
  { name: "Prompt Tower", url: "https://github.com/backnotprop/prompt-tower", description: "Tool to build prompts with many code blocks", category: "documentation" },
  { name: "Vibe Coding Prompt Template", url: "https://github.com/KhazP/vibe-coding-prompt-template", description: "A prompt template for vibe coding projects", category: "documentation" },

  { name: "Vibehackers", url: "https://vibehackers.io", description: "Community gallery for vibe coded projects and curated job board", category: "communities" },
  { name: "r/vibecoding", url: "https://www.reddit.com/r/vibecoding/", description: "Reddit community for vibe coding discussion", category: "communities" },
  { name: "r/ChatGPTCoding", url: "https://www.reddit.com/r/ChatGPTCoding/", description: "Reddit community for AI-assisted coding", category: "communities" },

  { name: "Vibe Coding 101 with Replit", url: "https://www.deeplearning.ai/short-courses/vibe-coding-101-with-replit/", description: "DeepLearning.AI short course on vibe coding", category: "learning" },
  { name: "The Way of Code", url: "https://www.thewayofcode.com/", description: "Rick Rubin's take on the philosophy of coding", category: "learning" },
  { name: "Prompt Engineering Playbook", url: "https://addyo.substack.com/p/the-prompt-engineering-playbook-for", description: "Prompt engineering playbook for programmers", category: "learning" },
  { name: "Peer Programming with LLMs", url: "https://pmbanugo.me/blog/peer-programming-with-llms", description: "Guide for senior+ engineers on peer programming with LLMs", category: "learning" },
  { name: "AI Code Guide", url: "https://github.com/automata/aicodeguide", description: "A roadmap to start coding with AI", category: "learning" },
  { name: "Vibe Engineering (Book)", url: "https://www.manning.com/books/vibe-engineering", description: "Book on vibe engineering practices and principles", category: "learning" },
];
