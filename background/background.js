let openedViaButton
let iSupplyThisURL

// Listen for messages from injected extension button to open popup
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
	if (request.action === "openPopup") {
		openedViaButton = true
		iSupplyThisURL = sender.url
		await chrome.action.openPopup()

		setTimeout(() => {
			null
		}, 3000);


	} else if (request.action == "getOpenedViaButton") {
		if (openedViaButton == undefined) {
			openedViaButton = false
		}
		sendResponse([openedViaButton,iSupplyThisURL])
	} else if (request.action == "resetOpenedViaButton") {
		openedViaButton = false
	}
});

chrome.runtime.onInstalled.addListener(async (details) => {
  const currentVersion = chrome.runtime.getManifest().version;
  const [currMajor, currMinor, currPatch] = currentVersion.split('.').map(Number);

  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL("/settings/settings.html") });

    // Store current version on install
    chrome.storage.local.set({ lesserpassVersion: currentVersion });
  }

  if (details.reason === 'update') {
    const { lesserpassVersion: prevVersion } = await chrome.storage.local.get('lesserpassVersion');

    if (prevVersion) {
      const [prevMajor, prevMinor, prevPatch] = prevVersion.split('.').map(Number);

      const majorOrMinorChanged =
        currMajor !== prevMajor || currMinor !== prevMinor;

      if (majorOrMinorChanged) {
        chrome.tabs.create({ url: chrome.runtime.getURL("/changelog/changelog.html") });
      }
    }

    // Update stored version after update
    chrome.storage.local.set({ lesserpassVersion: currentVersion });
  }
});