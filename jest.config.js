// Este arquivo existe apenas para prevenir que o Next.js use configurações padrão do Jest
// Configurando com valores que evitam a execução de testes

module.exports = {
  testMatch: [], // Não corresponder a nenhum arquivo de teste
  testPathIgnorePatterns: ['.*'], // Ignorar todos os arquivos
  testEnvironment: 'node',
  transform: {}, // Não transformar nenhum arquivo
  collectCoverage: false,
  collectCoverageFrom: [],
  // Desativar a execução de testes no build
  projects: [],
  runner: 'jest-runner',
} 