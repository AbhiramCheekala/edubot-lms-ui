interface Config {
  API_BASE_URL: string;
  CHAT_PLATFORM_BASE_URL: string;
}

const config: Config = {
  API_BASE_URL: 'https://busy-ibbie-abhiramedubot-e3c30779.koyeb.app/v1',
  CHAT_PLATFORM_BASE_URL: 'https://blackboard-ai-learning-lovat.vercel.app',
  // CHAT_PLATFORM_BASE_URL: 'http://localhost:3001',
};

export default config;