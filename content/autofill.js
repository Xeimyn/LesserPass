var iHaveAElementToFill = false
let observer = null;
let finalPasswordElement = null;

function addLesserPassButton(passwordFieldElement) {
	let autoFillButton = document.createElement("button");
	autoFillButton.className = "lesserpass-autofill-btn";
	autoFillButton.style.position = "absolute";
	autoFillButton.style.display = "flex";
	autoFillButton.style.justifyContent = "center";
	autoFillButton.style.alignItems = "center";
	autoFillButton.style.overflow = "hidden";
	autoFillButton.style.background = "transparent";
	autoFillButton.style.border = "none";
	autoFillButton.style.cursor = "pointer";
	autoFillButton.type = "button";

	const autoFillIcon = document.createElement("img");
	autoFillIcon.src = chrome.runtime.getURL("assets/icon.svg");
	autoFillIcon.alt = "Autofill";
	autoFillButton.appendChild(autoFillIcon);

	// Function to update button position and size
	function updateButtonPosition() {
		let fillFieldRect = passwordFieldElement.getBoundingClientRect();
		let fillFieldHeight = fillFieldRect.height;
		let buttonSize = fillFieldHeight * 0.8;
		autoFillButton.style.height = `${buttonSize}px`;
		autoFillButton.style.width = `${buttonSize}px`;
		autoFillButton.style.left = `${passwordFieldElement.offsetLeft + passwordFieldElement.offsetWidth - buttonSize - (fillFieldHeight * 0.1)}px`;
		autoFillButton.style.top = `${passwordFieldElement.offsetTop + (fillFieldHeight * 0.1)}px`;
		autoFillIcon.style.height = `${buttonSize * 0.8}px`;
	}

	// Initial position
	updateButtonPosition();

	// Responsive: update on window resize
	function onResize() { updateButtonPosition(); }
	window.addEventListener('resize', onResize);

	// Use ResizeObserver for more accuracy
	let resizeObserver = null;
	if (window.ResizeObserver) {
		resizeObserver = new ResizeObserver(updateButtonPosition);
		resizeObserver.observe(passwordFieldElement);
	}

	// The actual button functionality
	autoFillButton.addEventListener("click", async () => {
		chrome.runtime.sendMessage({ action: "openPopup" });
	});

	// Add button to DOM
	passwordFieldElement.parentElement.appendChild(autoFillButton);
	finalPasswordElement = passwordFieldElement;
}

// Detect password element
function isVisibleAndEnabled(element) {
	// Check if element is visible and enabled for interaction
	const style = window.getComputedStyle(element);
	return (
		style.display !== "none" &&
		style.visibility !== "hidden" &&
		style.opacity !== "0" &&
		!element.disabled &&
		!element.readOnly &&
		element.offsetParent !== null
	);
}

function identifyPasswordField() {
	// Find password fields
	let potentialPasswordElements = document.querySelectorAll('input[type="password"][autocomplete="current-password"]');
	if (potentialPasswordElements.length === 0) {
		potentialPasswordElements = document.querySelectorAll('input[type="password"]');
	}
	const visiblePasswordElements = Array.from(potentialPasswordElements).filter(isVisibleAndEnabled);

	if (visiblePasswordElements.length >= 1) {
		iHaveAElementToFill = true;
		const passwordField = visiblePasswordElements[0];
		// Only add button if not already present or if field changed
		if (!passwordField.parentElement.querySelector('.lesserpass-autofill-btn') || finalPasswordElement !== passwordField) {
			removeLesserPassButtons(); // Remove any old buttons
			addLesserPassButton(passwordField);
			finalPasswordElement = passwordField;
		}
	} else {
		iHaveAElementToFill = false;
		removeLesserPassButtons();
		finalPasswordElement = null;
	}
}

// Remove all LesserPass buttons
function removeLesserPassButtons() {
	document.querySelectorAll('.lesserpass-autofill-btn').forEach(btn => btn.remove());
}

// Listen for messages from extension ui to autofill
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "fillPassword") {
		if (iHaveAElementToFill) {
			finalPasswordElement.value = request.password;
			sendResponse(true)
			}
		} else {
			sendResponse(false)
		}
	}
);

// Set up a single observer on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
	identifyPasswordField();
	if (!observer) {
		observer = new MutationObserver(() => {
			identifyPasswordField();
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}
});
