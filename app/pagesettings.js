for(let key of Object.keys(Lang.query('html'))){
    document.getElementById(key).innerHTML = Lang.query(`html.${key}`)
}
document.getElementById("loginContainer").style.display = "none";
document.getElementById("landingContainer").style.display = "none";
document.getElementById("overlayContainer").style.display = "none";
document.getElementById("settingsContainer").style.display = "none";
