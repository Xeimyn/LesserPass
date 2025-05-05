let finalPasswordElement

// Detect password element
function detectPasswordElements() {
	// Do a more restricted search first
	let passwordElements = document.querySelectorAll('input[type="password"][autocomplete="current-password"]');
	if (passwordElements.length == 0) {
		// if nothing is found go broader
		passwordElements = document.querySelectorAll('input[type="password"]');
	}
	if (passwordElements.length >= 1) {
		const finalPasswordElement = passwordElements[0];

		let fillFieldHeight = finalPasswordElement.getBoundingClientRect().height
		let buttonSize =  fillFieldHeight * 0.8

		const autoFillButton = document.createElement("button");
		// Prevent my button from submitting forms
		autoFillButton.type = "button"

		autoFillButton.style.height = `${buttonSize}px`
		autoFillButton.style.width = `${buttonSize}px`
		autoFillButton.style.aspectRatio = 1.0

		autoFillButton.style.position = "absolute";
		autoFillButton.style.left = `${finalPasswordElement.offsetLeft + finalPasswordElement.offsetWidth - buttonSize - (fillFieldHeight * 0.1)}px`;
		autoFillButton.style.top = `${finalPasswordElement.offsetTop + (fillFieldHeight * 0.1)}px`;

		autoFillButton.style.border = "none";
		autoFillButton.style.background = "transparent";

		autoFillButton.style.display = "flex"
		autoFillButton.style.justifyContent = "center"
		autoFillButton.style.alignItems = "center"
		autoFillButton.style.overflow = "hidden"

		autoFillButton.style.cursor = "pointer";

		const autoFillIcon = document.createElement("img");
		autoFillIcon.src = chrome.runtime.getURL("assets/icon.svg");
		autoFillIcon.alt = "Autofill";
		autoFillIcon.style.height = `${buttonSize * 0.8}px`;
		autoFillIcon.style.filter = "drop-shadow(10px)"

		autoFillButton.appendChild(autoFillIcon);

		finalPasswordElement.parentElement.appendChild(autoFillButton);

		autoFillButton.addEventListener("click", async () => {
			// Launch extension popup
			chrome.runtime.sendMessage({ action: "openPopup"});
		})

		// Stop observing once we find the password field
		observer.disconnect();
	}
}


// FIELD DETECTION BELOW

// Initial detection
document.addEventListener("DOMContentLoaded", () => {
	detectPasswordElements();
});

// Observe DOM changes to detect dynamically loaded password fields
const observer = new MutationObserver(() => {
	detectPasswordElements();
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true,  });

// Just making sure it runs at LEAST once
setTimeout(() => {
	detectPasswordElements()
}, 1);

// Listen for messages from extension ui to autofill
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "fillPassword") {
		try {
			finalPasswordElement.value = request.password;
		} catch (error) {
			console.log("whoops");
		}
	}
});
