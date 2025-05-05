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
