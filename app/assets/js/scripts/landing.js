/**
 * Script for landing.ejs
 */
// Requirements
const cp = require("child_process");
const crypto = require("crypto");
const { URL } = require("url");

// Internal Requirements
const DiscordWrapper = require("./assets/js/discordwrapper");
const Mojang = require("./assets/js/mojang");
const ProcessBuilder = require("./assets/js/processbuilder");
const ServerStatus = require("./assets/js/serverstatus");

// Launch Elements
const launch_content = document.getElementById("launch_content");
const launch_details = document.getElementById("launch_details");
const launch_progress = document.getElementById("launch_progress");
const launch_progress_label = document.getElementById("launch_progress_label");
const launch_details_text = document.getElementById("launch_details_text");
const server_selection_button = document.getElementById(
	"server_selection_button"
);
const user_text = document.getElementById("user_text");

const loggerLanding = LoggerUtil(
	"%c[Landing]",
	"color: #000668; font-weight: bold"
);

/* Launch Progress Wrapper Functions */

/**
 * Show/hide the loading area.
 *
 * @param {boolean} loading True if the loading area should be shown, otherwise false.
 */
function toggleLaunchArea(loading) {
	if (loading) {
		launch_details.style.display = "flex";
		launch_content.style.display = "none";
	} else {
		launch_details.style.display = "none";
		launch_content.style.display = "inline-flex";
	}
}

/**
 * Set the details text of the loading area.
 *
 * @param {string} details The new text for the loading details.
 */
function setLaunchDetails(details) {
	launch_details_text.innerHTML = details;
}

/**
 * Set the value of the loading progress bar and display that value.
 *
 * @param {number} value The progress value.
 * @param {number} max The total size.
 * @param {number|string} percent Optional. The percentage to display on the progress label.
 */
function setLaunchPercentage(
	value,
	max,
	percent = Math.floor((value / max) * 100)
) {
	launch_progress.setAttribute("max", max);
	launch_progress.setAttribute("value", value);
	launch_progress_label.innerHTML = percent + "%";
}

/**
 * Set the value of the OS progress bar and display that on the UI.
 *
 * @param {number} value The progress value.
 * @param {number} max The total download size.
 * @param {number|string} percent Optional. The percentage to display on the progress label.
 */
function setDownloadPercentage(value, max, percent = (value / max) * 100) {
	remote.getCurrentWindow().setProgressBar(value / max);
	setLaunchPercentage(value, max, percent);
}

/**
 * Enable or disable the launch button.
 *
 * @param {boolean} val True to enable, false to disable.
 */
function setLaunchEnabled(val) {
	document.getElementById("launch_button").disabled = !val;
}

// Bind launch button
document
	.getElementById("launch_button")
	.addEventListener("click", function (e) {
		loggerLanding.log("Launching game..");
		const mcVersion = DistroManager.getDistribution().getServer(
			ConfigManager.getSelectedServer()
		).minecraftVersion;
		const jExe = ConfigManager.getJavaExecutable();
		if (jExe == null) {
			asyncSystemScan(mcVersion);
		} else {
			setLaunchDetails(Lang.queryJS("landing.launch.pleaseWait"));
			toggleLaunchArea(true);
			setLaunchPercentage(0, 100);

			const jg = new JavaGuard(mcVersion);
			jg._validateJavaBinary(jExe).then((v) => {
				loggerLanding.log("Java version meta", v);
				if (v.valid) {
					dlAsync();
				} else {
					asyncSystemScan(mcVersion);
				}
			});
		}
	});

// Bind settings button
document.getElementById("settingsMediaButton").onclick = (e) => {
	prepareSettings();
	switchView(getCurrentView(), VIEWS.settings);
};
document.getElementById("reloadMediaButton").onclick = (e) => {
    ConfigManager.relaunchApp();
};
document.getElementById("devMediaButton").onclick = (e) => {
    let window = remote.getCurrentWindow()
        window.toggleDevTools()
};

// Bind avatar overlay button.
document.getElementById("avatarOverlay").onclick = (e) => {
	prepareSettings();
	switchView(getCurrentView(), VIEWS.settings, 500, 500, () => {
		settingsNavItemListener(
			document.getElementById("settingsNavAccount"),
			false
		);
	});
};

// Bind selected account
function updateSelectedAccount(authUser) {
	let username = "No Account Selected";
	if (authUser != null) {
		if (authUser.displayName != null) {
			username = authUser.displayName;
		}
		if (authUser.uuid != null) {
			document.getElementById(
				"avatarContainer"
			).style.backgroundImage = `url('https://crafatar.com/renders/body/${authUser.uuid}')`;
		}
	}
	user_text.innerHTML = username;
}
updateSelectedAccount(ConfigManager.getSelectedAccount());

// Bind selected server
function updateSelectedServer(serv) {
	try {
		ConfigManager.setSelectedServer(serv != null ? serv.id : null);
        ConfigManager.save();
        icon = serv != null ? serv.icon : "data:image/png;base64,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"
		server_selection_button.innerHTML =
            "\u2022 " + (serv != null ? serv.name : "No Server Selected");
		document.getElementById("icon-preview").src = icon;
		if (getCurrentView() === VIEWS.settings) {
			animateModsTabRefresh();
		}
		setLaunchEnabled(serv != null);
	} catch {}
}
// Real text is set in uibinder.js on distributionIndexDone.
server_selection_button.innerHTML = "\u2022 Loading..";
server_selection_button.onclick = (e) => {
	e.target.blur();
	toggleServerSelection(true);
};

// Update Mojang Status Color
const refreshMojangStatuses = async function () {
	loggerLanding.log("Refreshing Mojang Statuses..");

	let status = "grey";
	let tooltipEssentialHTML = "";
	let tooltipNonEssentialHTML = "";

	try {
		const statuses = await Mojang.status();
		greenCount = 0;
		greyCount = 0;

		for (let i = 0; i < statuses.length; i++) {
			const service = statuses[i];

			if (service.essential) {
				tooltipEssentialHTML += `<div class="mojangStatusContainer">
                    <span class="mojangStatusIcon" style="color: ${Mojang.statusToHex(
						service.status
					)};">&#8226;</span>
                    <span class="mojangStatusName">${service.name}</span>
                </div>`;
			} else {
				tooltipNonEssentialHTML += `<div class="mojangStatusContainer">
                    <span class="mojangStatusIcon" style="color: ${Mojang.statusToHex(
						service.status
					)};">&#8226;</span>
                    <span class="mojangStatusName">${service.name}</span>
                </div>`;
			}

			if (service.status === "yellow" && status !== "red") {
				status = "yellow";
			} else if (service.status === "red") {
				status = "red";
			} else {
				if (service.status === "grey") {
					++greyCount;
				}
				++greenCount;
			}
		}

		if (greenCount === statuses.length) {
			if (greyCount === statuses.length) {
				status = "grey";
			} else {
				status = "green";
			}
		}
	} catch (err) {
		loggerLanding.warn("Unable to refresh Mojang service status.");
		loggerLanding.debug(err);
	}

	document.getElementById(
		"mojangStatusEssentialContainer"
	).innerHTML = tooltipEssentialHTML;
	document.getElementById(
		"mojangStatusNonEssentialContainer"
	).innerHTML = tooltipNonEssentialHTML;
	document.getElementById(
		"mojang_status_icon"
	).style.color = Mojang.statusToHex(status);
};

let mcVersions = null;
const getMcVersions = async function () {
	Mojang.getMCVersions().then((res) => {
		mcVersions = res;
	});
};

refreshMojangStatuses();
getMcVersions();
// Server Status is refreshed in uibinder.js on distributionIndexDone.

// Set refresh rate to once every 5 minutes.
let mojangStatusListener = setInterval(
	() => refreshMojangStatuses(true),
	300000
);

/**
 * Shows an error overlay, toggles off the launch area.
 *
 * @param {string} title The overlay title.
 * @param {string} desc The overlay description.
 */
function showLaunchFailure(title, desc) {
	setOverlayContent(title, desc, "Okay");
	setOverlayHandler(null);
	toggleOverlay(true);
	toggleLaunchArea(false);
}

/* System (Java) Scan */

let sysAEx;
let scanAt;

let extractListener;

/**
 * Asynchronously scan the system for valid Java installations.
 *
 * @param {string} mcVersion The Minecraft version we are scanning for.
 * @param {boolean} launchAfter Whether we should begin to launch after scanning.
 */
function asyncSystemScan(mcVersion, launchAfter = true) {
	setLaunchDetails("Please wait..");
	toggleLaunchArea(true);
	setLaunchPercentage(0, 100);

	const loggerSysAEx = LoggerUtil(
		"%c[SysAEx]",
		"color: #353232; font-weight: bold"
	);

	const forkEnv = JSON.parse(JSON.stringify(process.env));
	forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory();

	// Fork a process to run validations.
	sysAEx = cp.fork(
		path.join(__dirname, "assets", "js", "assetexec.js"),
		["JavaGuard", mcVersion],
		{
			env: forkEnv,
			stdio: "pipe",
		}
	);
	// Stdout
	sysAEx.stdio[1].setEncoding("utf8");
	sysAEx.stdio[1].on("data", (data) => {
		loggerSysAEx.log(data);
	});
	// Stderr
	sysAEx.stdio[2].setEncoding("utf8");
	sysAEx.stdio[2].on("data", (data) => {
		loggerSysAEx.log(data);
	});

	sysAEx.on("message", (m) => {
		if (m.context === "validateJava") {
			if (m.result == null) {
				// If the result is null, no valid Java installation was found.
				// Show this information to the user.
				setOverlayContent(
					"No Compatible<br>Java Installation Found",
					'In order to join WesterosCraft, you need a 64-bit installation of Java 8. Would you like us to install a copy? By installing, you accept <a href="http://www.oracle.com/technetwork/java/javase/terms/license/index.html">Oracle\'s license agreement</a>.',
					"Install Java",
					"Install Manually"
				);
				setOverlayHandler(() => {
					setLaunchDetails("Preparing Java Download..");
					sysAEx.send({
						task: "changeContext",
						class: "AssetGuard",
						args: [
							ConfigManager.getCommonDirectory(),
							ConfigManager.getJavaExecutable(),
						],
					});
					sysAEx.send({
						task: "execute",
						function: "_enqueueOpenJDK",
						argsArr: [ConfigManager.getDataDirectory()],
					});
					toggleOverlay(false);
				});
				setDismissHandler(() => {
					$("#overlayContent").fadeOut(250, () => {
						//$('#overlayDismiss').toggle(false)
						setOverlayContent(
							"Java is Required<br>to Launch",
							'A valid x64 installation of Java 8 is required to launch.<br><br>Please refer to our <a href="https://github.com/dscalzi/HeliosLauncher/wiki/Java-Management#manually-installing-a-valid-version-of-java">Java Management Guide</a> for instructions on how to manually install Java.',
							"I Understand",
							"Go Back"
						);
						setOverlayHandler(() => {
							toggleLaunchArea(false);
							toggleOverlay(false);
						});
						setDismissHandler(() => {
							toggleOverlay(false, true);
							asyncSystemScan();
						});
						$("#overlayContent").fadeIn(250);
					});
				});
				toggleOverlay(true, true);
			} else {
				// Java installation found, use this to launch the game.
				ConfigManager.setJavaExecutable(m.result);
				ConfigManager.save();

				// We need to make sure that the updated value is on the settings UI.
				// Just incase the settings UI is already open.
				settingsJavaExecVal.value = m.result;
				populateJavaExecDetails(settingsJavaExecVal.value);

				if (launchAfter) {
					dlAsync();
				}
				sysAEx.disconnect();
			}
		} else if (m.context === "_enqueueOpenJDK") {
			if (m.result === true) {
				// Oracle JRE enqueued successfully, begin download.
				setLaunchDetails("Downloading Java..");
				sysAEx.send({
					task: "execute",
					function: "processDlQueues",
					argsArr: [[{ id: "java", limit: 1 }]],
				});
			} else {
				// Oracle JRE enqueue failed. Probably due to a change in their website format.
				// User will have to follow the guide to install Java.
				setOverlayContent(
					"Unexpected Issue:<br>Java Download Failed",
					'Unfortunately we\'ve encountered an issue while attempting to install Java. You will need to manually install a copy. Please check out our <a href="https://github.com/dscalzi/HeliosLauncher/wiki">Troubleshooting Guide</a> for more details and instructions.',
					"I Understand"
				);
				setOverlayHandler(() => {
					toggleOverlay(false);
					toggleLaunchArea(false);
				});
				toggleOverlay(true);
				sysAEx.disconnect();
			}
		} else if (m.context === "progress") {
			switch (m.data) {
				case "download":
					// Downloading..
					setDownloadPercentage(m.value, m.total, m.percent);
					break;
			}
		} else if (m.context === "complete") {
			switch (m.data) {
				case "download": {
					// Show installing progress bar.
					remote.getCurrentWindow().setProgressBar(2);

					// Wait for extration to complete.
					const eLStr = "Extracting";
					let dotStr = "";
					setLaunchDetails(eLStr);
					extractListener = setInterval(() => {
						if (dotStr.length >= 3) {
							dotStr = "";
						} else {
							dotStr += ".";
						}
						setLaunchDetails(eLStr + dotStr);
					}, 750);
					break;
				}
				case "java":
					// Download & extraction complete, remove the loading from the OS progress bar.
					remote.getCurrentWindow().setProgressBar(-1);

					// Extraction completed successfully.
					ConfigManager.setJavaExecutable(m.args[0]);
					ConfigManager.save();

					if (extractListener != null) {
						clearInterval(extractListener);
						extractListener = null;
					}

					setLaunchDetails("Java Installed!");

					if (launchAfter) {
						dlAsync();
					}

					sysAEx.disconnect();
					break;
			}
		} else if (m.context === "error") {
			console.log(m.error);
		}
	});

	// Begin system Java scan.
	setLaunchDetails("Checking system info..");
	sysAEx.send({
		task: "execute",
		function: "validateJava",
		argsArr: [ConfigManager.getDataDirectory()],
	});
}

// Keep reference to Minecraft Process
let proc;
// Is DiscordRPC enabled
let hasRPC = false;
// Joined server regex
const SERVER_JOINED_REGEX = /\[.+\]: \[CHAT\] [a-zA-Z0-9_]{1,16} joined the game/;
const GAME_JOINED_REGEX = /\[.+\]: Skipping bad option: lastServer:/;
const GAME_LAUNCH_REGEX = /^\[.+\]: MinecraftForge .+ Initialized$/;

let aEx;
let serv;
let versionData;
let forgeData;

let progressListener;

function dlAsync(login = true) {
	// Login parameter is temporary for debug purposes. Allows testing the validation/downloads without
	// launching the game.

	if (login) {
		if (ConfigManager.getSelectedAccount() == null) {
			loggerLanding.error("You must be logged into an account.");
			return;
		}
	}

	setLaunchDetails("Please wait..");
	toggleLaunchArea(true);
	setLaunchPercentage(0, 100);
	const authUser = ConfigManager.getSelectedAccount();
	refreshDistributionIndex(true, (data) => {
		onDistroRefresh(data);
		serv = data.getServer(ConfigManager.getSelectedServer());
		const loggerLaunchSuite = LoggerUtil(
			"%c[LaunchSuite]",
			"color: #000668; font-weight: bold"
		);
		loggerLaunchSuite.log(
			`Sending selected account (${authUser.displayName}) to ProcessBuilder.`
		);
		let pb = new ProcessBuilder(
			serv,
			versionData,
			forgeData,
			authUser,
			remote.app.getVersion()
		);
		proc = pb.build();
	});
}

/**
 * News Loading Functions
 */

// DOM Cache
const newsContent = document.getElementById("newsContent");
const newsArticleTitle = document.getElementById("newsArticleTitle");
const newsArticleDate = document.getElementById("newsArticleDate");
const newsArticleAuthor = document.getElementById("newsArticleAuthor");
const newsArticleComments = document.getElementById("newsArticleComments");
const newsNavigationStatus = document.getElementById("newsNavigationStatus");
const newsArticleContentScrollable = document.getElementById(
	"newsArticleContentScrollable"
);
const nELoadSpan = document.getElementById("nELoadSpan");

// News slide caches.
let newsActive = false;
let newsGlideCount = 0;

/**
 * Show the news UI via a slide animation.
 *
 * @param {boolean} up True to slide up, otherwise false.
 */
function slide_(up) {
	const lCUpper = document.querySelector("#landingContainer > #upper");
	const lCLLeft = document.querySelector(
		"#landingContainer > #lower > #left"
	);
	const lCLCenter = document.querySelector(
		"#landingContainer > #lower > #center"
	);
	const lCLRight = document.querySelector(
		"#landingContainer > #lower > #right"
	);
	const newsBtn = document.querySelector(
		"#landingContainer > #lower > #center #content"
	);
	const landingContainer = document.getElementById("landingContainer");
	const newsContainer = document.querySelector(
		"#landingContainer > #newsContainer"
	);

	newsGlideCount++;

	if (up) {
		lCUpper.style.top = "-200vh";
		lCLLeft.style.top = "-200vh";
		lCLCenter.style.top = "-200vh";
		lCLRight.style.top = "-200vh";
		newsBtn.style.top = "130vh";
		newsContainer.style.top = "0px";
		//date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric'})
		//landingContainer.style.background = 'rgba(29, 29, 29, 0.55)'
		landingContainer.style.background = "rgba(0, 0, 0, 0.50)";
		setTimeout(() => {
			if (newsGlideCount === 1) {
				lCLCenter.style.transition = "none";
				newsBtn.style.transition = "none";
			}
			newsGlideCount--;
		}, 2000);
	} else {
		setTimeout(() => {
			newsGlideCount--;
		}, 2000);
		landingContainer.style.background = null;
		lCLCenter.style.transition = null;
		newsBtn.style.transition = null;
		newsContainer.style.top = "100%";
		lCUpper.style.top = "0px";
		lCLLeft.style.top = "0px";
		lCLCenter.style.top = "0px";
		lCLRight.style.top = "0px";
		newsBtn.style.top = "10px";
	}
}

// Bind news button.
document.getElementById("newsButton").onclick = () => {
	// Toggle tabbing.
	if (newsActive) {
		$("#landingContainer *").removeAttr("tabindex");
		$("#newsContainer *").attr("tabindex", "-1");
	} else {
		$("#landingContainer *").attr("tabindex", "-1");
		$(
			"#newsContainer, #newsContainer *, #lower, #lower #center *"
		).removeAttr("tabindex");
		if (newsAlertShown) {
			$("#newsButtonAlert").fadeOut(2000);
			newsAlertShown = false;
			ConfigManager.setNewsCacheDismissed(true);
			ConfigManager.save();
		}
	}
	slide_(!newsActive);
	newsActive = !newsActive;
};

// Array to store article meta.
let newsArr = null;

// News load animation listener.
let newsLoadingListener = null;

/**
 * Set the news loading animation.
 *
 * @param {boolean} val True to set loading animation, otherwise false.
 */
function setNewsLoading(val) {
	if (val) {
		const nLStr = "Checking for News";
		let dotStr = "..";
		nELoadSpan.innerHTML = nLStr + dotStr;
		newsLoadingListener = setInterval(() => {
			if (dotStr.length >= 3) {
				dotStr = "";
			} else {
				dotStr += ".";
			}
			nELoadSpan.innerHTML = nLStr + dotStr;
		}, 750);
	} else {
		if (newsLoadingListener != null) {
			clearInterval(newsLoadingListener);
			newsLoadingListener = null;
		}
	}
}

// Bind retry button.
newsErrorRetry.onclick = () => {
	$("#newsErrorFailed").fadeOut(250, () => {
		initNews();
		$("#newsErrorLoading").fadeIn(250);
	});
};

newsArticleContentScrollable.onscroll = (e) => {
	if (
		e.target.scrollTop >
		Number.parseFloat($(".newsArticleSpacerTop").css("height"))
	) {
		newsContent.setAttribute("scrolled", "");
	} else {
		newsContent.removeAttribute("scrolled");
	}
};

/**
 * Reload the news without restarting.
 *
 * @returns {Promise.<void>} A promise which resolves when the news
 * content has finished loading and transitioning.
 */
function reloadNews() {
	return new Promise((resolve, reject) => {
		$("#newsContent").fadeOut(250, () => {
			$("#newsErrorLoading").fadeIn(250);
			initNews().then(() => {
				resolve();
			});
		});
	});
}

let newsAlertShown = false;

/**
 * Show the news alert indicating there is new news.
 */
function showNewsAlert() {
	newsAlertShown = true;
	$(newsButtonAlert).fadeIn(250);
}

/**
 * Initialize News UI. This will load the news and prepare
 * the UI accordingly.
 *
 * @returns {Promise.<void>} A promise which resolves when the news
 * content has finished loading and transitioning.
 */
function initNews() {
	return new Promise((resolve, reject) => {
		setNewsLoading(true);

		let news = {};
		loadNews().then((news) => {
			newsArr = news.articles || null;

			if (newsArr == null) {
				// News Loading Failed
				setNewsLoading(false);

				$("#newsErrorLoading").fadeOut(250, () => {
					$("#newsErrorFailed").fadeIn(250, () => {
						resolve();
					});
				});
			} else if (newsArr.length === 0) {
				// No News Articles
				setNewsLoading(false);

				ConfigManager.setNewsCache({
					date: null,
					content: null,
					dismissed: false,
				});
				ConfigManager.save();

				$("#newsErrorLoading").fadeOut(250, () => {
					$("#newsErrorNone").fadeIn(250, () => {
						resolve();
					});
				});
			} else {
				// Success
				setNewsLoading(false);

				const lN = newsArr[0];
				const cached = ConfigManager.getNewsCache();
				let newHash = crypto
					.createHash("sha1")
					.update(lN.content)
					.digest("hex");
				let newDate = new Date(lN.date);
				let isNew = false;

				if (cached.date != null && cached.content != null) {
					if (new Date(cached.date) >= newDate) {
						// Compare Content
						if (cached.content !== newHash) {
							isNew = true;
							showNewsAlert();
						} else {
							if (!cached.dismissed) {
								isNew = true;
								showNewsAlert();
							}
						}
					} else {
						isNew = true;
						showNewsAlert();
					}
				} else {
					isNew = true;
					showNewsAlert();
				}

				if (isNew) {
					ConfigManager.setNewsCache({
						date: newDate.getTime(),
						content: newHash,
						dismissed: false,
					});
					ConfigManager.save();
				}

				const switchHandler = (forward) => {
					let cArt = parseInt(newsContent.getAttribute("article"));
					let nxtArt = forward
						? cArt >= newsArr.length - 1
							? 0
							: cArt + 1
						: cArt <= 0
						? newsArr.length - 1
						: cArt - 1;

					displayArticle(newsArr[nxtArt], nxtArt + 1);
				};

				document.getElementById("newsNavigateRight").onclick = () => {
					switchHandler(true);
				};
				document.getElementById("newsNavigateLeft").onclick = () => {
					switchHandler(false);
				};

				$("#newsErrorContainer").fadeOut(250, () => {
					displayArticle(newsArr[0], 1);
					$("#newsContent").fadeIn(250, () => {
						resolve();
					});
				});
			}
		});
	});
}

/**
 * Add keyboard controls to the news UI. Left and right arrows toggle
 * between articles. If you are on the landing page, the up arrow will
 * open the news UI.
 */
document.addEventListener("keydown", (e) => {
	if (newsActive) {
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			document
				.getElementById(
					e.key === "ArrowRight"
						? "newsNavigateRight"
						: "newsNavigateLeft"
				)
				.click();
		}
		// Interferes with scrolling an article using the down arrow.
		// Not sure of a straight forward solution at this point.
		// if(e.key === 'ArrowDown'){
		//     document.getElementById('newsButton').click()
		// }
	} else {
		if (getCurrentView() === VIEWS.landing) {
			if (e.key === "ArrowUp") {
				document.getElementById("newsButton").click();
			}
		}
	}
});

/**
 * Display a news article on the UI.
 *
 * @param {Object} articleObject The article meta object.
 * @param {number} index The article index.
 */
function displayArticle(articleObject, index) {
	newsArticleTitle.innerHTML = articleObject.title;
	newsArticleTitle.href = articleObject.link;
	newsArticleAuthor.innerHTML = "by " + articleObject.author;
	newsArticleDate.innerHTML = articleObject.date;
	newsArticleComments.innerHTML = articleObject.comments;
	newsArticleComments.href = articleObject.commentsLink;
	newsArticleContentScrollable.innerHTML =
		'<div id="newsArticleContentWrapper"><div class="newsArticleSpacerTop"></div>' +
		articleObject.content +
		'<div class="newsArticleSpacerBot"></div></div>';
	Array.from(
		newsArticleContentScrollable.getElementsByClassName(
			"bbCodeSpoilerButton"
		)
	).forEach((v) => {
		v.onclick = () => {
			const text = v.parentElement.getElementsByClassName(
				"bbCodeSpoilerText"
			)[0];
			text.style.display =
				text.style.display === "block" ? "none" : "block";
		};
	});
	newsNavigationStatus.innerHTML = index + " of " + newsArr.length;
	newsContent.setAttribute("article", index - 1);
}

/**
 * Load news information from the RSS feed specified in the
 * distribution index.
 */
function loadNews() {
	return new Promise((resolve, reject) => {
		const newsFeed = "https://www.minecraftglobal.com/feed/";
		const newsHost = new URL(newsFeed).origin + "/";
		$.ajax({
			url: newsFeed,
			success: (data) => {
				const items = $(data).find("item");
				const articles = [];

				for (let i = 0; i < items.length; i++) {
					// JQuery Element
					const el = $(items[i]);

					// Resolve date.
					const date = new Date(
						el.find("pubDate").text()
					).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
						hour: "numeric",
						minute: "numeric",
					});

					// Resolve comments.
					let comments = el.find("slash\\:comments").text() || "0";
					comments =
						comments + " Comment" + (comments === "1" ? "" : "s");

					// Fix relative links in content.
					let content = el.find("content\\:encoded").text();
					let regex = /src="(?!http:\/\/|https:\/\/)(.+?)"/g;
					let matches;
					while ((matches = regex.exec(content))) {
						content = content.replace(
							`"${matches[1]}"`,
							`"${newsHost + matches[1]}"`
						);
					}

					let link = el.find("link").text();
					let title = el.find("title").text();
					let author = el.find("dc\\:creator").text();

					// Generate article.
					articles.push({
						link,
						title,
						date,
						author,
						content,
						comments,
						commentsLink: link + "#comments",
					});
				}
				resolve({
					articles,
				});
			},
			timeout: 2500,
		}).catch((err) => {
			resolve({
				articles: null,
			});
		});
	});
}
