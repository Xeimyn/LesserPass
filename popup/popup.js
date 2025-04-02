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

	const SETTINGS = "placeholder"

	// used to gen a password if any of the inputs change
	REACTIVE_ELEMTNTS.forEach(function(element) {
		element.addEventListener("keyup", async function() {
			const currentSite = siteElement.value;
			const currentLogin = loginElement.value;
			const currentMasterPassword = masterPasswordElement.value;
			const currentIndex = indexElement.value
			const currentLength = lengthElement.value;

			// TODO | Get chars from settings
			const currentCharSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:'\",.<>?/`~"

			if (currentSite != "" && currentLogin != "" && currentMasterPassword != "" && Number(currentLength) >= 1 && Number(currentIndex)) {
				let finalPW = await genPW(currentSite,currentLogin,currentMasterPassword,currentLength,currentIndex,currentCharSet)
				if (finalPW == "") {
					// TODO | Add error output visually
					console.log("Crypto api is not supported or PBKDF2 failed");
					return
				} else {
					outputElement.value = finalPW
				}
			} else {
				outputElement.value = '';
			}
		});
	 });

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
		if (indexElement.value == "") {
			indexElement.value = 1
			return
		}
		indexElement.value -=1
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
		copiedOverlayElement.style.visibility = "visible"
		setTimeout(() => {
			copiedOverlayElement.style.visibility = "hidden"
			// TODO | Add Delay as setting
		}, 1250);
	}

	function copyToClipboard(value) {
		if (value != "") {
			navigator.clipboard.writeText(value).then(() => {
				showOverlay()
				console.log('[LesserPass] Password copied to clipboard');
			}).catch(err => {
				console.error('[LesserPass] Could not copy text: ', err);
			});
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
	// TODO | Adjust settings stuff
	// const cleanURL = cleanUrl(tab.url,SETTINGS.urlFormatting)
	const cleanURL = tab.url

	// insert url to url field
	siteElement.value = cleanURL
});

function cleanUrl(url,urlFormattingSettings) {
	// TODO | Adjust settings stuff
	// Important, we have to strip the subdomain before the protocol since it relies on a protocol being present
	if (urlFormattingSettings.stripSubDomain) {
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