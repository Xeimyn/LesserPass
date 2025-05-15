document.addEventListener("DOMContentLoaded", async () => {
	// Making my life slightly easier lol
	const getElementByClass = (className) => document.getElementsByClassName(className)[0];

	// No matter what, we need to know our ui elements n shit
	const siteElement = getElementByClass("site");
	const loginElement = getElementByClass("login");
	const masterPasswordElement = getElementByClass("masterPassword");
	const lengthElement = document.getElementById("LengthInput");
	const indexElement = document.getElementById("IndexInput");
	const outputElement = getElementByClass("output");
	const toggleViewButton = getElementByClass("toggleViewButton");
	const toggleViewButtonImage = getElementByClass("toggleButtonImg");
	const copiedOverlayElement = getElementByClass("copiedOverlay");
	const emojiPreviewElement = getElementByClass("emojiList");
	const emojiElements = document.getElementsByClassName("emoji");

	// And also no matter what, we GOTTA load the settings
	const SETTINGS = JSON.parse(localStorage.getItem("LesserPassSettings")) || {};
	if (Object.keys(SETTINGS).length === 0) {
		// If the Settings are literally non existant, open the settings page...
		chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
		return;
	}

	// ---
	// Before doing anything, establish function of buttons n shit
	toggleViewButton.addEventListener("click", () => {
		const isPassword = outputElement.type === "password";
		outputElement.type = isPassword ? "text" : "password";
		toggleViewButtonImage.src = isPassword ? "../assets/icons/eye_blind.svg" : "../assets/icons/eye.svg";
	});

	emojiPreviewElement.addEventListener("click", () => {
		const isPassword = masterPasswordElement.type === "password";
		masterPasswordElement.type = isPassword ? "text" : "password";
	});

	// ---
	const adjustValue = (element, delta) => {
		element.value = Math.max(1, (Number(element.value) || 1) + delta);
	};

	const adjustListeners = [
		["minusBL", () => adjustValue(lengthElement, -1)],
		["plusBL", () => adjustValue(lengthElement, 1)],
		["minusBI", () => adjustValue(indexElement, -1)],
		["plusBI", () => adjustValue(indexElement, 1)],
	];

	for (const [id, handler] of adjustListeners) {
		document.getElementById(id).addEventListener("click", handler);
	}

	// Now we need some event listeners so that the generated password changes when the options change.
	const triggerRegeneration = () => regeneratePassword(
		SETTINGS,
		siteElement,
		loginElement,
		masterPasswordElement,
		lengthElement,
		indexElement,
		outputElement,
		emojiElements
	);

	[siteElement, loginElement, masterPasswordElement, lengthElement, indexElement].forEach(element =>
		element.addEventListener("keyup", triggerRegeneration)
	);

	["minusBL", "plusBL", "minusBI", "plusBI"].forEach(id =>
		document.getElementById(id).addEventListener("click", triggerRegeneration)
	);

	masterPasswordElement.addEventListener("keydown",async (event) => {
		if (masterPasswordElement.value.length >= 1 && event.key === "Enter") {
			if (SETTINGS.experimentalSettings.autoFill) {
				const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
				chrome.tabs.sendMessage(tab.id,{ action: "fillPassword", password: outputElement.value }, (response) => {
					if (response) {
						console.log("[LesserPass] Password filled in.");
					} else {
						copyToClipboard(outputElement.value, copiedOverlayElement, SETTINGS);
					}
				})
			} else {
				copyToClipboard(outputElement.value,copiedOverlayElement,SETTINGS);
			}
		}
	});

	// No matter what, clicking that field with the copy cursor should always copy.
	outputElement.addEventListener("click", () => copyToClipboard(outputElement.value,copiedOverlayElement,SETTINGS));

	// Let the user dismiss the overlay by clicking it
	copiedOverlayElement.addEventListener("click", () => {
		copiedOverlayElement.style.visibility = "hidden";
	});

	// This is like filling out the easy parts of the test
	loginElement.value = SETTINGS.defaultInputs.defaultLogin;
	lengthElement.value = SETTINGS.defaultInputs.defaultLength;
	indexElement.value = SETTINGS.defaultInputs.defaultIndex;

	// Set site here
	chrome.runtime.sendMessage({ action: "getOpenedViaButton" }, async (response) => {
		if (response[0] === true) {
			siteElement.value = cleanUrl(response[1], SETTINGS.urlFormatting);
			chrome.runtime.sendMessage({ action: "resetOpenedViaButton" });
		} else {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			siteElement.value = cleanUrl(tab.url, SETTINGS.urlFormatting);
		}
	});

	// This is a bit dirty but...
	if (SETTINGS.uiSettings?.autoFocus) {
		const focusMap = {
			"Site": siteElement,
			"Login": loginElement,
			"MasterPW": masterPasswordElement,
			"PWLength": lengthElement,
			"PWIndex": indexElement,
		};
		focusMap[SETTINGS.uiSettings.autoFocus]?.focus();
	}
});

async function genPW(site, login, masterPassword, length, index, chars) {
	const encoder = new TextEncoder();
	const salt = encoder.encode(site + login + index);

	try {
		const keyMaterial = await window.crypto.subtle.importKey(
			"raw", encoder.encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]
		);

		const derivedBits = await window.crypto.subtle.deriveBits(
			{ name: "PBKDF2", salt, iterations: 300000, hash: "SHA-256" }, keyMaterial, 256
		);

		const hashArray = Array.from(new Uint8Array(derivedBits));
		return Array.from({ length }, (_, i) =>
			chars[(hashArray[i] + hashArray[(i + length) % hashArray.length]) % chars.length]
		).join('');
	} catch (error) {
		console.warn("[LesserPass] PBKDF2 failed.");
		return "";
	}
}

async function regeneratePassword(SETTINGS, siteElement, loginElement, masterPasswordElement, lengthElement, indexElement, outputElement, emojiElements) {
	const site = siteElement.value;
	const login = loginElement.value;
	const masterPassword = masterPasswordElement.value;
	const length = Number(lengthElement.value);
	const index = Number(indexElement.value);
	const charset = SETTINGS.defaultInputs.charset;

	if (site && login && masterPassword.length >= 1 && length >= 1 && index >= 1) {
		const password = await genPW(site, login, masterPassword, length, index, charset);
		updateEmojiPreview(masterPasswordElement, emojiElements);
		outputElement.value = password;
	} else {
		outputElement.value = "";
		updateEmojiPreview(masterPasswordElement, emojiElements);
	}
}

function updateEmojiPreview(masterPasswordElement, emojiElements) {
	if (masterPasswordElement.value.length > 0) {
		const emojis = [
			"🍒","🚽","🌊","🐶","👍","🐀","🌴","🍌",
			"🍏","🔒","🍓","🎓","🎉","🐐","🔥","✋",
			"🤡","🤛","🐈","🚁","🔆","🌜","🔑","🎻",
			"🚧","🏓","🎮","💜","💩","👽","👻","💀",
			"🐱‍👤","🦄","🐍","🐉","🦖","🐘","🦞","🦴",
			"🦷","👀","👅","🦾","🦿","🧠","✨","🎉",
			"💍","💎","🛒","🏆","🥇","🔊","🔧","📞",
			"💣","🔍","📌","🍗","🍇","🥕","🚲","🚀"
		];

		const hash = masterPasswordElement.value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const emoji1 = emojis[hash % emojis.length];
		const emoji2 = emojis[(hash * 2) % emojis.length];
		const emoji3 = emojis[(hash * 3) % emojis.length];

		emojiElements[0].innerText = emoji1;
		emojiElements[1].innerText = emoji2;
		emojiElements[2].innerText = emoji3;
	} else {
		emojiElements[0].innerText = "-";
		emojiElements[1].innerText = "-";
		emojiElements[2].innerText = "-";
	}
}

function showCopiedOverlay(copiedOverlayElement,SETTINGS) {
	if (SETTINGS.uiSettings.copiedOverlay) {
		copiedOverlayElement.style.visibility = "visible";
		setTimeout(() => copiedOverlayElement.style.visibility = "hidden", SETTINGS.uiSettings.copiedOverlayDuration);
	}
}

function copyToClipboard(text,copiedOverlayElement,SETTINGS) {
	navigator.clipboard.writeText(text).then(() => {
		showCopiedOverlay(copiedOverlayElement,SETTINGS);
		console.log('[LesserPass] Password copied to clipboard');
	})
}

// Small but important thingy
function cleanUrl(url, urlFormattingSettings) {
	if (urlFormattingSettings.stripSubdomain) {
		url = url.replace(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, '');
	}
	if (urlFormattingSettings.stripProtocol) {
		url = url.replace(/^([a-zA-Z\d+\-.]*):\/\//, '');
	}
	if (urlFormattingSettings.stripPath) {
		url = url.replace(/\/.*$/, '');
	}
	if (urlFormattingSettings.stripPort) {
		url = url.replace(/:\d+$/, '');
	}
	return url;
}
