document.addEventListener("DOMContentLoaded", async () => {
	// No matter what, we need to know our ui elements n shit
	const EL_overlay = document.getElementById("copiedOverlay");
	const EL_site = document.getElementById("site");
	const EL_login = document.getElementById("login");
	const EL_masterpw = document.getElementById("masterpw");
	const EL_passMojiContainer = document.getElementsByClassName("passMojiContainer")[0];
	const ListOf_EL_passMojis = document.getElementsByClassName("emoji");
	const EL_length = document.getElementById("LengthInput");
	const EL_index = document.getElementById("IndexInput");
	const EL_output = document.getElementById("output");

	const EL_toggleView = document.getElementById("toggleView");
	const EL_toggleViewImg = document.getElementById("toggleViewImage");

	const quickNumberSettingElements = document.getElementsByClassName("quickNumberSetting");

	// And also no matter what, we GOTTA load the settings
	const SETTINGS = JSON.parse(localStorage.getItem("LesserPassSettings")) || {};
	if (Object.keys(SETTINGS).length === 0) {
		// If the Settings are literally non existant, open the settings page...
		chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
		return;
	}

	// ---

	// Before doing anything, establish function of buttons n shit
	EL_toggleView.addEventListener("click", () => {
		const isPassword = EL_output.type === "password";
		EL_output.type = isPassword ? "text" : "password";
		EL_toggleViewImg.src = isPassword ? "../assets/icons/eye_blind.svg" : "../assets/icons/eye.svg";
	});

	EL_passMojiContainer.addEventListener("click", () => {
		const isPassword = EL_masterpw.type === "password";
		EL_masterpw.type = isPassword ? "text" : "password";
	});

	// ---

	const adjustValue = (element, delta) => {
		element.value = Math.max(1, (Number(element.value) || 1) + delta);
	};

	const adjustListeners = [
		["minusLength", () => adjustValue(EL_length, -1)],
		["plusLength", () => adjustValue(EL_length, 1)],
		["minusIndex", () => adjustValue(EL_index, -1)],
		["plusIndex", () => adjustValue(EL_index, 1)],
	];

	for (const [id, handler] of adjustListeners) {
		document.getElementById(id).addEventListener("click", handler);
	}

	const triggerRegeneration = () => regeneratePassword(
		SETTINGS,
		EL_site,
		EL_login,
		EL_masterpw,
		EL_length,
		EL_index,
		EL_output,
		ListOf_EL_passMojis
	);

	for (let index = 0; index < quickNumberSettingElements.length; index++) {
		const element = quickNumberSettingElements[index];
		// Add scroll event listener while hovered
		element.addEventListener("wheel", (event) => {
			event.preventDefault();
			const delta = event.deltaY < 0 ? 1 : -1;
			const inputElement = element.getElementsByClassName("numberInput")[0];
			adjustValue(inputElement, delta);
			triggerRegeneration();
		});
	}

	// Now we need some event listeners so that the generated password changes when the options change.

	[EL_site, EL_login, EL_masterpw, EL_length, EL_index].forEach(element =>
		element.addEventListener("keyup", triggerRegeneration)
	);

	["minusLength", "plusLength", "minusIndex", "plusIndex"].forEach(id =>
		document.getElementById(id).addEventListener("click", triggerRegeneration)
	);

	EL_masterpw.addEventListener("keydown",async (event) => {
		if (EL_masterpw.value.length >= 1 && event.key === "Enter") {
			if (SETTINGS.experimentalSettings.autoFill) {
				const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
				chrome.tabs.sendMessage(tab.id,{ action: "fillPassword", password: EL_output.value }, (response) => {
					if (response) {
						console.log("[LesserPass] Password filled in.");
					} else {
						copyToClipboard(EL_output.value, EL_overlay, SETTINGS);
					}
				})
			} else {
				copyToClipboard(EL_output.value,EL_overlay,SETTINGS);
			}
		}
	});

	// No matter what, clicking that field with the copy cursor should always copy.
	EL_output.addEventListener("click", () => copyToClipboard(EL_output.value,EL_overlay,SETTINGS));

	// Let the user dismiss the overlay by clicking it
	EL_overlay.addEventListener("click", () => {
		EL_overlay.style.visibility = "hidden";
	});

	// This is like filling out the easy parts of the test
	EL_login.value = SETTINGS.defaultInputs.defaultLogin;
	EL_length.value = SETTINGS.defaultInputs.defaultLength;
	EL_index.value = SETTINGS.defaultInputs.defaultIndex;

	// Set site here
	chrome.runtime.sendMessage({ action: "getOpenedViaButton" }, async (response) => {
		if (response[0] === true) {
			EL_site.value = cleanUrl(response[1], SETTINGS.urlFormatting);
			chrome.runtime.sendMessage({ action: "resetOpenedViaButton" });
		} else {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			EL_site.value = cleanUrl(tab.url, SETTINGS.urlFormatting);
		}
	});

	// This is a bit dirty but...
	if (SETTINGS.uiSettings?.autoFocus) {
		const focusMap = {
			"Site": EL_site,
			"Login": EL_login,
			"MasterPW": EL_masterpw,
			"PWLength": EL_length,
			"PWIndex": EL_index,
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
	// To avoud edge cases, remove trailing slashes
	while (url.endsWith('/')) {
		url = url.slice(0, -1);
	}

	let partsToRemove = []
	if (urlFormattingSettings.stripProtocol) {
		partsToRemove.push(url.match(/^([a-zA-Z\d+\-.]*):\/\//)[0])
	}

	if (urlFormattingSettings.stripSubdomain) {
		partsToRemove.push(url.match(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g))
	}

	if (urlFormattingSettings.stripPort) {
		partsToRemove.push(url.match(/:\d+/))
	}

	if (urlFormattingSettings.stripPath) {
		let path = url.match(/^(?:.+?:\/\/)?[^\/?#]+(\/(?!\/).*)$/)
		if (path != null) {
			partsToRemove.push(path[1])
		} else {
			// im doing this so that the log output stays consistent
			partsToRemove.push(null)
		}
	}

	console.log("Url in parts: ",partsToRemove);
	// remove all matches
	for (const match of partsToRemove) {
		if (match) {
			url = url.replace(match, '');
		}
	}
	return url;
}