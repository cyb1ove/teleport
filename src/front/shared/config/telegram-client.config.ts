export default ({ isTest }: { isTest: boolean }) => ({
  connectionRetries: 5,
  requestRetries: 5,
  autoReconnect: true,
  retryDelay: 3000,
  useWSS: true,
  testServers: isTest,
});