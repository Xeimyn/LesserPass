// Detect password element
function detectPasswordElements() {
	let passwordElements = document.querySelectorAll('input[type="password"][autocomplete="current-password"]');
	if (passwordElements.length == 0) {
		passwordElements = document.querySelectorAll('input[type="password"]');
	}
	if (passwordElements.length >= 1) {

		const finalPasswordElement = passwordElements[0];
		finalPasswordElement.style.border = "5px red solid"
		observer.disconnect()
	}
}

// Observe DOM changes to detect dynamically loaded password fields
const observer = new MutationObserver(() => {
	detectPasswordElements();
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial detection
document.addEventListener("DOMContentLoaded", () => {
	detectPasswordElements();
});

// Listen for messages from extension ui to autofill
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "autofillPassword") {
		detectPasswordElements();
		finalPasswordElement.value = request.password;
	}
});
