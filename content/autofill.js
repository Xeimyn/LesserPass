// Detect password element
function detectPasswordElements() {
	let passwordElements = document.querySelectorAll('input[type="password"][autocomplete="current-password"]');
	if (passwordElements.length == 0) {
		passwordElements = document.querySelectorAll('input[type="password"]');
	}
	if (passwordElements.length >= 1) {

		const finalPasswordElement = passwordElements[0];
		finalPasswordElement.style.border = "5px red solid"

		// Create a button with an img inside that uses assets/icon.svg and position it to the top right
		// of the finalPasswordElement with an offset of 5px from the top and right
		const autoFillButton = document.createElement("button");
		autoFillButton.style.position = "absolute";
		autoFillButton.style.top = `${finalPasswordElement.offsetTop + 5}px`;
		autoFillButton.style.left = `${finalPasswordElement.offsetLeft + finalPasswordElement.offsetWidth - 5}px`;
		autoFillButton.style.padding = "0";
		autoFillButton.style.border = "none";
		autoFillButton.style.background = "black";
		autoFillButton.style.cursor = "pointer";
		autoFillButton.style.width = "20px";
		autoFillButton.style.height = "20px";

		const autoFillIcon = document.createElement("img");
		autoFillIcon.src = chrome.runtime.getURL("assets/icon.svg");
		autoFillIcon.alt = "Autofill";
		autoFillIcon.style.width = "20px";
		autoFillIcon.style.height = "20px";

		autoFillButton.appendChild(autoFillIcon);


		finalPasswordElement.parentElement.appendChild(autoFillButton);
		observer.disconnect(); // Stop observing once we find the password field
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
