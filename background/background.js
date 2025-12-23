chrome.runtime.onInstalled.addListener(async (details) => {
  const currentVersion = chrome.runtime.getManifest().version;
  const [currMajor, currMinor, currPatch] = currentVersion.split('.').map(Number);

  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL("/settings/settings.html") });

    // Store current version on install
    chrome.storage.local.set({ LPVersion: currentVersion });
  }

  if (details.reason === 'update') {
    const { LPVersion: prevVersion } = await chrome.storage.local.get('LPVersion');

    if (prevVersion) {
      const [prevMajor, prevMinor, prevPatch] = prevVersion.split('.').map(Number);

      const majorOrMinorChanged =
        currMajor > prevMajor || currMinor > prevMinor;

      if (majorOrMinorChanged) {
        chrome.tabs.create({ url: chrome.runtime.getURL("/changelog/changelog.html") });
      }
    }

    // Update stored version after update
    chrome.storage.local.set({ LPVersion: currentVersion });
  }
});