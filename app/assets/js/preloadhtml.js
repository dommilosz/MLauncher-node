for (let key of Object.keys(Lang.query("html"))) {
	document.getElementById(key).innerHTML = Lang.query(`html.${key}`);
}

document.querySelectorAll("[tohide]").forEach((e) => {
	e.style.display = "none";
});
document.querySelectorAll(".Container-menu").forEach((e) => {
	e.style.display = "none";
});
