import { LPCore, filterURL } from "../core/core.js";

document.addEventListener("DOMContentLoaded", async () => {
	// --- Loading Settings and UI
	const SETTINGS = await loadSettings()

	//  --- Load Core class
	let CORE = new LPCore(
		SETTINGS.defaultInputs.charset,
		SETTINGS.security.staticSecret,
		SETTINGS.urlFormatting.stripProtocol,
		SETTINGS.urlFormatting.stripSubdomain,
		SETTINGS.urlFormatting.stripPath,
		SETTINGS.urlFormatting.stripPort
	)

	// load all elements first
	const EL_overlay = document.getElementById("copiedOverlay");
	const EL_site = document.getElementById("site");
	const EL_login = document.getElementById("login");
	const EL_masterpw = document.getElementById("masterpw");
	const EL_passMojiContainer = document.getElementsByClassName("passMojiContainer")[0];
	const EL_passMojis = document.getElementsByClassName("emoji");
	const EL_length = document.getElementById("LengthInput");
	const EL_index = document.getElementById("IndexInput");
	const EL_filterLowers = document.getElementById("filterLowers")
	const EL_filterCaps = document.getElementById("filterCaps")
	const EL_filterNumbers = document.getElementById("filterNumbers")
	const EL_filterSymbols = document.getElementById("filterSymbols")
	const EL_output = document.getElementById("output");
	const EL_toggleView = document.getElementById("toggleView");
	const EL_toggleViewImg = document.getElementById("toggleViewImage");

	// --- Fill UI with values

	// Get tab URL
	let url

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	url = tab.url

	// Set url
	EL_site.value = filterURL(url, SETTINGS.urlFormatting);

	// Set login
	if (SETTINGS.advanced.genLogin.enabled) {
		// No matter the user settings loginGen requries a fully cleaned domain
		let pureDomain = url
		// ugly but it lets me reuse the function for rn
		pureDomain = filterURL(url,{"stripProtocol":true,"stripSubdomain":true,"stripPath":true,"stripPort":true,})
		let generatedLogin = generateLogin( pureDomain, SETTINGS.advanced.genLogin.settings.template, SETTINGS.advanced.genLogin.settings.domain)
		EL_login.value = generatedLogin;
	} else {
		EL_login.value = SETTINGS.defaultInputs.login;
	}

	// Index and length
	EL_length.value = SETTINGS.defaultInputs.length;
	EL_index.value = SETTINGS.defaultInputs.index;

	// This is a "proxy" function that lets me pass arguments without passing them every time essentially
	// it is important that we pass the elements and not the values since its supposed to react to the changes value
	const triggerRegeneration = debounce(() => regeneratePassword(
		CORE,
		SETTINGS,
		EL_site,
		EL_login,
		EL_masterpw,
		EL_length,
		EL_index,
		EL_filterLowers,
		EL_filterCaps,
		EL_filterNumbers,
		EL_filterSymbols,
		EL_output,
		EL_passMojis
	), SETTINGS.advanced.debounceDelay);

	// --- Add eventlisteners to regenerate pw if needed
	document.addEventListener("regeneratePasswordEvent", triggerRegeneration);

	[EL_site, EL_login, EL_masterpw, EL_length, EL_index].forEach(el =>
		el.addEventListener("input", () => {
			document.dispatchEvent(new Event("regeneratePasswordEvent"));
		})
	);

	// This one is special, it also changes the value just like the + and - button by scrolling
	[EL_length, EL_index].forEach(el =>
	el.addEventListener("wheel", e => {
		// prevent page scroll
		e.preventDefault();
		const delta = e.deltaY < 0 ? 1 : -1;
		adjustValue(el, delta);
		document.dispatchEvent(new Event("regeneratePasswordEvent"));
		})
	);

	["minusLength","plusLength","minusIndex","plusIndex","filterLowers", "filterCaps", "filterNumbers", "filterSymbols"].forEach(id => setTimeout(() => {
		const btn = document.getElementById(id);
		if (btn) btn.addEventListener("click", () => {
			document.dispatchEvent(new Event("regeneratePasswordEvent"));
		});
	}, 10));

	// --- And finally make the UI parts work (Buttons changing value etc)

	// View / Hide master pw
	EL_passMojiContainer.addEventListener("click", () => {
		const isPassword = EL_masterpw.type === "password";
		EL_masterpw.type = isPassword ? "text" : "password";
	});

	// Make the custom number shit work
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

	// Let the user copy the output by pressing enter on the input (if password is at least 1 long)
	EL_masterpw.addEventListener("keydown",async (event) => {
		if (EL_masterpw.value.length >= 1 && event.key === "Enter") {

			// TODO | - autofill
			// if (SETTINGS.experimentalSettings.autoFill) {
			// 	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			// 	chrome.tabs.sendMessage(tab.id,{ action: "fillPassword", password: EL_output.value }, (response) => {
			// 		if (response) {
			// 			console.log("[LesserPass] Password filled in.");
			// 		} else {
			// 			copyToClipboard(EL_output.value, EL_overlay, SETTINGS);
			// 		}
			// 	})

			// } else {
				copyToClipboard(EL_output.value,EL_overlay,SETTINGS);
			// }
		}
	});

	if (SETTINGS.uiSettings.animateUI) {
		document.body.classList.add("animated");
	}

	// View / Hide output pw
	EL_toggleView.addEventListener("click", () => {
		const isPasswordType = EL_output.type === "password";
		EL_output.type = isPasswordType ? "text" : "password";
		EL_toggleViewImg.src = isPasswordType ? "../assets/icons/eye_blind.svg" : "../assets/icons/eye.svg";
	});

	// Click to copy
	EL_output.addEventListener("click", () => copyToClipboard(EL_output.value,EL_overlay,SETTINGS));

	// Let the user dismiss the overlay by clicking it
	EL_overlay.addEventListener("click", () => {
		EL_overlay.style.visibility = "hidden";
	});

	// remove the mono class from the emoji preview for weirdos that want that ig
	if (!SETTINGS.uiSettings.monochromePassMojis) {
		for (const mojiElement of EL_passMojis) {
			mojiElement.classList.remove("monoMoji");
		}
	}

	// fill in verion number
	let version = document.getElementById("version")
	version.innerText = "v" + chrome.runtime.getManifest().version

	// And finally, focus whatever element the user wants selected (if any)
	if (SETTINGS.uiSettings?.autoFocus) {
		const focusMap = {
			"site": EL_site,
			"login": EL_login,
			"masterPassword": EL_masterpw,
			"length": EL_length,
			"index": EL_index,
		};
		focusMap[SETTINGS.uiSettings.autoFocus]?.focus();
	}
});

// --- core functions

// TODO | make debounce setting affect this
function debounce(fn, delay) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}

async function loadSettings() {
	const SETTINGS = localStorage.getItem("LPSettings");
	if (Object.keys(SETTINGS).length === 0) {
		// If the Settings are literally non existant, open the settings page...
		chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
		return;
	} else {
		return JSON.parse(SETTINGS)
	}
}

function generateLogin(pureDomain,template,domain) {
	template = template.replace("%s", pureDomain.split(".")[0]);
	template = template.replace("%d", domain);
	return template
}

function showCopiedOverlay(copiedOverlayElement,ms) {
	copiedOverlayElement.style.visibility = "visible";
	setTimeout(() => copiedOverlayElement.style.visibility = "hidden", ms);
}


function copyToClipboard(text,copiedOverlayElement,SETTINGS) {
	navigator.clipboard.writeText(text).then(() => {
		if (SETTINGS.uiSettings.overlay.enabled) {
			showCopiedOverlay(copiedOverlayElement,SETTINGS.uiSettings.overlay.duration);
		}
	})
}

async function regeneratePassword(CORE, SETTINGS, siteElement, loginElement, masterPasswordElement, lengthElement, indexElement,filterLowersElement, filterCapsElement, filterNumbersElement, filterSymbolsElement, outputElement, emojiElements) {
	const site = siteElement.value;
	const login = loginElement.value;
	const masterPassword = masterPasswordElement.value;
	const length = Number(lengthElement.value);
	const index = Number(indexElement.value);

	if (site && login && masterPassword.length >= 1 && length >= 1 && index >= 1) {
		let password = await CORE.getPW(site, login, masterPassword, length, index, filterLowersElement.checked,filterCapsElement.checked,filterNumbersElement.checked,filterSymbolsElement.checked);
		outputElement.value = password;
	} else {
		outputElement.value = "";
	}
	debounce(() => CORE.getPassMojis(masterPasswordElement.value), 1100)();
}
