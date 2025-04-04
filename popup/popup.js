// Gets called when the window opens.
document.addEventListener("DOMContentLoaded", async () => {
	const siteElement           = document.getElementsByClassName("site")[0];
	const loginElement          = document.getElementsByClassName("login")[0];
	const masterPasswordElement = document.getElementsByClassName("masterPassword")[0];

	const outputElement         = document.getElementsByClassName("output")[0];

	const lengthElement = document.getElementById("LengthInput");
	const minusButtonLength = document.getElementById("minusBL")
	const plusButtonLength  = document.getElementById("plusBL")

	const indexElement  = document.getElementById("IndexInput");
	const minusButtonIndex = document.getElementById("minusBI")
	const plusButtonIndex  = document.getElementById("plusBI")

	const toggleViewButton      = document.getElementsByClassName("toggleViewButton")[0];
	const toggleViewButtonImage = document.getElementsByClassName("toggleButtonImg")[0];

	const copiedOverlayElement = document.getElementsByClassName("copiedOverlay")[0]

	const REACTIVE_ELEMTNTS = [
		siteElement,
		loginElement,
		masterPasswordElement,
		lengthElement,
		indexElement,
		minusButtonLength,
		plusButtonLength,
		minusButtonIndex,
		plusButtonIndex,
	]

	let SETTINGS = JSON.parse(localStorage.getItem("LesserPassSettings"));
	if (!SETTINGS) {
		chrome.tabs.create({url:chrome.runtime.getURL("settings/settings.html")})
	}

	// Set values from settings
	loginElement.value = SETTINGS.defaultInputs.defaultLogin
	lengthElement.value = SETTINGS.defaultInputs.defaultLength
	indexElement.value = SETTINGS.defaultInputs.defaultIndex

	// Function to regenerate password
	async function regeneratePassword() {
		const currentSite = siteElement.value;
		const currentLogin = loginElement.value;
		const currentMasterPassword = masterPasswordElement.value;
		const currentIndex = indexElement.value;
		const currentLength = lengthElement.value;

		const currentCharSet = SETTINGS.defaultInputs.charset;

		if (currentSite != "" && currentLogin != "" && currentMasterPassword != "" && Number(currentLength) >= 1 && Number(currentIndex)) {
			let finalPW = await genPW(currentSite, currentLogin, currentMasterPassword, currentLength, currentIndex, currentCharSet);
			if (finalPW == "") {
				// TODO | Add error output visually
				console.log("Crypto api is not supported or PBKDF2 failed");
				return;
			} else {
				outputElement.value = finalPW;
			}
		} else {
			outputElement.value = '';
		}
	}

	// used to gen a password if any of the inputs change
	REACTIVE_ELEMTNTS.forEach(function(element) {
		element.addEventListener("keyup", regeneratePassword);
	});

	// Add event listeners for plus and minus buttons to trigger password regeneration
	minusButtonLength.addEventListener("click", regeneratePassword);
	plusButtonLength.addEventListener("click", regeneratePassword);
	minusButtonIndex.addEventListener("click", regeneratePassword);
	plusButtonIndex.addEventListener("click", regeneratePassword);

	// Used to reveal/hide password
	 toggleViewButton.addEventListener("click",function() {
		if (outputElement.type == "password") {
			outputElement.type = "text"
			toggleViewButtonImage.src="../assets/icons/eye_blind.svg"
		} else if (outputElement.type == "text") {
			outputElement.type = "password"
			toggleViewButtonImage.src="../assets/icons/eye.svg"
		}
	 })

	// Used to make the custom number input buttons work
	 minusButtonLength.addEventListener("click",function() {
		if (lengthElement.value >= 2) {
			lengthElement.value -=1
		}
		if (lengthElement.value == "") {
			lengthElement.value = 1
		}
	 })

	 plusButtonLength.addEventListener("click",function() {
		lengthElement.value = Number(lengthElement.value) + 1
	 })

	 minusButtonIndex.addEventListener("click",function() {
		if (indexElement.value >= 2) {
			indexElement.value -= 1
		}
		if (indexElement.value == "") {
			indexElement.value = 1
		}
	 })

	 plusButtonIndex.addEventListener("click",function() {
		indexElement.value = Number(indexElement.value) + 1
	 })

	// used to copy to clipboard when confirming masterpw via enter
	masterPasswordElement.addEventListener("keydown", function(event) {
		if (event.key === "Enter") {
			copyToClipboard(outputElement.value)
		}
	});

	// Click to copy functionallity
	outputElement.addEventListener("click",function() {
		copyToClipboard(outputElement.value)
	})

	copiedOverlayElement.addEventListener("click",function() {
		copiedOverlayElement.style.visibility = "hidden"
	})

	function showOverlay() {
		if (SETTINGS.uiSettings.copiedOverlay) {
			copiedOverlayElement.style.visibility = "visible"
			setTimeout(() => {
				copiedOverlayElement.style.visibility = "hidden"
			}, SETTINGS.uiSettings.copiedOverlayDuration);
		}
	}


	function copyToClipboard(value) {
		if (value != "") {
			if (SETTINGS.experimentalSettings.autoFill) {
				autoFillPassword(value)
			} else {
				navigator.clipboard.writeText(value).then(() => {
					showOverlay()
					console.log('[LesserPass] Password copied to clipboard');
				}).catch(err => {
					console.error('[LesserPass] Could not copy text: ', err);
				});
			}
		} else {
			console.log('[LesserPass] Not gonna copy empty text')
		}
	}

	async function genPW(site, login, masterPassword, length, index, chars) {
		const encoder = new TextEncoder();
		const salt = encoder.encode(site + login + index);

		let derivedBits;

		if (window.crypto.subtle.importKey && window.crypto.subtle.deriveBits) {
			try {
				// Generate key material from master password using PBKDF2
				const keyMaterial = await window.crypto.subtle.importKey(
					"raw", encoder.encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]
				);

				// Derive a 256-bit key using PBKDF2 with 310,000 iterations for security
				derivedBits = await window.crypto.subtle.deriveBits(
					{ name: "PBKDF2", salt: salt, iterations: 400000, hash: "SHA-256" },
					keyMaterial, 256
				);
			} catch (error) {
				console.warn("[LesserPass] PBKDF2 failed.");
				return ""
			}

		} else {
			console.warn("[LesserPass] Crypto API not supported.");
			return ""
		}

		// Convert derived bits to an array of usable characters from the provided charset
		const hashArray = Array.from(new Uint8Array(derivedBits));
		let passwordChars = [];
		for (let i = 0; i < length; i++) {
			// Generate an index by mixing two different bytes from the hash, reducing modulo bias
			let charIndex = (hashArray[i] + hashArray[(i + length) % hashArray.length]) % chars.length;
			passwordChars.push(chars[charIndex]);
		}

		// Return the final generated password as a string
		return passwordChars.join('');
	}

	// Get current tab URL
	const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
	const cleanURL = cleanUrl(tab.url,SETTINGS.urlFormatting)

	// insert url to url field
	siteElement.value = cleanURL

	// Autofocus
	if (SETTINGS.uiSettings.autoFocus != "None")
		switch (SETTINGS.uiSettings.autoFocus) {
			case "Site":
				siteElement.focus()
				break;
			case "Login":
				loginElement.focus()
				break;
			case "MasterPW":
				masterPasswordElement.focus()
				break;
			case "PWLength":
				lengthElement.focus()
				break;
			case "PWIndex":
				indexElement.focus()
				break;
		}
	});

function autoFillPassword(value) {
	chrome.runtime.sendMessage({action:"autofillPassword",password:value})
}

function cleanUrl(url,urlFormattingSettings) {
	// Important, we have to strip the subdomain before the protocol since it relies on a protocol being present
	if (urlFormattingSettings.stripSubdomain) {
		url = url.replace(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, '')
	}
	if (urlFormattingSettings.stripProtocol) {
		url = url.replace(/^([a-zA-Z\d+\-.]*):\/\//, '');
	}
	if (urlFormattingSettings.stripPath) {
		url = url.replace(/\/.*$/, '')
	}
	return url
}