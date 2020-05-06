// Requirements
const os     = require('os')
const semver = require('semver')
const fs = require('fs');
const { JavaGuard } = require('./assets/js/assetguard')
const DropinModUtil  = require('./assets/js/dropinmodutil')

const settingsState = {
    invalid: new Set()
}

function bindSettingsSelect(){
    for(let ele of document.getElementsByClassName('settingsSelectContainer')) {
        const selectedDiv = ele.getElementsByClassName('settingsSelectSelected')[0]

        selectedDiv.onclick = (e) => {
            e.stopPropagation()
            closeSettingsSelect(e.target)
            e.target.nextElementSibling.toggleAttribute('hidden')
            e.target.classList.toggle('select-arrow-active')
        }
    }
}

function closeSettingsSelect(el){
    for(let ele of document.getElementsByClassName('settingsSelectContainer')) {
        const selectedDiv = ele.getElementsByClassName('settingsSelectSelected')[0]
        const optionsDiv = ele.getElementsByClassName('settingsSelectOptions')[0]

        if(!(selectedDiv === el)) {
            selectedDiv.classList.remove('select-arrow-active')
            optionsDiv.setAttribute('hidden', '')
        }
    }
}

/* If the user clicks anywhere outside the select box,
then close all select boxes: */
document.addEventListener('click', closeSettingsSelect)

bindSettingsSelect()


function bindFileSelectors(){
    for(let ele of document.getElementsByClassName('settingsFileSelSel')){
        if(ele.id === 'settingsJavaExecSel'){
            ele.onchange = (e) => {
                ele.previousElementSibling.value = ele.files[0].path
                populateJavaExecDetails(ele.previousElementSibling.value)
            }
        } else {
            ele.onchange = (e) => {
                ele.previousElementSibling.value = ele.files[0].path
            }
        }
    }
}

bindFileSelectors()


/**
 * General Settings Functions
 */

/**
  * Bind value validators to the settings UI elements. These will
  * validate against the criteria defined in the ConfigManager (if
  * and). If the value is invalid, the UI will reflect this and saving
  * will be disabled until the value is corrected. This is an automated
  * process. More complex UI may need to be bound separately.
  */
function initSettingsValidators(){
    const sEls = document.getElementById('settingsContainer').querySelectorAll('[cValue]')
    Array.from(sEls).map((v, index, arr) => {
        const vFn = ConfigManager['validate' + v.getAttribute('cValue')]
        if(typeof vFn === 'function'){
            if(v.tagName === 'INPUT'){
                if(v.type === 'number' || v.type === 'text'){
                    v.addEventListener('keyup', (e) => {
                        const v = e.target
                        if(!vFn(v.value)){
                            settingsState.invalid.add(v.id)
                            v.setAttribute('error', '')
                            settingsSaveDisabled(true)
                        } else {
                            if(v.hasAttribute('error')){
                                v.removeAttribute('error')
                                settingsState.invalid.delete(v.id)
                                if(settingsState.invalid.size === 0){
                                    settingsSaveDisabled(false)
                                }
                            }
                        }
                    })
                }
            }
        }

    })
}

/**
 * Load configuration values onto the UI. This is an automated process.
 */
function initSettingsValues(){
    const sEls = document.getElementById('settingsContainer').querySelectorAll('[cValue]')
    Array.from(sEls).map((v, index, arr) => {
        const cVal = v.getAttribute('cValue')
        const gFn = ConfigManager['get' + cVal]
        if(typeof gFn === 'function'){
            if(v.tagName === 'INPUT'){
                if(v.type === 'number' || v.type === 'text'){
                    // Special Conditions
                    if(cVal === 'JavaExecutable'){
                        populateJavaExecDetails(v.value)
                        v.value = gFn()
                    } else if (cVal === 'DataDirectory'){
                        v.value = gFn()
                    } else if(cVal === 'JVMOptions'){
                        v.value = gFn().join(' ')
                    } else {
                        v.value = gFn()
                    }
                } else if(v.type === 'checkbox'){
                    v.checked = gFn()
                }
            } else if(v.tagName === 'DIV'){
                if(v.classList.contains('rangeSlider')){
                    // Special Conditions
                    if(cVal === 'MinRAM' || cVal === 'MaxRAM'){
                        let val = gFn()
                        if(val.endsWith('M')){
                            val = Number(val.substring(0, val.length-1))/1000
                        } else {
                            val = Number.parseFloat(val)
                        }

                        v.setAttribute('value', val)
                    } else {
                        v.setAttribute('value', Number.parseFloat(gFn()))
                    }
                }
            }
        }

    })
}

/**
 * Save the settings values.
 */
function saveSettingsValues(){
    const sEls = document.getElementById('settingsContainer').querySelectorAll('[cValue]')
    Array.from(sEls).map((v, index, arr) => {
        const cVal = v.getAttribute('cValue')
        const sFn = ConfigManager['set' + cVal]
        if(typeof sFn === 'function'){
            if(v.tagName === 'INPUT'){
                if(v.type === 'number' || v.type === 'text'){
                    // Special Conditions
                    if(cVal === 'JVMOptions'){
                        sFn(v.value.split(' '))
                    } else {
                        sFn(v.value)
                    }
                } else if(v.type === 'checkbox'){
                    sFn(v.checked)
                    // Special Conditions
                    if(cVal === 'AllowPrerelease'){
                        changeAllowPrerelease(v.checked)
                    }
                }
            } else if(v.tagName === 'DIV'){
                if(v.classList.contains('rangeSlider')){
                    // Special Conditions
                    if(cVal === 'MinRAM' || cVal === 'MaxRAM'){
                        let val = Number(v.getAttribute('value'))
                        if(val%1 > 0){
                            val = val*1000 + 'M'
                        } else {
                            val = val + 'G'
                        }

                        sFn(val)
                    } else {
                        sFn(v.getAttribute('value'))
                    }
                }
            }
        }
    })
}

let selectedSettingsTab = 'settingsTabAccount'

/**
 * Modify the settings container UI when the scroll threshold reaches
 * a certain poin.
 * 
 * @param {UIEvent} e The scroll event.
 */
function settingsTabScrollListener(e){
    if(e.target.scrollTop > Number.parseFloat(getComputedStyle(e.target.firstElementChild).marginTop)){
        document.getElementById('settingsContainer').setAttribute('scrolled', '')
    } else {
        document.getElementById('settingsContainer').removeAttribute('scrolled')
    }
}

/**
 * Bind functionality for the settings navigation items.
 */
function setupSettingsTabs(){
    Array.from(document.getElementsByClassName('settingsNavItem')).map((val) => {
        if(val.hasAttribute('rSc')){
            val.onclick = () => {
                settingsNavItemListener(val)
            }
        }
    })
}

/**
 * Settings nav item onclick lisener. Function is exposed so that
 * other UI elements can quickly toggle to a certain tab from other views.
 * 
 * @param {Element} ele The nav item which has been clicked.
 * @param {boolean} fade Optional. True to fade transition.
 */
function settingsNavItemListener(ele, fade = true){
    if(ele.hasAttribute('selected')){
        return
    }
    const navItems = document.getElementsByClassName('settingsNavItem')
    for(let i=0; i<navItems.length; i++){
        if(navItems[i].hasAttribute('selected')){
            navItems[i].removeAttribute('selected')
        }
    }
    ele.setAttribute('selected', '')
    let prevTab = selectedSettingsTab
    selectedSettingsTab = ele.getAttribute('rSc')

    document.getElementById(prevTab).onscroll = null
    document.getElementById(selectedSettingsTab).onscroll = settingsTabScrollListener

    if(fade){
        $(`#${prevTab}`).fadeOut(250, () => {
            $(`#${selectedSettingsTab}`).fadeIn({
                duration: 250,
                start: () => {
                    settingsTabScrollListener({
                        target: document.getElementById(selectedSettingsTab)
                    })
                }
            })
        })
    } else {
        $(`#${prevTab}`).hide(0, () => {
            $(`#${selectedSettingsTab}`).show({
                duration: 0,
                start: () => {
                    settingsTabScrollListener({
                        target: document.getElementById(selectedSettingsTab)
                    })
                }
            })
        })
    }
}

const settingsNavDone = document.getElementById('settingsNavDone')

/**
 * Set if the settings save (done) button is disabled.
 * 
 * @param {boolean} v True to disable, false to enable.
 */
function settingsSaveDisabled(v){
    settingsNavDone.disabled = v
}

/* Closes the settings view and saves all data. */
settingsNavDone.onclick = () => {
    saveSettingsValues()
    ConfigManager.save()
    switchView(getCurrentView(), VIEWS.landing)
}

/**
 * Account Management Tab
 */

// Bind the add account button.
document.getElementById('settingsAddAccount').onclick = (e) => {
    switchView(getCurrentView(), VIEWS.login, 500, 500, () => {
        loginViewOnCancel = VIEWS.settings
        loginViewOnSuccess = VIEWS.settings
        loginCancelEnabled(true)
    })
}

/**
 * Bind functionality for the account selection buttons. If another account
 * is selected, the UI of the previously selected account will be updated.
 */
function bindAuthAccountSelect(){
    Array.from(document.getElementsByClassName('settingsAuthAccountSelect')).map((val) => {
        val.onclick = (e) => {
            if(val.hasAttribute('selected')){
                return
            }
            const selectBtns = document.getElementsByClassName('settingsAuthAccountSelect')
            for(let i=0; i<selectBtns.length; i++){
                if(selectBtns[i].hasAttribute('selected')){
                    selectBtns[i].removeAttribute('selected')
                    selectBtns[i].innerHTML = 'Select Account'
                }
            }
            val.setAttribute('selected', '')
            val.innerHTML = 'Selected Account &#10004;'
            setSelectedAccount(val.closest('.settingsAuthAccount').getAttribute('uuid'))
        }
    })
}

/**
 * Bind functionality for the log out button. If the logged out account was
 * the selected account, another account will be selected and the UI will
 * be updated accordingly.
 */
function bindAuthAccountLogOut(){
    Array.from(document.getElementsByClassName('settingsAuthAccountLogOut')).map((val) => {
        val.onclick = (e) => {
            let isLastAccount = false
            if(Object.keys(ConfigManager.getAuthAccounts()).length === 1){
                isLastAccount = true
                setOverlayContent(
                    'Warning<br>This is Your Last Account',
                    'In order to use the launcher you must be logged into at least one account. You will need to login again after.<br><br>Are you sure you want to log out?',
                    'I\'m Sure',
                    'Cancel'
                )
                setOverlayHandler(() => {
                    processLogOut(val, isLastAccount)
                    toggleOverlay(false)
                    switchView(getCurrentView(), VIEWS.login)
                })
                setDismissHandler(() => {
                    toggleOverlay(false)
                })
                toggleOverlay(true, true)
            } else {
                processLogOut(val, isLastAccount)
            }
            
        }
    })
}

/**
 * Process a log out.
 * 
 * @param {Element} val The log out button element.
 * @param {boolean} isLastAccount If this logout is on the last added account.
 */
function processLogOut(val, isLastAccount){
    const parent = val.closest('.settingsAuthAccount')
    const uuid = parent.getAttribute('uuid')
    const prevSelAcc = ConfigManager.getSelectedAccount()
    AuthManager.removeAccount(uuid).then(() => {
        if(!isLastAccount && uuid === prevSelAcc.uuid){
            const selAcc = ConfigManager.getSelectedAccount()
            refreshAuthAccountSelected(selAcc.uuid)
            updateSelectedAccount(selAcc)
            validateSelectedAccount()
        }
    })
    $(parent).fadeOut(250, () => {
        parent.remove()
    })
}

/**
 * Refreshes the status of the selected account on the auth account
 * elements.
 * 
 * @param {string} uuid The UUID of the new selected account.
 */
function refreshAuthAccountSelected(uuid){
    Array.from(document.getElementsByClassName('settingsAuthAccount')).map((val) => {
        const selBtn = val.getElementsByClassName('settingsAuthAccountSelect')[0]
        if(uuid === val.getAttribute('uuid')){
            selBtn.setAttribute('selected', '')
            selBtn.innerHTML = 'Selected Account &#10004;'
        } else {
            if(selBtn.hasAttribute('selected')){
                selBtn.removeAttribute('selected')
            }
            selBtn.innerHTML = 'Select Account'
        }
    })
}

const settingsCurrentAccounts = document.getElementById('settingsCurrentAccounts')

/**
 * Add auth account elements for each one stored in the authentication database.
 */
function populateAuthAccounts(){
    const authAccounts = ConfigManager.getAuthAccounts()
    const authKeys = Object.keys(authAccounts)
    if(authKeys.length === 0){
        return
    }
    const selectedUUID = ConfigManager.getSelectedAccount().uuid

    let authAccountStr = ''

    authKeys.map((val) => {
        var acctypesrc = "";
        const acc = authAccounts[val]
        if(acc.type=="mojang"){
            acctypesrc=" data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAACTFBMVEUAAADbFyjbGCnbGSnbGSrbGirbHSzcGircGivcGyvcHSzcHS3cHi3cHi7cHy3cHy7cIDDcITDdHi3dHy3dHy7dITHdIjLdIzLdIzPdJDPdJDTdJTTdJzXdJzbdKDbeKTfeKjjeKjneLDreLj3fLj3fMT/fMj/fMkDfNUPgNkPgNkTgN0TgOEXgO0nhPUrhPUvhPkvhPkzhP0zhQE3hQU7hQk/iRFHiRlPiR1PiR1TjSlbjTFfjTFnjTVnjTVrjTlrjT1vjUFzkUV3kUl7kU1/kVF/kVGDkVWDkVWHkVmHlVmLlV2LlV2PlWWPlWWTlWmTlWmXlW2XlW2blXGbmXWjmX2nmYWvmYmznZG7naHPnaXPoanXobHbobHfobXfobXjocHnpc3zqd3/qd4DqeIHqe4PrfYbrf4frgIjrgYnrgorshIzsiI/siJDtipLtjJTvl57vmJ/vmaDvnKLvnaTvnqXvoKbvoqfwpKnwp63wqK3xrrLysbXys7fztbnztrrzuLz0u7/0vsL0vsP0v8P1wMT1wcX1w8f1xMf1xMj1xcn2x8v2yMv2ycz2ys72y8/3zdD3zdH3ztH3ztL30NP30tX40tX409b41dj42Nr529353d/53uD63+H63+L64eP64uT75ef75uf75uj75+j75+n76uv76uz87O387u/87+/98PH98fL98vL98vP98/P98/T99PT99PX99fX99fb99vb+9vf+9/f+9/j++Pn++fn++vv++/v++/z+/Pz//Pz//f3//v7//v////+h9iHhAAAAAXRSTlMAQObYZgAAArxJREFUSMel1vtDS2EYB/DYeb29r2ObyKUIDSNM2qjcim6r3JPcc0kuuYaQS+6Ru9wZVoQiNWcLTcrzj2lnZ9vZOe9ufH/bec9n73u2932eExf3P+FH8FHFDxL4aCMBHc/HSHg+VhL+FkrVJLwgS3bqlCTCHFNu2M0kJoIqev4cVpBI/0Y9wMNUGkQirGvac4DPuVhORvsHCcbIE4yxbyGEksxPAP3bOTnR+sTEhQVF1pKSEmtRwbL0JOxZir7UoFnUAQBVGjnxibTz7Q5BcDqdwjdHZ8vVKiOmJOPNUW3aKwD3RsQg+joISl/ztvFDKtxft8TveGyrC358adHpdlDEddZS2Q8vszSGmYmYQVCpE1SxXR8AuJU+lMPzZ1M1WfcdQqR5g7nadlofiTjaWj/6Lwhtv6Etk6jI2gBxXNtvtZgWlB1s7PZfG6hBYci9igkIE0IQSim/0uu7emmMmvRIX9eQhnyPStHkfe8k8noWDUXuzJDvWkoKHkmrLcQhSEcZCt6W2NzknX03F4JcHKvcynjeA3HkGFGSNSIZ2MOptj9e3uIZuqBnE2cpYhz+A+7BobsplEk6czDjlE29Pzj0wsgmghWxjv/ewb3WaiIKslokfVs5VlkyPQFoz2YTqCWsAjDcVPvBlY8VZJVLJM+MlFn++KUncgibuKtxiJqpS+TZBGzZOGIZVxBomoOiJCt9BG7nEBIjAfuRDB1SKaoiK1yyc/y2fvPcZMpxnsqJEKdBRJdsSApLAHrtjadqKsuL8/KK12/adej4uZtPy6TfJUEi8Ys71LWl/6fQ1SX8+CV+6MyN9946TCJ00mUInzPjlL2CZDV+EbxxyNMtpuv9yenS848KtBeSmmstFJMvT543lpGU0faot7uI/UUVEn2nZDb9mID2H18s4mKeI3pCEwJvYdFNoA28t/0FkCD0fSFigCoAAAAASUVORK5CYII="
        }else if(acc.type=="cracked"){
            acctypesrc=" data:image/png;base64,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";
        }else if(acc.type=="mcleaks"){
            acctypesrc=" data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAABhlBMVEUAAAADnNkGnNkIntoJntoJn9oKntsKn9oLntoLn9oLoNoOodsPoNsPodsPotwQodsRotsSotsSotwTotsTo9wUo9wVotsVotwVo9wWotwWo9wWpNsXo9wXpNwYpNwYpN0ZpNwZpdwapdwbpdwbptwcpN0cptwcpt0cp90elcYept0ep90fmckfnNIfndIfp90gmcsgm88gnM8gndMgntMgn9Qgo9cgpdwgp90gp94gqN0hoNIhotkhpNkhpNohptshp94hqNYhqN0hqdshqtshq9sio90ipNgipd0iptwipt4ip94iqN0iqN4iqd4jqN4jqd4kpNckqN4kqd4lptklpt4lqd4lqt4mpt4mqd4mqt4nqdknqt4oqt4oqt8oq94oq98pqt8pq94pq98qqN8qqt8sqt8srNctqt8vrN8wrOAxqN8xqd8yqd8yrOAyreEyrtcyruEzqd8zrOAzreAzreEzrt80qd80r9g2ruE4rOE4r+E5ruE5r+E7suE8suE9sOE/seH12+WNAAAAAXRSTlMAQObYZgAAAepJREFUSMftlulX00AUxaOIbEYQWdxS28qiDRpRkbK4xQVBAoHIKGPa1F4VRZBFFHHF/5xp2kxKMoX0i0c93A/JvPvmN28mLycnkvRP6OPay+2gN/f6w+WKwJNmzZo31dpyrzZlEktruS0metOAk88Bcd87h6LS50XEVQ0gsdakDbR5XgtgJ08oFmMGBUhTHsNvCwtT5I8UrboM7A52H1WBZgGigbxzB/VsolwYnKbI1LjWYxPpMDFhIlYaHnNgLErSLR15uWQpIIsh5DpBuzeO55BgV6DLczpzdC6E9E0jyQMd0FKAyY04rA3BMwbt5gEFe9g2Dy9SqILjH3XwrLOsDDDpRTECp0HUGIWtq15wpRcbOJl0oxRrVULc/vaMA7EySqWX7OxdmmUT6BAXZWGW6sf3eJV/2lnQz6sLJX0ZocjavwKTbpw8w5XQC1WMb372t+FWSfhzOi5Jd+zgxo0VH/lhhI51TRoPI5/2RK4cIH8CGasW6ZfGG2XZjIpYstw44CaWzWgIuc8Tm0Y0ZPYhTyxNRUQe8MR69chy9cjm/4usREACfdnyke1oVcgbH7lJIlWB+t1LPO9BBeT9bgS6csqVou/2Z+9x5JVW6fsdWOqrv+XDacvcX8OHyr/Mj2Ze7Kuno3/579QOl5rWRcILmJYAAAAASUVORK5CYII="
        }

        authAccountStr += `<div class="settingsAuthAccount" uuid="${acc.uuid}">
            <div class="settingsAuthAccountLeft">
                <img class="settingsAuthAccountImage" alt="${acc.displayName}" src="https://crafatar.com/renders/body/${acc.uuid}?scale=3&default=MHF_Steve&overlay">
            </div>
            <div class="settingsAuthAccountRight">
                <div class="settingsAuthAccountDetails">
                    <div class="settingsAuthAccountDetailPane">
                        <div class="settingsAuthAccountDetailTitle">Username</div>
                        <div class="settingsAuthAccountDetailValue">${acc.displayName}</div>
                    </div>
                    <div class="settingsAuthAccountDetailPane">
                        <div class="settingsAuthAccountDetailTitle">UUID</div>
                        <div class="settingsAuthAccountDetailValue">${acc.uuid}</div>
                    </div>
                </div>
                <div class="settingsAuthAccountActions">
                    <button class="settingsAuthAccountSelect" ${selectedUUID === acc.uuid ? 'selected>Selected Account &#10004;' : '>Select Account'}</button>
                    <div class="acc-type" style="width:100px">
<img style="width:50px;height:50px" src="${acctypesrc}"></div>
                    <div class="settingsAuthAccountWrapper">
                        <button class="settingsAuthAccountLogOut">Log Out</button>
                    </div>
                </div>
            </div>
        </div>`
    })

    settingsCurrentAccounts.innerHTML = authAccountStr
}

/**
 * Prepare the accounts tab for display.
 */
function prepareAccountsTab() {
    populateAuthAccounts()
    bindAuthAccountSelect()
    bindAuthAccountLogOut()
}

/**
 * Minecraft Tab
 */

/**
  * Disable decimals, negative signs, and scientific notation.
  */
document.getElementById('settingsGameWidth').addEventListener('keydown', (e) => {
    if(/^[-.eE]$/.test(e.key)){
        e.preventDefault()
    }
})
document.getElementById('settingsGameHeight').addEventListener('keydown', (e) => {
    if(/^[-.eE]$/.test(e.key)){
        e.preventDefault()
    }
})

/**
 * Mods Tab
 */

const settingsModsContainer = document.getElementById('settingsModsContainer')

/**
 * Resolve and update the mods on the UI.
 */
function resolveModsForUI(){
    const serv = ConfigManager.getSelectedServer()

    const distro = DistroManager.getDistribution()
}

/**
 * Bind functionality to mod config toggle switches. Switching the value
 * will also switch the status color on the left of the mod UI.
 */
function bindModsToggleSwitch(){
    const sEls = settingsModsContainer.querySelectorAll('[formod]')
    Array.from(sEls).map((v, index, arr) => {
        v.onchange = () => {
            if(v.checked) {
                document.getElementById(v.getAttribute('formod')).setAttribute('enabled', '')
            } else {
                document.getElementById(v.getAttribute('formod')).removeAttribute('enabled')
            }
            
            var serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
            CACHE_SETTINGS_MODS_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.id, 'mods')
            DropinModUtil.toggleDropinMod(CACHE_SETTINGS_MODS_DIR,v.attributes.formod.textContent,v.checked)
            setTimeout(reloadDropinMods,1000);
            
        }
    })
}

// Drop-in mod elements.

let CACHE_SETTINGS_MODS_DIR
let CACHE_DROPIN_MODS

/**
 * Resolve any located drop-in mods for this server and
 * populate the results onto the UI.
 */
function resolveDropinModsForUI(){
    try{
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
    CACHE_SETTINGS_MODS_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.id, 'mods')
    CACHE_DROPIN_MODS = DropinModUtil.scanForDropinMods(CACHE_SETTINGS_MODS_DIR, serv.minecraftVersion.number)

    let dropinMods = ''

    for(dropin of CACHE_DROPIN_MODS){
        dropinMods += `<div id="${dropin.fullName}" class="settingsBaseMod settingsDropinMod" ${!dropin.disabled ? 'enabled' : ''}>
                    <div class="settingsModContent">
                        <div class="settingsModMainWrapper">
                            <div class="settingsModStatus"></div>
                            <div class="settingsModDetails">
                                <span class="settingsModName">${dropin.name}</span>
                                <div class="settingsDropinRemoveWrapper">
                                    <button class="settingsDropinRemoveButton" remmod="${dropin.fullName}">Remove</button>
                                </div>
                            </div>
                        </div>
                        <label class="toggleSwitch">
                            <input type="checkbox" formod="${dropin.fullName}" dropin ${!dropin.disabled ? 'checked' : ''}>
                            <span class="toggleSwitchSlider"></span>
                        </label>
                    </div>
                </div>`
    }

    document.getElementById('settingsDropinModsContent').innerHTML = dropinMods}catch{}
}
function resolvePacksForUI(){
    try{
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
    CACHE_SETTINGS_PACKS_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.id, 'resourcepacks')
    CACHE_DROPIN_MODS = DropinModUtil.scanForPacks(CACHE_SETTINGS_PACKS_DIR, serv.minecraftVersion.number)

    let dropinMods = ''

    for(dropin of CACHE_DROPIN_MODS){
        dropinMods += `<div id="${dropin.fullName}" class="settingsBaseMod settingsDropinMod" ${!dropin.disabled ? 'enabled' : ''}>
                    <div class="settingsModContent">
                        <div class="settingsModMainWrapper">
                            <div class="settingsModStatus"></div>
                            <div class="settingsModDetails">
                                <span class="settingsModName">${dropin.name}</span>
                                <div class="settingsDropinRemoveWrapper">
                                    <button class="settingsPackRemoveButton" rempack="${dropin.fullName}">Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`
    }

    document.getElementById('settingsPacksContent').innerHTML = dropinMods}catch{}
}

/**
 * Bind the remove button for each loaded drop-in mod.
 */
function bindDropinModsRemoveButton(){
    const sEls = settingsModsContainer.querySelectorAll('[remmod]')
    Array.from(sEls).map((v, index, arr) => {
        v.onclick = () => {
            const fullName = v.getAttribute('remmod')
            const res = DropinModUtil.deleteDropinMod(CACHE_SETTINGS_MODS_DIR, fullName)
            if(res){
                document.getElementById(fullName).remove()
            } else {
                setOverlayContent(
                    `Failed to Delete<br>Drop-in Mod ${fullName}`,
                    'Make sure the file is not in use and try again.',
                    'Okay'
                )
                setOverlayHandler(null)
                toggleOverlay(true)
            }
        }
    })
}
/**
 * Bind the remove button for each loaded resource pack.
 */
function bindPackRemoveButton(){
    try{
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
    CACHE_SETTINGS_PACKS_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.id, 'resourcepacks')
    const sEls = settingsModsContainer.querySelectorAll('[rempack]')
    Array.from(sEls).map((v, index, arr) => {
        v.onclick = () => {
            const fullName = v.getAttribute('rempack')
            const res = DropinModUtil.deleteDropinMod(CACHE_SETTINGS_PACKS_DIR, fullName)
            if(res){
                document.getElementById(fullName).remove()
            } else {
                setOverlayContent(
                    `Failed to Delete<br>Resource Pack ${fullName}`,
                    'Make sure the file is not in use and try again.',
                    'Okay'
                )
                setOverlayHandler(null)
                toggleOverlay(true)
            }
        }
    })}catch{}
}

/**
 * Bind functionality to the file system button for the selected
 * server configuration.
 */
function bindDropinModFileSystemButton(){
    const fsBtn = document.getElementById('settingsDropinFileSystemButton')
    fsBtn.onclick = () => {
        DropinModUtil.validateDir(CACHE_SETTINGS_MODS_DIR)
        shell.openItem(CACHE_SETTINGS_MODS_DIR)
    }
    fsBtn.ondragenter = e => {
        e.dataTransfer.dropEffect = 'move'
        fsBtn.setAttribute('drag', '')
        e.preventDefault()
    }
    fsBtn.ondragover = e => {
        e.preventDefault()
    }
    fsBtn.ondragleave = e => {
        fsBtn.removeAttribute('drag')
    }

    fsBtn.ondrop = e => {
        fsBtn.removeAttribute('drag')
        e.preventDefault()

        DropinModUtil.addDropinMods(e.dataTransfer.files, CACHE_SETTINGS_MODS_DIR)
        reloadDropinMods()
    }
}
function bindPacksModFileSystemButton(){
    try{
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
    CACHE_SETTINGS_PACKS_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.id, 'resourcepacks')
    const fsBtn = document.getElementById('settingsPacksFileSystemButton')
    fsBtn.onclick = () => {
        DropinModUtil.validateDir(CACHE_SETTINGS_PACKS_DIR)
        shell.openItem(CACHE_SETTINGS_PACKS_DIR)
    }
    fsBtn.ondragenter = e => {
        e.dataTransfer.dropEffect = 'move'
        fsBtn.setAttribute('drag', '')
        e.preventDefault()
    }
    fsBtn.ondragover = e => {
        e.preventDefault()
    }
    fsBtn.ondragleave = e => {
        fsBtn.removeAttribute('drag')
    }

    fsBtn.ondrop = e => {
        fsBtn.removeAttribute('drag')
        e.preventDefault()

        DropinModUtil.addDropinMods(e.dataTransfer.files, CACHE_SETTINGS_PACKS_DIR)
        reloadDropinMods()
    }}catch{}
}

// Refresh the drop-in mods when F5 is pressed.
// Only active on the mods tab.
document.addEventListener('keydown', (e) => {
    if(getCurrentView() === VIEWS.settings && selectedSettingsTab === 'settingsTabMods'){
        if(e.key === 'F5'){
            reloadDropinMods()
        }
    }
})

function reloadDropinMods(){
    try{
    resolveDropinModsForUI()
    bindDropinModsRemoveButton()
    bindDropinModFileSystemButton()
    bindModsToggleSwitch()

    resolvePacksForUI()
    bindPacksModFileSystemButton()
    bindPackRemoveButton()}catch{}
}

// Shaderpack

let CACHE_SETTINGS_INSTANCE_DIR
let CACHE_SHADERPACKS
let CACHE_SELECTED_SHADERPACK

// Server status bar functions.

/**
 * Load the currently selected server information onto the mods tab.
 */
function loadSelectedServerOnModsTab(){
    try{
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())

    document.getElementById('settingsSelServContent').innerHTML = `
        <img class="serverListingImg" src="${serv.icon}"/>
        <div class="serverListingDetails">
            <span class="serverListingName">${serv.name}</span>
            <span class="serverListingDescription">${serv.description}</span>
            <div class="serverListingInfo">
                <div class="serverListingVersion">${serv.minecraftVersion.number}</div>
                ${serv.selected ? `<div class="serverListingStarWrapper">
                    <svg id="Layer_1" viewBox="0 0 107.45 104.74" width="20px" height="20px">
                        <defs>
                            <style>.cls-1{fill:#fff;}.cls-2{fill:none;stroke:#fff;stroke-miterlimit:10;}</style>
                        </defs>
                        <path class="cls-1" d="M100.93,65.54C89,62,68.18,55.65,63.54,52.13c2.7-5.23,18.8-19.2,28-27.55C81.36,31.74,63.74,43.87,58.09,45.3c-2.41-5.37-3.61-26.52-4.37-39-.77,12.46-2,33.64-4.36,39-5.7-1.46-23.3-13.57-33.49-20.72,9.26,8.37,25.39,22.36,28,27.55C39.21,55.68,18.47,62,6.52,65.55c12.32-2,33.63-6.06,39.34-4.9-.16,5.87-8.41,26.16-13.11,37.69,6.1-10.89,16.52-30.16,21-33.9,4.5,3.79,14.93,23.09,21,34C70,86.84,61.73,66.48,61.59,60.65,67.36,59.49,88.64,63.52,100.93,65.54Z"/>
                        <circle class="cls-2" cx="53.73" cy="53.9" r="38"/>
                    </svg>
                    <span class="serverListingStarTooltip">Main Server</span>
                </div>` : ''}
            </div>
        </div>
    `}catch{}
}

// Bind functionality to the server switch button.
document.getElementById('settingsSwitchServerButton').addEventListener('click', (e) => {
    e.target.blur()
    toggleServerSelection(true)
})

/**
 * Function to refresh the mods tab whenever the selected
 * server is changed.
 */
function animateModsTabRefresh(){
    $('#settingsTabMods').fadeOut(500, () => {
        prepareModsTab()
        $('#settingsTabMods').fadeIn(500)
    })
}

/**
 * Prepare the Mods tab for display.
 */
function prepareModsTab(first){
    resolveModsForUI()
    resolveDropinModsForUI()
    bindDropinModsRemoveButton()
    bindDropinModFileSystemButton()
    bindModsToggleSwitch()
    loadSelectedServerOnModsTab()

    resolvePacksForUI()
    bindPacksModFileSystemButton()
    bindPackRemoveButton()
}

/**
 * Java Tab
 */

// DOM Cache
const settingsMaxRAMRange     = document.getElementById('settingsMaxRAMRange')
const settingsMinRAMRange     = document.getElementById('settingsMinRAMRange')
const settingsMaxRAMLabel     = document.getElementById('settingsMaxRAMLabel')
const settingsMinRAMLabel     = document.getElementById('settingsMinRAMLabel')
const settingsMemoryTotal     = document.getElementById('settingsMemoryTotal')
const settingsMemoryAvail     = document.getElementById('settingsMemoryAvail')
const settingsJavaExecDetails = document.getElementById('settingsJavaExecDetails')

// Store maximum memory values.
const SETTINGS_MAX_MEMORY = ConfigManager.getAbsoluteMaxRAM()
const SETTINGS_MIN_MEMORY = ConfigManager.getAbsoluteMinRAM()

// Set the max and min values for the ranged sliders.
settingsMaxRAMRange.setAttribute('max', SETTINGS_MAX_MEMORY)
settingsMaxRAMRange.setAttribute('min', SETTINGS_MIN_MEMORY)
settingsMinRAMRange.setAttribute('max', SETTINGS_MAX_MEMORY)
settingsMinRAMRange.setAttribute('min', SETTINGS_MIN_MEMORY )

// Bind on change event for min memory container.
settingsMinRAMRange.onchange = (e) => {

    // Current range values
    const sMaxV = Number(settingsMaxRAMRange.getAttribute('value'))
    const sMinV = Number(settingsMinRAMRange.getAttribute('value'))

    // Get reference to range bar.
    const bar = e.target.getElementsByClassName('rangeSliderBar')[0]
    // Calculate effective total memory.
    const max = (os.totalmem()-1000000000)/1000000000

    // Change range bar color based on the selected value.
    if(sMinV >= max/2){
        bar.style.background = '#e86060'
    } else if(sMinV >= max/4) {
        bar.style.background = '#e8e18b'
    } else {
        bar.style.background = null
    }

    // Increase maximum memory if the minimum exceeds its value.
    if(sMaxV < sMinV){
        const sliderMeta = calculateRangeSliderMeta(settingsMaxRAMRange)
        updateRangedSlider(settingsMaxRAMRange, sMinV,
            ((sMinV-sliderMeta.min)/sliderMeta.step)*sliderMeta.inc)
        settingsMaxRAMLabel.innerHTML = sMinV.toFixed(1) + 'G'
    }

    // Update label
    settingsMinRAMLabel.innerHTML = sMinV.toFixed(1) + 'G'
}

// Bind on change event for max memory container.
settingsMaxRAMRange.onchange = (e) => {
    // Current range values
    const sMaxV = Number(settingsMaxRAMRange.getAttribute('value'))
    const sMinV = Number(settingsMinRAMRange.getAttribute('value'))

    // Get reference to range bar.
    const bar = e.target.getElementsByClassName('rangeSliderBar')[0]
    // Calculate effective total memory.
    const max = (os.totalmem()-1000000000)/1000000000

    // Change range bar color based on the selected value.
    if(sMaxV >= max/2){
        bar.style.background = '#e86060'
    } else if(sMaxV >= max/4) {
        bar.style.background = '#e8e18b'
    } else {
        bar.style.background = null
    }

    // Decrease the minimum memory if the maximum value is less.
    if(sMaxV < sMinV){
        const sliderMeta = calculateRangeSliderMeta(settingsMaxRAMRange)
        updateRangedSlider(settingsMinRAMRange, sMaxV,
            ((sMaxV-sliderMeta.min)/sliderMeta.step)*sliderMeta.inc)
        settingsMinRAMLabel.innerHTML = sMaxV.toFixed(1) + 'G'
    }
    settingsMaxRAMLabel.innerHTML = sMaxV.toFixed(1) + 'G'
}

/**
 * Calculate common values for a ranged slider.
 * 
 * @param {Element} v The range slider to calculate against. 
 * @returns {Object} An object with meta values for the provided ranged slider.
 */
function calculateRangeSliderMeta(v){
    const val = {
        max: Number(v.getAttribute('max')),
        min: Number(v.getAttribute('min')),
        step: Number(v.getAttribute('step')),
    }
    val.ticks = (val.max-val.min)/val.step
    val.inc = 100/val.ticks
    return val
}

/**
 * Binds functionality to the ranged sliders. They're more than
 * just divs now :').
 */
function bindRangeSlider(){
    Array.from(document.getElementsByClassName('rangeSlider')).map((v) => {

        // Reference the track (thumb).
        const track = v.getElementsByClassName('rangeSliderTrack')[0]

        // Set the initial slider value.
        const value = v.getAttribute('value')
        const sliderMeta = calculateRangeSliderMeta(v)

        updateRangedSlider(v, value, ((value-sliderMeta.min)/sliderMeta.step)*sliderMeta.inc)

        // The magic happens when we click on the track.
        track.onmousedown = (e) => {

            // Stop moving the track on mouse up.
            document.onmouseup = (e) => {
                document.onmousemove = null
                document.onmouseup = null
            }

            // Move slider according to the mouse position.
            document.onmousemove = (e) => {

                // Distance from the beginning of the bar in pixels.
                const diff = e.pageX - v.offsetLeft - track.offsetWidth/2
                
                // Don't move the track off the bar.
                if(diff >= 0 && diff <= v.offsetWidth-track.offsetWidth/2){

                    // Convert the difference to a percentage.
                    const perc = (diff/v.offsetWidth)*100
                    // Calculate the percentage of the closest notch.
                    const notch = Number(perc/sliderMeta.inc).toFixed(0)*sliderMeta.inc

                    // If we're close to that notch, stick to it.
                    if(Math.abs(perc-notch) < sliderMeta.inc/2){
                        updateRangedSlider(v, sliderMeta.min+(sliderMeta.step*(notch/sliderMeta.inc)), notch)
                    }
                }
            }
        }
    }) 
}

/**
 * Update a ranged slider's value and position.
 * 
 * @param {Element} element The ranged slider to update.
 * @param {string | number} value The new value for the ranged slider.
 * @param {number} notch The notch that the slider should now be at.
 */
function updateRangedSlider(element, value, notch){
    const oldVal = element.getAttribute('value')
    const bar = element.getElementsByClassName('rangeSliderBar')[0]
    const track = element.getElementsByClassName('rangeSliderTrack')[0]
    
    element.setAttribute('value', value)

    if(notch < 0){
        notch = 0
    } else if(notch > 100) {
        notch = 100
    }

    const event = new MouseEvent('change', {
        target: element,
        type: 'change',
        bubbles: false,
        cancelable: true
    })

    let cancelled = !element.dispatchEvent(event)

    if(!cancelled){
        track.style.left = notch + '%'
        bar.style.width = notch + '%'
    } else {
        element.setAttribute('value', oldVal)
    }
}

/**
 * Display the total and available RAM.
 */
function populateMemoryStatus(){
    settingsMemoryTotal.innerHTML = Number((os.totalmem()-1000000000)/1000000000).toFixed(1) + 'G'
    settingsMemoryAvail.innerHTML = Number(os.freemem()/1000000000).toFixed(1) + 'G'
}

/**
 * Validate the provided executable path and display the data on
 * the UI.
 * 
 * @param {string} execPath The executable path to populate against.
 */
function populateJavaExecDetails(execPath){
    try{
    const jg = new JavaGuard(DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer()).minecraftVersion.number)
    jg._validateJavaBinary(execPath).then(v => {
        if(v.valid){
            if(v.version.major < 9) {
                settingsJavaExecDetails.innerHTML = `Selected: Java ${v.version.major} Update ${v.version.update} (x${v.arch})`
            } else {
                settingsJavaExecDetails.innerHTML = `Selected: Java ${v.version.major}.${v.version.minor}.${v.version.revision} (x${v.arch})`
            }
        } else {
            settingsJavaExecDetails.innerHTML = 'Invalid Selection'
        }
    })}catch{}
}

/**
 * Prepare the Java tab for display.
 */
function prepareJavaTab(){
    bindRangeSlider()
    populateMemoryStatus()
}

/**
 * About Tab
 */

const settingsTabAbout             = document.getElementById('settingsTabAbout')
const settingsAboutChangelogTitle  = settingsTabAbout.getElementsByClassName('settingsChangelogTitle')[0]
const settingsAboutChangelogText   = settingsTabAbout.getElementsByClassName('settingsChangelogText')[0]
const settingsAboutChangelogButton = settingsTabAbout.getElementsByClassName('settingsChangelogButton')[0]

// Bind the devtools toggle button.
document.getElementById('settingsAboutDevToolsButton').onclick = (e) => {
    let window = remote.getCurrentWindow()
    window.toggleDevTools()
}

/**
 * Return whether or not the provided version is a prerelease.
 * 
 * @param {string} version The semver version to test.
 * @returns {boolean} True if the version is a prerelease, otherwise false.
 */
function isPrerelease(version){
    const preRelComp = semver.prerelease(version)
    return preRelComp != null && preRelComp.length > 0
}

/**
 * Utility method to display version information on the
 * About and Update settings tabs.
 * 
 * @param {string} version The semver version to display.
 * @param {Element} valueElement The value element.
 * @param {Element} titleElement The title element.
 * @param {Element} checkElement The check mark element.
 */
function populateVersionInformation(version, valueElement, titleElement, checkElement){
    valueElement.innerHTML = version
    if(isPrerelease(version)){
        titleElement.innerHTML = 'Pre-release'
        titleElement.style.color = '#ff886d'
        checkElement.style.background = '#ff886d'
    } else {
        titleElement.innerHTML = 'Stable Release'
        titleElement.style.color = null
        checkElement.style.background = null
    }
}

/**
 * Fetches the GitHub atom release feed and parses it for the release notes
 * of the current version. This value is displayed on the UI.
 */
function populateReleaseNotes(){
    $.ajax({
        url: 'https://github.com/dommilosz/Mlauncher-node/releases.atom',
        success: (data) => {
            const version = 'v' + remote.app.getVersion()
            const entries = $(data).find('entry')
            
            for(let i=0; i<entries.length; i++){
                const entry = $(entries[i])
                let id = entry.find('id').text()
                id = id.substring(id.lastIndexOf('/')+1)

                if(id === version){
                    settingsAboutChangelogTitle.innerHTML = entry.find('title').text()
                    settingsAboutChangelogText.innerHTML = entry.find('content').text()
                    settingsAboutChangelogButton.href = entry.find('link').attr('href')
                }
            }

        },
        timeout: 2500
    }).catch(err => {
        settingsAboutChangelogText.innerHTML = 'Failed to load release notes.'
    })
}

/**
 * Prepare account tab for display.
 */
function prepareAboutTab(){
    populateReleaseNotes()
}

/**
 * Update Tab
 */

const settingsTabUpdate            = document.getElementById('settingsTabUpdate')
const settingsUpdateTitle          = document.getElementById('settingsUpdateTitle')
const settingsUpdateVersionCheck   = document.getElementById('settingsUpdateVersionCheck')
const settingsUpdateVersionTitle   = document.getElementById('settingsUpdateVersionTitle')
const settingsUpdateVersionValue   = document.getElementById('settingsUpdateVersionValue')
const settingsUpdateChangelogTitle = settingsTabUpdate.getElementsByClassName('settingsChangelogTitle')[0]
const settingsUpdateChangelogText  = settingsTabUpdate.getElementsByClassName('settingsChangelogText')[0]
const settingsUpdateChangelogCont  = settingsTabUpdate.getElementsByClassName('settingsChangelogContainer')[0]
const settingsUpdateActionButton   = document.getElementById('settingsUpdateActionButton')

/**
 * Update the properties of the update action button.
 * 
 * @param {string} text The new button text.
 * @param {boolean} disabled Optional. Disable or enable the button
 * @param {function} handler Optional. New button event handler.
 */
function settingsUpdateButtonStatus(text, disabled = false, handler = null){
    settingsUpdateActionButton.innerHTML = text
    settingsUpdateActionButton.disabled = disabled
    if(handler != null){
        settingsUpdateActionButton.onclick = handler
    }
}

/**
 * Populate the update tab with relevant information.
 * 
 * @param {Object} data The update data.
 */
function populateSettingsUpdateInformation(data){
    if(data != null){
        settingsUpdateTitle.innerHTML = `New ${isPrerelease(data.version) ? 'Pre-release' : 'Release'} Available`
        settingsUpdateChangelogCont.style.display = null
        settingsUpdateChangelogTitle.innerHTML = data.releaseName
        settingsUpdateChangelogText.innerHTML = data.releaseNotes
        populateVersionInformation(data.version, settingsUpdateVersionValue, settingsUpdateVersionTitle, settingsUpdateVersionCheck)
        
        if(process.platform === 'darwin'){
            settingsUpdateButtonStatus('Download from GitHub<span style="font-size: 10px;color: gray;text-shadow: none !important;">Close the launcher and run the dmg to update.</span>', false, () => {
                shell.openExternal(data.darwindownload)
            })
        } else {
            settingsUpdateButtonStatus('Downloading..', true)
        }
    } else {
        settingsUpdateTitle.innerHTML = 'You Are Running the Latest Version'
        settingsUpdateChangelogCont.style.display = 'none'
        populateVersionInformation(remote.app.getVersion(), settingsUpdateVersionValue, settingsUpdateVersionTitle, settingsUpdateVersionCheck)
        settingsUpdateButtonStatus('Check for Updates', false, () => {
            if(!isDev){
                ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
                settingsUpdateButtonStatus('Checking for Updates..', true)
            }
        })
    }
}

/**
 * Prepare update tab for display.
 * 
 * @param {Object} data The update data.
 */
function prepareUpdateTab(data = null){
    populateSettingsUpdateInformation(data)
}

/**
 * Settings preparation functions.
 */

/**
  * Prepare the entire settings UI.
  * 
  * @param {boolean} first Whether or not it is the first load.
  */
function prepareSettings(first = false) {
    if(first){
        setupSettingsTabs()
        initSettingsValidators()
        prepareUpdateTab()
    } else {
        prepareModsTab()
    }
    initSettingsValues()
    prepareAccountsTab()
    prepareJavaTab()
    prepareAboutTab()
}

// Prepare the settings UI on startup.
//prepareSettings(true)