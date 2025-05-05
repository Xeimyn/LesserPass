// Listen for messages from extension button to open popup
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
	if (request.action === "openPopup") {
		await chrome.action.openPopup()
	}
});
