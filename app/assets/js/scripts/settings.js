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
            acctypesrc=" data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyEAYAAABOr1TyAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAJuAAACbgDA+ct2AAAAB3RJTUUH5AUFBBEY+YOf7AAAEpVJREFUeNrtm2d8VNXWxv/7nKkpkEZLaKbQLgihSCCASrkgoJQrIqiAFOGiIIqIGFAEvJaLjSagFAEVxXIRL6iAgkAINRJaIAkktISQMEAymX72+2Emol7RZEjA15/Pl/kwZ+219nrO3nuttdeBv/CHgrjeATKSY5rEJ5ozgUAK28zEhB1TjwcJwom+gwmJBy1uPSoetDDQUMBQy6d53M12wB8NuvIKZOTHRLfwGAqwIsTt3YbgxIljhBmJC1OnzShIRPj9CCRuOvgc3wGJAlTAK/DnRpkJyUiP+Xt8j1uKsJBD/LMCBTe6+6NRkMigSEAiOH2zJ/T/Hb/7vmbsjwmOj0+4hypEon/rYyQeXLcZAXmzja8USDx4AEkJJYBCMME3Tr1yrT8yTsVUj78z4T4CCEG3bCcS95+aCFBRgL3aZpkGZMuOshfg4gQ5Pl8p1zN82fA/KjKyYxrEx0b3wkEQF+fmoGLA3Sj/Znur0iDQowfWarW1DmDs2ezdxt9DcETf870OArHkkAZ4OM8N8MKPhGRYYmLiI4wFeHBjmJoGCETrlJvtr0pHlmwm24PSKLh50H0QET3JMn4qhO+cuPvR50BfVK9dnX7AF1qs1hm8fqk8c64e6ufQaNAN9CjY75uJ4M+7OXmhIIAlnhVaCpiPtX4o/gKY3mm9LL4tiI6masZkCNrUvWUXM1guvh25ZCkgGUALvCur3DFqGYzKsESfjY8IDMCEk5JHorxEBA692d6qdJSeDQt1y9RRENiga/U7toHobwoyvgpUYwZTILBWV+Ptn4EyPaR71T7ACe+Kqiwo5IqexLSZhoYJpUPPm+2nG4aj0iRrgro59OuQD8BkijfcevZ/HzNciA2P3gaGHvXb120MrNVu0W6vPLN0uAnAdldX9FhRQ/dS3o1KYMAAnJMj5GPAf7RqWhvgAs/zEqBhpQSQOHEBmi+cBA2PbwQBCMyYAeXH3wDMgJFmNAGaCMQloL0YKe4BwsVE8SgA8hoWe6MipzzKMWCVtt9zBbhD+bfyJLBPe06+DeqUiNfCc0A3oHqniDRgxS8GcQSFBfYB/b46g6O6g12mpqRtqUxCjFzB0GEZ3gj8kzJLKgQTBGzVXtAWgTI3YKlZgL5H/a712oB4z3zYlAyitTCJEqC2WCBeB2KFECbATCKJgAcLFuCErCKDgUMyWv4N5AEZIKOAkZ7mnsfBY7y4+1IuuOPyP7uwD+QEm2ZrDvQSu5VPgdZKomgISNy4ARcnyQExVO2jNAZTtzZvx88B58KMjKx08OQXPntxDoj2+mRdJrBQJ3WTAejHup/Mc5ASqwgQ1QKCAhYAL7COGpVJCDjwxOaWWUKgogJbtCnaHNCdrvlVjdsg4tIzVSf0g4CNHYe0d4LYZZxs6ALE8SgjgSDxAg8BkjFiDOBkB5mAxIEDCGGpXAI0lh/wMdCVd1kJ8lOti1YPtO+vfFxUD5z3HludcSsUD/+677fvg7Xe5vCtGeB5paBJ4SpgiHKnUhvYLdfLvaBbWfeO2i2hunxl4fQDUJy7ftRGHRS2fi1kXhh45hQ0vrgcPEcLHIWvgjK6ys/zwIHuEk8CeKILYwu3AqGsE4EA7OXWiidEZKTHxMW3dI5FRUPq5/+uhE3ukntB9FecSiZEhCWtm3gGqu4a9sjgzhVv4DUxzZOr1QT7kLReh7rDJf3S4asWgdWy6d6t74FWyzrW2gCCunfLuXMa1Prb4rQ3zaAtt82314f8RZN107+F4hPrS775CIKP9nm65zMQUm/4rAc7gNImeEzw61CyZOtr2+dC4ddvPrAwCbTkonFFvYBYcUzsqQxCjsfExMfL//hi6z6/K/Gl1lLrA3pP3cfrzIAo7f2ixZNANymqR62XbyAhv4B8yea0vw7Fp9ZbNq4Cy5q32y65BEZ3k2WNCqDGyrfGv9QRuFscFP8FV0LWmpOFkJc57tmnM8ERcyTk2DegRoZfDNsAop5hv2EYeNwX37XsAuly7nG2AG4Xs8RjQIIyULkT0LjMlYokJCMmJj5elv0gn+Y56QkDc6O2Ja0fgUjPstT5/wUxw5xgeu/mEfJLuKafnJSzAFz1T0WdAQIad4pt3xJoK3qLhKvP2T5LqbrnI8i3TGk4YxO4nj3RLnsU0FRUER6gkbCIk2A4H9sw+gho40vG2Mzgzs5NyRsOJCojlXu4WgO74YRMdm/wFELAkQ6OhLpQa96SR+Y8A6KLMdnY62bT8BvQsGHjahT3C9izUu9IGwWWznPnL54Grrycg6cPg3lW+5i2j0FI8PDaD2RASasd0SlWKBj0wsFXj4P8XKuqtQDMop1oc/1m+pNr6lCBIlbLbwEnmSypfH/Kv5dMstUDrXbxJGtLkCM9Xd0vgHAZLIY3QLEEHg+MBNHXZDa++CsDXIOIUphi4rfc+g7UbD/vzL9fAi2k+B/WLFCdEWFhkcAYpUhRIGhA4BuBoXB55/t91qSDc276xszawBAVUetmECJ8eUMBxzkLOLiCtQId39x6sWQF2AbuCUudCCWvb62+vT44Gh/pdcwEni2Fz14MA6l3bXA/BKKtaagxF3SLqveNeA+Ms/52uFEqBGR3iG7XF0xh8eNu7QbieOCAgHfLML0PA2qbp4DqS4OAop/+r75SfWFEOwj4JnFswipwZqbHZrQEIJKyx6oVSEhpwiXJJhuQsujnJpcTJWxnJ9gH72mbOg8suoVPL60CtsUpM/cOB62tdb41CQgVY8RwoIeQ4iQQhI2BQLZcwVxwRh2zZo6GEv22yJRacDli1dE1zcE0sfUXLQZASKuhzwwaAAHGjnHtbgeSdV/pHvPD3mh+YBuYN7Xt3GotXL5t1bCPvwBZ5HrMtQEIFveIu24sIaXVznOc8rm0GICq5Rolkwa0guKz64O+2QwF7WdNfq0A3FvOdcudD7yhLlc/B6J07+m6ApJQ3D8bYZcvje3Ez7cKBQ9oZ22Dbb2gZN6WsTueBPvY/RPS6kHw4P7TegsIPTR68sPVQNe01is1LpTfCYaqcZExG0F1hSWF9gb3D3m7zl8AOl5fMdi/eqVXY7Fvibp8pZBywRa8q/++VChYPDN8dm9w18oT51cBc3UzdT0BiQ07/lScNTQgSqwSi4CXdZ+oVUA7alWsClxesCJidTo4Jh6en/4xVAtOenDiFDAWtVjV7KVyOG5mtScjaoA+v/bkyHXgvit3f14+0PE62AC/7sB8L4A8zWUArDjL4a13rowuGgiWXvOOLN4I7uLcduf3AWPVWeoDPyGioiCx4wAaCbvIA3oqycoasA/Z2yN1OeRlT1w79VOw9d6xY9fscjhhZYAwDwP9lFtG1rsLOCV7yHuv31z/CBEgrZzmHOCmuDwrxDYj+cKud8H2zz2Pp24HktRiZRveoqPt+if0G/CuHD21iQSeVwPVdHBNPXF/9hTIHznVMmsQ2D/bH3dgdBlGixfxog7oh95yrt5eoJ0YJLr+RI+fKD8hwneoXyGLTMDJlTJlqtvky3I5lGjbUneuA/m+/St7JyBcTBBjK9j1ZUFp9fkpNVldDK5Ps0edegoKTr6ovPYDuD8+93xei98fRv9+7d6R00F8oW+vswJOmcEJ/83ye4UAWXjvD8oU9spv7G0dX4NzwglDdhugGv8S07hanb1ZKC1uJqlF6vdgt6WeTTPApU/e7bhiDtDfne6JvLa4bmmNztUOgmhibGhcC1hYKJf6b851nCEU+KIrO64yzPte92V3C5Av2oLti4BQ8QjDKsHB/kJHJDWBBpwVR6AoaO3x9WfA3u9A1KGav+HAdSFPhowGMd0ca34DOCcfYYL/ZvhHiFfqnEwHoIRLZRCao0tS7wTRzjjd6N3y1rC2cnzrJzQk0EppK2LAc6mwm2UKFNX8osb6aOA4kTT8FQemB94XsByUOQFrzdWAcwyRY/w3wv8zxMIuDgEO8rGUQSzK8J3xH6DOrD41IhrIlcPlY74R/0jtpaVbaEflCTEISjZv7bqjEzhWHww8UvArDpxgTjElgvJtwMoAJ3BWPiAf8V+9PyvE261h5wcyAA+FvvD3tzFDra6cBtOQZrlNjMDdSrryNd6wtCLD3IpCbyVN+RJc95y+5+wtkGcbV/fpyXCp0eKQ5UvBM/FCj4I1IEaZk0wXQewI3BYQApxnEtP8V+sfIQqAPMJOAC7JcjSQmQ91CEhoC2r/iLvCPcAu7UttN/BHWykCI0aguviXmAau8FOuMzlQkPLq7Dl6ODd75LOPD4PLnT848clCoIlrh6suEMEUnvBfrf8rpJhD5AAuLvoO9zLB2K/BqrjWELS6+71d9gJbZZKcizchrNw8pLwobZ7wvoD9lPPKbuCMHMQIcExKyzt0GArbvBTyxnZw9Dpa7fgnwHDlfrWV/0r9P9SL2EMq4OICheWQXqtLVEsgJHxEmwdtYFzX2NNgJPCiJ9zTGW/3ienGeLxcKL2AMonmNAXGqFPVe0Hu0/bIkyCfcq/z5AJG0YzG/qu5njzkuDwOwOUynSG/gH5U/by6+yEiMemdpzaDfl+dXlETgWmeE54wwE0e53023oAmZz/gzciNoimNAZNoQTMAPDc2Uy91kJujHAU0LpUl7L0WzJ8m1m47EKoverXZjIfB9F3z7k3vAtZrHbTBwKcaWn3AKTN9GfAflaAKgf9hb4HcSQresLcCusLN7RMGtd4CNV9ckDm7P4Q98+jXI22gb1pvRZ2VQF3xXz4Cxrmfc28A1mlNtZ7ARfmmfJurRcTKg3dFuDlHLmCR3ow8XQbKSMAiF8nleBsH9X5qEFzw74JKABp7yQCkLMBYcbPWDY9Mq1ULwh6YeOCxsVClwX2j+zWCkj7bN6fMhBLTtoTkDHAUHxlxrD+44/O7FewG+ZH9M/s2YKW2X7sM2NnLD0Aw/bkbqCL6id6AkdKtxds56SCNI0Cx3Mh3gJVvfFfT3ppUVYYyCGin3K90BpJUu3oQxCWDMLwByuvmOFM90GbbNtrvBnnesdKxFagiBor+5Zi4BBRrePkJkb6M1kgAbsAk4qgDQFbF0QIYaU4T0OXUSYnKgSoM4h9AlYQB5j4zwW063+KCHVzVTt6Zswycg7OeP9kcXANPZ52dD57J+TMKjoDnvSszrlwE+Y7tpP0hkMM8nT0vA4FeYsRs9QP1PhCxxjPGA6B8F3jM3A6UzlWOBTcD9URoROgEUKtGvBW2GdTMiKDwg6AbWG1YeB1QnqvatOptUNjl5afevB1KWu9omPIUMF0NVcs3YwX3yRPlJ6SmeIMXQWtqTSwZDPKiM9p1AAQmTH0rlJJfR4put24a6IiiFqCbFJVc60Uw0wFfd0932gEB2nkZCLKbe7j7LWCtZ4R7A/CAVkM+CBgQFAB3K+PEbOAp1aPWAOFSW6lfAjPUMWpVIJDbmAfAbT/a0BLYxwAAraC4t9UOWhVrI+s5IJR/8iQAq5la5lkVAQ4MyQXlJ6SfckHZB64PswfnjAf78r1PpHaAgH92ptMN4KPMuF+pIawgMNTQAyxig+/32reQkcDcMo7vII3DUPzQF6s2zAPHjPTxGWOBMCVRqQ7A6jLbKor3oEeH6Utb+QmpKzaINaCFFTezdoJC++zlc81Agf6ovh+YMluENgPEh7osdRlQJFfzGVd7gn/FHATgJI884BRPMBVwkeurACgVksGX6neQygGgUI7jGX7/Yuyq3HEywLP/yoKi8VBc86s7Nh0ES9KCTUseBXnSMdZxBIhThiveK+iyQUNBt6cvHgQ1tw3y5wxx4QL6KDnK9+DQpydmREJeyPhNk4PA8Fz9h+r2BGEzZOtDgHy5iFR+K/rwRm020jkOcr9sKR8H7KTzMFD6Meb1E6JDB1g5zJdAtvxI3gJoWHx5lLiGnPcbxBK5VR4CLeHyvVfuB1fDU4vO9Ac51G1yJwKJygilG6D5Lr7KQoV0JOHCifLOXXENs06nfnxpcfk7F69l8HEZJRsD/9Gqa7cBV/icdYCC8cfM+7e1eIlRfZ85VFa+UUqM8OkRP6mh/Zp98kc570ppIPJFJtBTbBGrgCDRQ3TBn4s2B3LNe4TKE+Q+rMRFnDCknrcOuX5C/kL5oRwegY7LhNxnibslqyB185HPS/+qhM8W/8KvQiBxn1yAAR228ZlxdbMKUvcd+f6Xj/2JixA3GaXboIJESfsIAyrmEe/E1c06npr57ffXEvuLkIqGQCBsnQCJ5/2dhONEG/h2XN2sjNTd3/3we+J/EeIvrp66Amn5BBU3Yn0CwWgEPziWIqLRjVoQF5J1JjU1fWtZh/3rDLkWvA7fjQAU11I0QFpS0eHCmbmdYgwYk4ciCEF+VZ8a/IB9V1RcjSx36v7iQeBfd9b/AelhNGtMjo9/AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIwLTA1LTA1VDA0OjE3OjI0LTA0OjAwRPXPVQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMC0wNS0wNVQwNDoxNzoyNC0wNDowMDWod+kAAAAASUVORK5CYII="
        }else if(acc.type=="cracked"){
            acctypesrc=" data:image/png;base64,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";
        }else if(acc.type=="mcleaks"){
            acctypesrc=" data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADsklEQVRoge2ab2+bVhTGkSpNSyPN/ec4TiMbsLFN1ambHU2tumqfci+qpUkMGLgXN+n6ISZVezEpnZbawCH5JM9e4GDckfjaOKlX8UjnBfLl3PO755574WJJKlRofdQbnqN7fAGdR3j17gJ5/Wk24QmP0B2eo75/mtvfXKkO4V7fR90J0WSEFiM0GKHmhNg4HC8cwMbhGDU7RIMRNEZoMkLdCXHf8KFYi/sT0q4dQnZC6F4E3YvQ8Qi6R+hMrnUvQtUKhDuvmEFyX5bJTohtK1wtjPz6T9RTEBojbFsBHhgBdgYB2pyS3x6a82HuG37Svs0JO4MADwwfFStAk9EMjDwQH5y5+q7vQ/fiDmQ3xPc8mnFeMQO0EhjCxsHV0+Lu4RidSds2J5QNf6atYoxQSw3avb6/OpDLbGiM8GwYZTrePJgNsJQRwJYxBe5wwrdXAKuDuG4us7ISCNWmxOn2nBooHfmT2omguoQfhudJe8UaQXHDJGtZoGlVrCAZvLSfpSW/+QhtAvJIYP5XrSBZAKqp+V21psX92J7vp2zEflqcoNmUH6T++gMabgyyI1h405GPUHdC1OzpdYOJBXUJ3mSE3tsVZESS4qVXn4zOruCSmNRCakltczGIXSdMaqm2qhqRJEm6ezCd+xonlI35mUln5dJUd35Q21aQTOWOR9hcYqO9VpXUHG/zeDd/PAgyLQsiDbNzxX01O5zZk6qr3EPSemQG6HBKsnNT1uGEygJPCUtpy/KhOIQWJ3T4bAAtTpAdMWtx+iz4+H7FDVESmLor08v3F2inYFqc0DuO0D0+w9Ph9bZ38gnK0Wlqc4yn68/vczxJywcf8dDwsWUGQlad1MDnGVFdwvMT8UB++f0CqkuZGakOxGLZMgOUDR+1X/+ApNj+TIEta6pL6L4VB3lxMguSp57k/b8gqXawMpDeFwKpvzktQAqQAqQAKUC+FIj16X8PIv822RA3j8Yo9X2U+n7yfr7OIE1GSbybR2PIh3//t98ui5aCuS0QjREUJnBEtMeipTq4LZCmS1A8AZAfWQR1jTPSdAkKFwDpfS0g3a8FZK8AKUAKkBsDuY13dmGQPPvIT8fiIK/erWlGNEZ4yrM/AmVJNs+SM961yojuxSfnLwSy0rIJu/b1H0Pzg7jLg+heBMUNUbEClM1sq1jXH3ILgbj/zAd54sYfZ276oDrPQD0fCtbiN/sjyJM/BTTWyGQ3xJ390WLnw6oZommdoc1Ga2GaPYJiLAhRqFB+/Qs4gSWlaFW65wAAAABJRU5ErkJggg=="
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