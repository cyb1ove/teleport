export const sendMessage = (message: string | Object): Promise<any> => {
  return chrome.runtime.sendMessage(message);
}
