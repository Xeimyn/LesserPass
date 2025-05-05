var iHaveAElementToFill = false


function addLesserPassButton(passwordFieldElement) {
	let fillFieldHeight = passwordFieldElement.getBoundingClientRect().height
	let buttonSize =  fillFieldHeight * 0.8

	// Create and style button including the icon
	const autoFillButton = document.createElement("button");

	autoFillButton.style.position = "absolute";
	autoFillButton.style.left = `${passwordFieldElement.offsetLeft + passwordFieldElement.offsetWidth - buttonSize - (fillFieldHeight * 0.1)}px`;
	autoFillButton.style.top = `${passwordFieldElement.offsetTop + (fillFieldHeight * 0.1)}px`;
	autoFillButton.style.height = `${buttonSize}px`
	autoFillButton.style.width = `${buttonSize}px`

	autoFillButton.style.display = "flex"
	autoFillButton.style.justifyContent = "center"
	autoFillButton.style.alignItems = "center"
	autoFillButton.style.overflow = "hidden"

	autoFillButton.style.background = "transparent";
	autoFillButton.style.border = "none";

	autoFillButton.style.cursor = "pointer";
	// Prevent my button from submitting forms
	autoFillButton.type = "button"

	const autoFillIcon = document.createElement("img");
	autoFillIcon.src = chrome.runtime.getURL("assets/icon.svg");
	autoFillIcon.alt = "Autofill";
	autoFillIcon.style.height = `${buttonSize * 0.8}px`;
	autoFillIcon.style.filter = "drop-shadow(10px)"

	// The actual button functionallity
	autoFillButton.addEventListener("click", async () => {
		// Launch extension popup and pass along the current url
		chrome.runtime.sendMessage({ action: "openPopup"});
	})

	// Add button to DOM
	autoFillButton.appendChild(autoFillIcon);
	passwordFieldElement.parentElement.appendChild(autoFillButton);
}

// Detect password element
function identifyPasswordField() {
	// Usually devs should specify that a field is a password autofill field.
	let potentialPasswordElements = document.querySelectorAll('input[type="password"][autocomplete="current-password"]');
	// But if they don’t we can still look for a normal field of TYPE password
	if (potentialPasswordElements.length == 0) {
		potentialPasswordElements = document.querySelectorAll('input[type="password"]');
	}
	// If that did nothing there is no field, but if there is we add the LesserPass button to the first one we see.
	if (potentialPasswordElements.length >= 1) {
		iHaveAElementToFill = true
		addLesserPassButton(potentialPasswordElements[0]);

	} else {
		// if we found nothing, proceed to keep a watch on the dom
	}
		// Observe DOM changes to detect dynamically loaded password fields
		const observer = new MutationObserver(() => {
			observer.disconnect()
			identifyPasswordField();
		});

		observer.observe(document.body, { childList: true,});
}

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

// FIELD DETECTION BELOW

// Initial detection
document.addEventListener("DOMContentLoaded", () => {
	identifyPasswordField();

});
