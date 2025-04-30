
// chrome.runtime.onStartup.addListener(() => {

// })

chrome.runtime.onMessage.addListener(
  (request: { message: string; }, _: any, sendResponse: (arg0: { location?: any; message?: string; }) => void) => {
    if (request.message === 'getLocation') {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs: { url: any; }[]) {
        sendResponse({ location: tabs[0].url });
      });
      return true;  // Will respond asynchronously.
    }

    return sendResponse({ message: "Invalid message" });
  }
);
