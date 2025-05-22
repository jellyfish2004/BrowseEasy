// Optional: ensure clicking the action opens the side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});
