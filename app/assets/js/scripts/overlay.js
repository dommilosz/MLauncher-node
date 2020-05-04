/**
 * Script for overlay.ejs
 */

/* Overlay Wrapper Functions */
distro = DistroManager;
/**
 * Check to see if the overlay is visible.
 *
 * @returns {boolean} Whether or not the overlay is visible.
 */
function isOverlayVisible() {
	return document.getElementById("main").hasAttribute("overlay");
}

let overlayHandlerContent;

/**
 * Overlay keydown handler for a non-dismissable overlay.
 *
 * @param {KeyboardEvent} e The keydown event.
 */
function overlayKeyHandler(e) {
	if (e.key === "Enter" || e.key === "Escape") {
		document
			.getElementById(overlayHandlerContent)
			.getElementsByClassName("overlayKeybindEnter")[0]
			.click();
	}
}
/**
 * Overlay keydown handler for a dismissable overlay.
 *
 * @param {KeyboardEvent} e The keydown event.
 */
function overlayKeyDismissableHandler(e) {
	if (e.key === "Enter") {
		document
			.getElementById(overlayHandlerContent)
			.getElementsByClassName("overlayKeybindEnter")[0]
			.click();
	} else if (e.key === "Escape") {
		document
			.getElementById(overlayHandlerContent)
			.getElementsByClassName("overlayKeybindEsc")[0]
			.click();
	}
}

/**
 * Bind overlay keydown listeners for escape and exit.
 *
 * @param {boolean} state Whether or not to add new event listeners.
 * @param {string} content The overlay content which will be shown.
 * @param {boolean} dismissable Whether or not the overlay is dismissable
 */
function bindOverlayKeys(state, content, dismissable) {
	overlayHandlerContent = content;
	document.removeEventListener("keydown", overlayKeyHandler);
	document.removeEventListener("keydown", overlayKeyDismissableHandler);
	if (state) {
		if (dismissable) {
			document.addEventListener("keydown", overlayKeyDismissableHandler);
		} else {
			document.addEventListener("keydown", overlayKeyHandler);
		}
	}
}

/**
 * Toggle the visibility of the overlay.
 *
 * @param {boolean} toggleState True to display, false to hide.
 * @param {boolean} dismissable Optional. True to show the dismiss option, otherwise false.
 * @param {string} content Optional. The content div to be shown.
 */
function toggleOverlay(
	toggleState,
	dismissable = false,
	content = "overlayContent"
) {
	if (toggleState == null) {
		toggleState = !document.getElementById("main").hasAttribute("overlay");
	}
	if (typeof dismissable === "string") {
		content = dismissable;
		dismissable = false;
	}
	bindOverlayKeys(toggleState, content, dismissable);
	if (toggleState) {
		document.getElementById("main").setAttribute("overlay", true);
		// Make things untabbable.
		$("#main *").attr("tabindex", "-1");
		$("#" + content)
			.parent()
			.children()
			.hide();
		$("#" + content).show();
		if (dismissable) {
			$("#overlayDismiss").show();
		} else {
			$("#overlayDismiss").hide();
		}
		$("#overlayContainer").fadeIn({
			duration: 250,
			start: () => {
				if (getCurrentView() === VIEWS.settings) {
					document.getElementById(
						"settingsContainer"
					).style.backgroundColor = "transparent";
				}
			},
		});
	} else {
		document.getElementById("main").removeAttribute("overlay");
		// Make things tabbable.
		$("#main *").removeAttr("tabindex");
		$("#overlayContainer").fadeOut({
			duration: 250,
			start: () => {
				if (getCurrentView() === VIEWS.settings) {
					document.getElementById(
						"settingsContainer"
					).style.backgroundColor = "rgba(0, 0, 0, 0.50)";
				}
			},
			complete: () => {
				$("#" + content)
					.parent()
					.children()
					.hide();
				$("#" + content).show();
				if (dismissable) {
					$("#overlayDismiss").show();
				} else {
					$("#overlayDismiss").hide();
				}
			},
		});
	}
}

function toggleServerSelection(toggleState) {
	prepareServerSelectionList();
	toggleOverlay(toggleState, true, "serverSelectContent");
}

function toggleServerCreation(toggleState) {
	toggleOverlay(toggleState, true, "serverCreateContent");
}

/**
 * Set the content of the overlay.
 *
 * @param {string} title Overlay title text.
 * @param {string} description Overlay description text.
 * @param {string} acknowledge Acknowledge button text.
 * @param {string} dismiss Dismiss button text.
 */
function setOverlayContent(
	title,
	description,
	acknowledge,
	dismiss = "Dismiss"
) {
	document.getElementById("overlayTitle").innerHTML = title;
	document.getElementById("overlayDesc").innerHTML = description;
	document.getElementById("overlayAcknowledge").innerHTML = acknowledge;
	document.getElementById("overlayDismiss").innerHTML = dismiss;
}

/**
 * Set the onclick handler of the overlay acknowledge button.
 * If the handler is null, a default handler will be added.
 *
 * @param {function} handler
 */
function setOverlayHandler(handler) {
	if (handler == null) {
		document.getElementById("overlayAcknowledge").onclick = () => {
			toggleOverlay(false);
		};
	} else {
		document.getElementById("overlayAcknowledge").onclick = handler;
	}
}

/**
 * Set the onclick handler of the overlay dismiss button.
 * If the handler is null, a default handler will be added.
 *
 * @param {function} handler
 */
function setDismissHandler(handler) {
	if (handler == null) {
		document.getElementById("overlayDismiss").onclick = () => {
			toggleOverlay(false);
		};
	} else {
		document.getElementById("overlayDismiss").onclick = handler;
	}
}

/* Server Select View */

document.getElementById("serverSelectConfirm").addEventListener("click", () => {
	const listings = document.getElementsByClassName("serverListing");
	for (let i = 0; i < listings.length; i++) {
		if (listings[i].hasAttribute("selected")) {
			const serv = DistroManager.getDistribution().getServer(
				listings[i].getAttribute("servid")
			);
			updateSelectedServer(serv);
			toggleOverlay(false);
			return;
		}
	}
	// None are selected? Not possible right? Meh, handle it.
	if (listings.length > 0) {
		const serv = DistroManager.getDistribution().getServer(
			listings[i].getAttribute("servid")
		);
		updateSelectedServer(serv);
		toggleOverlay(false);
	}
});
document.getElementById("serverSelectCreate").addEventListener("click", () => {
	refreshMCVersionOptions();
	document.getElementById("Create_InstanceName").value = "";
	document.getElementById("Create_InstanceDesc").value = "";
	try{
	document.querySelector("#settingsMCVersionsOptions div[selected]").attributes.value.textContent = "";}catch{}
    document.getElementsByClassName("icon-select")[0].src = "data:image/png;base64,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";
	$("#serverSelectContent").fadeOut(250, () => {
		$("#serverCreateContent").fadeIn(250);
	});
});
function bindSettingsSelect() {
	for (let ele of document.getElementsByClassName(
		"settingsSelectContainer"
	)) {
		const selectedDiv = ele.getElementsByClassName(
			"settingsSelectSelected"
		)[0];

		selectedDiv.onclick = (e) => {
			e.stopPropagation();
			closeSettingsSelect(e.target);
			e.target.nextElementSibling.toggleAttribute("hidden");
			e.target.classList.toggle("select-arrow-active");
		};
	}
}

function closeSettingsSelect(el) {
	for (let ele of document.getElementsByClassName(
		"settingsSelectContainer"
	)) {
		const selectedDiv = ele.getElementsByClassName(
			"settingsSelectSelected"
		)[0];
		const optionsDiv = ele.getElementsByClassName(
			"settingsSelectOptions"
		)[0];

		if (!(selectedDiv === el)) {
			selectedDiv.classList.remove("select-arrow-active");
			optionsDiv.setAttribute("hidden", "");
		}
	}
}

/* If the user clicks anywhere outside the select box,
then close all select boxes: */
document.addEventListener("click", closeSettingsSelect);

bindSettingsSelect();

function refreshMCVersionOptions() {
	arr = mcVersions;

	newarr = [];

	allow_snapshots = document.getElementById("?AllowSnapshots").checked;
	allow_alpha = document.getElementById("?AllowAlpha").checked;
	allow_beta = document.getElementById("?AllowBeta").checked;

	if (allow_snapshots)
		newarr.push({
			name: "Latest Snapshot " + arr.latest.snapshot,
			fullName: JSON.stringify({number:arr.latest.snapshot,type:"snapshot"}),
		});
	newarr.push({
		name: "Latest Release " + arr.latest.release,
		fullName: JSON.stringify({number:arr.latest.release,type:"release"}),
	});

	arr.versions.forEach((element) => {
		if (allow_snapshots && element.type == "snapshot")
			newarr.push({
				name: "Snapshot " + element.id,
				fullName: JSON.stringify({number:element.id,type:element.type}),
			});
		if (element.type == "release")
			newarr.push({
				name: "Release " + element.id,
				fullName: JSON.stringify({number:element.id,type:element.type}),
			});
		if (allow_alpha && element.type == "old_alpha")
			newarr.push({
				name: "Alpha " + element.id,
				fullName: JSON.stringify({number:element.id,type:element.type}),
			});
		if (allow_beta && element.type == "old_beta")
			newarr.push({
				name: "Beta " + element.id,
				fullName: JSON.stringify({number:element.id,type:element.type}),
			});
	});

	setMCVersionOptions(newarr,newarr[0]);
}

function setMCVersionOptions(arr, selected) {
	const cont = document.getElementById("settingsMCVersionsOptions");
	cont.innerHTML = "";
	for (let opt of arr) {
		const d = document.createElement("DIV");
		d.innerHTML = opt.name;
		d.setAttribute("value", opt.fullName);
		if (opt.fullName === selected) {
			d.setAttribute("selected", "");
			document.getElementById("settingsMCVersionsSelected").innerHTML =
				opt.name;
		}
		d.addEventListener("click", function (e) {
			this.parentNode.previousElementSibling.innerHTML = this.innerHTML;
			for (let sib of this.parentNode.children) {
				sib.removeAttribute("selected");
			}
			this.setAttribute("selected", "");
			closeSettingsSelect();
		});
		cont.appendChild(d);
	}
}

document
	.getElementById("accountSelectConfirm")
	.addEventListener("click", () => {
		const listings = document.getElementsByClassName("accountListing");
		for (let i = 0; i < listings.length; i++) {
			if (listings[i].hasAttribute("selected")) {
				const authAcc = ConfigManager.setSelectedAccount(
					listings[i].getAttribute("uuid")
				);
				ConfigManager.save();
				updateSelectedAccount(authAcc);
				toggleOverlay(false);
				validateSelectedAccount();
				return;
			}
		}
		// None are selected? Not possible right? Meh, handle it.
		if (listings.length > 0) {
			const authAcc = ConfigManager.setSelectedAccount(
				listings[0].getAttribute("uuid")
			);
			ConfigManager.save();
			updateSelectedAccount(authAcc);
			toggleOverlay(false);
			validateSelectedAccount();
		}
	});

// Bind server select cancel button.
document.getElementById("serverSelectCancel").addEventListener("click", () => {
	toggleOverlay(false);
});
document.getElementById("serverCreateCancel").addEventListener("click", () => {
	$("#serverCreateContent").fadeOut(250, () => {
		$("#serverSelectContent").fadeIn(250);
	});
});

document.getElementById("?AllowSnapshots").addEventListener("change", () => {
	refreshMCVersionOptions();
});
document.getElementById("?AllowAlpha").addEventListener("change", () => {
	refreshMCVersionOptions();
});
document.getElementById("?AllowBeta").addEventListener("change", () => {
	refreshMCVersionOptions();
});
document
	.getElementsByClassName("icon-select")[0]
	.addEventListener("click", () => {
		document.getElementById("file-input").click();
	});
document.getElementById("file-input").addEventListener("change", (evt) => {
	var files = evt.target.files;
	if (files.length > 0) {
		f = files[0];
		if (f.type.match("image.*")) {
			var reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = (function (theFile) {
				return function (e) {
					document.getElementsByClassName("icon-select")[0].src = e.target.result;
				};
			})(f);

			// Read in the image file as a data URL.
			reader.readAsDataURL(f);
		}
	}
});
document.getElementById("serverCreate").addEventListener("click", () => {
	instname = document.getElementById("Create_InstanceName").value;
	instdesc = document.getElementById("Create_InstanceDesc").value;
	instversion = JSON.parse( document.querySelector(".settingsSelectOptions div[selected]")
	.attributes.value.textContent);
	insticon = document.getElementsByClassName("icon-select")[0].src;
	instid = (Math.random()*100000000000000000).toString();
	instance = {id:instid,name:instname,description:instdesc,minecraftVersion:{number:instversion.number,type:instversion.type},icon:insticon};
	
	distro.addInstance(instance);
	$("#serverCreateContent").fadeOut(250, () => {
		$("#serverSelectContent").fadeIn(250);
	});
});

document.getElementById("accountSelectCancel").addEventListener("click", () => {
	$("#accountSelectContent").fadeOut(250, () => {
		$("#overlayContent").fadeIn(250);
	});
});

function setServerListingHandlers() {
	const listings = Array.from(
		document.getElementsByClassName("serverListing")
	);
	listings.map((val) => {
		val.onclick = (e) => {
			if (val.hasAttribute("selected")) {
				return;
			}
			const cListings = document.getElementsByClassName("serverListing");
			for (let i = 0; i < cListings.length; i++) {
				if (cListings[i].hasAttribute("selected")) {
					cListings[i].removeAttribute("selected");
				}
			}
			val.setAttribute("selected", "");
			document.activeElement.blur();
		};
	});
}

function setAccountListingHandlers() {
	const listings = Array.from(
		document.getElementsByClassName("accountListing")
	);
	listings.map((val) => {
		val.onclick = (e) => {
			if (val.hasAttribute("selected")) {
				return;
			}
			const cListings = document.getElementsByClassName("accountListing");
			for (let i = 0; i < cListings.length; i++) {
				if (cListings[i].hasAttribute("selected")) {
					cListings[i].removeAttribute("selected");
				}
			}
			val.setAttribute("selected", "");
			document.activeElement.blur();
		};
	});
}

function populateServerListings() {
	const distro = DistroManager.getDistribution();
	const giaSel = ConfigManager.getSelectedServer();
	const servers = distro.getServers();
	let htmlString = "";
	for (const serv of servers) {
		htmlString += `<button class="serverListing" servid="${serv.id}" ${
			serv.id === giaSel ? "selected" : ""
		}>
            <img class="serverListingImg" src="${serv.icon}"/>
            <div class="serverListingDetails">
                <span class="serverListingName">${serv.name}</span>
                <span class="serverListingDescription">${
					serv.description
				}</span>
                <div class="serverListingInfo">
                    <div class="serverListingVersion">${
						serv.minecraftVersion.number
					}</div>
                    ${
						serv.selected
							? `<div class="serverListingStarWrapper">
                        <svg id="Layer_1" viewBox="0 0 107.45 104.74" width="20px" height="20px">
                            <defs>
                                <style>.cls-1{fill:#fff;}.cls-2{fill:none;stroke:#fff;stroke-miterlimit:10;}</style>
                            </defs>
                            <path class="cls-1" d="M100.93,65.54C89,62,68.18,55.65,63.54,52.13c2.7-5.23,18.8-19.2,28-27.55C81.36,31.74,63.74,43.87,58.09,45.3c-2.41-5.37-3.61-26.52-4.37-39-.77,12.46-2,33.64-4.36,39-5.7-1.46-23.3-13.57-33.49-20.72,9.26,8.37,25.39,22.36,28,27.55C39.21,55.68,18.47,62,6.52,65.55c12.32-2,33.63-6.06,39.34-4.9-.16,5.87-8.41,26.16-13.11,37.69,6.1-10.89,16.52-30.16,21-33.9,4.5,3.79,14.93,23.09,21,34C70,86.84,61.73,66.48,61.59,60.65,67.36,59.49,88.64,63.52,100.93,65.54Z"/>
                            <circle class="cls-2" cx="53.73" cy="53.9" r="38"/>
                        </svg>
                        <span class="serverListingStarTooltip">Main Server</span>
                    </div>`
							: ""
					}
                </div>
            </div>
        </button>`;
	}
	document.getElementById(
		"serverSelectListScrollable"
	).innerHTML = htmlString;
}

function populateAccountListings() {
	const accountsObj = ConfigManager.getAuthAccounts();
	const accounts = Array.from(
		Object.keys(accountsObj),
		(v) => accountsObj[v]
	);
	let htmlString = "";
	for (let i = 0; i < accounts.length; i++) {
		htmlString += `<button class="accountListing" uuid="${
			accounts[i].uuid
		}" ${i === 0 ? "selected" : ""}>
            <img src="https://crafatar.com/renders/head/${
				accounts[i].uuid
			}?scale=2&default=MHF_Steve&overlay">
            <div class="accountListingName">${accounts[i].displayName}</div>
        </button>`;
	}
	document.getElementById(
		"accountSelectListScrollable"
	).innerHTML = htmlString;
}

function prepareServerSelectionList() {
	populateServerListings();
	setServerListingHandlers();
}

function prepareAccountSelectionList() {
	populateAccountListings();
	setAccountListingHandlers();
}
