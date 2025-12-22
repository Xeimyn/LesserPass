
document.addEventListener('DOMContentLoaded', () => {
    // Iterate over all inputs, textareas, selects
    document.querySelectorAll('.settingsContainer input, .settingsContainer textarea, .settingsContainer select').forEach(el => {
        const labelText = el.getAttribute('aria-label');

        // --- Checkboxes
        if (el.type === 'checkbox') {
            if (labelText) {
                const h2 = document.createElement('h2');
                h2.textContent = labelText;

                const wrapper = document.createElement('div');
                wrapper.className = 'flex-side-side';

                // checkbox first, label second
                el.parentNode.insertBefore(wrapper, el);
                wrapper.appendChild(el);
                wrapper.appendChild(h2);
            }
        }
        // --- Number
       else if (el.type === 'number') {
            const labelText = el.getAttribute('aria-label');

            // Outer wrapper div that will contain the label and combo
            const wrapper = document.createElement('div');
            wrapper.className = 'number-wrapper';

            // Insert wrapper BEFORE the input
            el.parentNode.insertBefore(wrapper, el);

            // Add label if exists
            if (labelText) {
                const h2 = document.createElement('h2');
                h2.textContent = labelText;
                wrapper.appendChild(h2);
            }

            // Inner combo div with buttons + input
            const combo = document.createElement('div');
            combo.className = 'input-combo';
            combo.style.display = 'flex';
            combo.style.alignItems = 'center';
            combo.style.gap = '4px';

            const minus = document.createElement('button');
            minus.type = 'button';
            minus.textContent = '-';
            minus.classList.add("minus")
            minus.addEventListener('click', () => {
                el.value = Number(el.value || 0) - 1;
                el.dispatchEvent(new Event('change'));
            });

            const plus = document.createElement('button');
            plus.type = 'button';
            plus.textContent = '+';
            plus.classList.add("plus")
            plus.addEventListener('click', () => {
                el.value = Number(el.value || 0) + 1;
                el.dispatchEvent(new Event('change'));
            });

            // Move the input into the combo
            combo.appendChild(minus);
            combo.appendChild(el);
            combo.appendChild(plus);

            // Append combo to the wrapper
            wrapper.appendChild(combo);
        }
        // --- other
        else if (labelText) {
            const h2 = document.createElement('h2');
            h2.textContent = labelText;
            el.insertAdjacentElement('beforebegin', h2);
        }
    });

    // --- Save settings
    document.getElementById('save').addEventListener('click', () => {
        const settingsContainer = document.querySelector('.settingsContainer');

        function buildJSON(element) {
            const SETTINGS = {};

            element.childNodes.forEach(child => {
                if (child.nodeType !== Node.ELEMENT_NODE) return;

                if (child.tagName === 'SECTION') {
                    const sectionId = child.id || child.getAttribute('sectionTitle') || 'unknown';
                    SETTINGS[sectionId] = buildJSON(child);
                } else if (child.tagName === 'DIV') {
                    // Recurse inside wrapper divs
                    const inner = buildJSON(child);
                    mergeObjects(SETTINGS, inner);
                } else if (child.tagName === 'INPUT' || child.tagName === 'TEXTAREA' || child.tagName === 'SELECT') {
                    let key = child.id || child.name || 'unknown';
                    let value;

                    if (child.type === 'checkbox') value = child.checked;
                    else if (child.type === 'number') value = child.value ? Number(child.value) : 0;
                    else value = child.value;

                    // Split on '.' to create nested objects
                    const parts = key.split('.');
                    let target = SETTINGS;
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        if (i === parts.length - 1) {
                            target[part] = value;
                        } else {
                            if (!target[part]) target[part] = {};
                            target = target[part];
                        }
                    }
                }
            });
            return SETTINGS;
        }

        const output = buildJSON(settingsContainer);
        console.log(JSON.stringify(output, null, 2));
        // TODO | save to local storage for now
    });
});


function mergeObjects(target, source) {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            mergeObjects(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}

// --- LATER

// // Load settings from localStorage or use default settings
// let settings = JSON.parse(localStorage.getItem("LesserPassSettings"));
// }
// // Set settings example
// 	localStorage.setItem("LesserPassSettings", JSON.stringify(updatedSettings));
// });

// // remove "hide" class from incognito banner if the extension cant access incognito windows
// 	const canAccessIncognito = await chrome.extension.isAllowedIncognitoAccess()
// 	console.log(incognitoBanner);
// 	console.log(canAccessIncognito);

// 	if (! canAccessIncognito) {
// 		incognitoBanner.classList.remove("hide");
// 	}