const fs = require('fs')
const path = require('path')
const request = require('request')

const ConfigManager = require('./configmanager')
const logger        = require('./loggerutil')('%c[DistroManager]', 'color: #a02d2a; font-weight: bold')

/**
 * Represents the download information
 * for a specific module.
 */
class Artifact {
    
    /**
     * Parse a JSON object into an Artifact.
     * 
     * @param {Object} json A JSON object representing an Artifact.
     * 
     * @returns {Artifact} The parsed Artifact.
     */
    static fromJSON(json){
        return Object.assign(new Artifact(), json)
    }

    /**
     * Get the MD5 hash of the artifact. This value may
     * be undefined for artifacts which are not to be
     * validated and updated.
     * 
     * @returns {string} The MD5 hash of the Artifact or undefined.
     */
    getHash(){
        return this.MD5
    }

    /**
     * @returns {number} The download size of the artifact.
     */
    getSize(){
        return this.size
    }

    /**
     * @returns {string} The download url of the artifact.
     */
    getURL(){
        return this.url
    }

    /**
     * @returns {string} The artifact's destination path.
     */
    getPath(){
        return this.path
    }

}
exports.Artifact

/**
 * Represents a the requirement status
 * of a module.
 */
class Required {
    
    /**
     * Parse a JSON object into a Required object.
     * 
     * @param {Object} json A JSON object representing a Required object.
     * 
     * @returns {Required} The parsed Required object.
     */
    static fromJSON(json){
        if(json == null){
            return new Required(true, true)
        } else {
            return new Required(json.value == null ? true : json.value, json.def == null ? true : json.def)
        }
    }

    constructor(value, def){
        this.value = value
        this.default = def
    }

    /**
     * Get the default value for a required object. If a module
     * is not required, this value determines whether or not
     * it is enabled by default.
     * 
     * @returns {boolean} The default enabled value.
     */
    isDefault(){
        return this.default
    }

    /**
     * @returns {boolean} Whether or not the module is required.
     */
    isRequired(){
        return this.value
    }

}
exports.Required
/**
 * Represents a server configuration.
 */
class Server {

    /**
     * Parse a JSON object into a Server.
     * 
     * @param {Object} json A JSON object representing a Server.
     * 
     * @returns {Server} The parsed Server object.
     */
    static fromJSON(json){
        const serv = Object.assign(new Server(), json)

        return serv
    }

    /**
     * @returns {string} The ID of the server.
     */
    getID(){
        return this.id
    }

    /**
     * @returns {string} The name of the server.
     */
    getName(){
        return this.name
    }

    /**
     * @returns {string} The description of the server.
     */
    getDescription(){
        return this.description
    }

    /**
     * @returns {string} The URL of the server's icon.
     */
    getIcon(){
        return this.icon
    }

    /**
     * @returns {string} The minecraft version of the server.
     */
    getMinecraftVersion(){
        return this.minecraftVersion
    }

    /**
     * @returns {boolean} Whether or not this server is the main
     * server. The main server is selected by the launcher when
     * no valid server is selected.
     */
    isMainServer(){
        return this.selected
    }

}
exports.Server

/**
 * Represents the Distribution Index.
 */
class DistroIndex {

    /**
     * Parse a JSON object into a DistroIndex.
     * 
     * @param {Object} json A JSON object representing a DistroIndex.
     * 
     * @returns {DistroIndex} The parsed Server object.
     */
    static fromJSON(json){

        const instances = json.instances

        const distro = Object.assign(new DistroIndex(), json)
        distro._resolveServers(instances)
        distro._resolveMainServer()

        return distro
    }

    _resolveServers(json){
        const arr = json.instances;
    }

    _resolveMainServer(){

        for(let serv of this.instances){
            if(serv.selected){
                this.mainServer = serv.id
                return
            }
        }

        // If no server declares default_selected, default to the first one declared.
        this.mainServer = (this.instances.length > 0) ? this.instances[0].id : null
    }

    /**
     * @returns {string} The version of the distribution index.
     */
    getVersion(){
        return this.version
    }

    /**
     * @returns {string} The URL to the news RSS feed.
     */
    getRSS(){
        return this.rss
    }

    /**
     * @returns {Array.<Server>} An array of declared server configurations.
     */
    getServers(){
        return this.instances
    }

    /**
     * Get a server configuration by its ID. If it does not
     * exist, null will be returned.
     * 
     * @param {string} id The ID of the server.
     * 
     * @returns {Server} The server configuration with the given ID or null.
     */
    getServer(id){
        for(let serv of this.instances){
            if(serv.id === id){
                return serv
            }
        }
        return null
    }

    /**
     * Get the main server.
     * 
     * @returns {Server} The main server.
     */
    getMainServer(){
        return this.mainServer != null ? this.getServer(this.mainServer) : null
    }

}
exports.DistroIndex

exports.Types = {
    Library: 'Library',
    ForgeHosted: 'ForgeHosted',
    Forge: 'Forge', // Unimplemented
    LiteLoader: 'LiteLoader',
    ForgeMod: 'ForgeMod',
    LiteMod: 'LiteMod',
    File: 'File',
    VersionManifest: 'VersionManifest'
}

let DEV_MODE = false

const DISTRO_PATH = path.join(ConfigManager.getLauncherDirectory(), 'distribution.json')
const DEV_PATH = path.join(ConfigManager.getLauncherDirectory(), 'dev_distribution.json')

let data = null

/**
 * @returns {Promise.<DistroIndex>}
 */
exports.pullRemote = function(){
    return exports.pullLocal()

    return new Promise((resolve, reject) => {
        const distroURL = 'http://mc.westeroscraft.com/WesterosCraftLauncher/distribution.json'
        //const distroURL = 'https://gist.githubusercontent.com/dscalzi/53b1ba7a11d26a5c353f9d5ae484b71b/raw/'
        const opts = {
            url: distroURL,
            timeout: 2500
        }
        const distroDest = path.join(ConfigManager.getLauncherDirectory(), 'distribution.json')
        request(opts, (error, resp, body) => {
            if(!error){
                
                try {
                    data = DistroIndex.fromJSON(JSON.parse(body))
                } catch (e) {
                    reject(e)
                }

                fs.writeFile(distroDest, body, 'utf-8', (err) => {
                    if(!err){
                        resolve(data)
                    } else {
                        reject(err)
                    }
                })
            } else {
                reject(error)
            }
        })
    })
}

/**
 * @returns {Promise.<DistroIndex>}
 */
exports.pullLocal = function(){
    return new Promise((resolve, reject) => {
        
        dir= ConfigManager.getLauncherDirectory()+"/instances.json";
        fs.readFile(dir, 'utf-8', (err, d) => {
            if(!err){
                data = DistroIndex.fromJSON(JSON.parse(d))
                resolve(data)
            } else {
                reject(err)
            }
        })
    })
}

exports.setDevMode = function(value){
    if(value){
        logger.log('Developer mode enabled.')
        logger.log('If you don\'t know what that means, revert immediately.')
    } else {
        logger.log('Developer mode disabled.')
    }
    DEV_MODE = value
}

exports.isDevMode = function(){
    return DEV_MODE
}

/**
 * @returns {DistroIndex}
 */
exports.getDistribution = function(){
    return data
}

exports.addInstance = function(inst){
    dir= ConfigManager.getLauncherDirectory()+"/instances.json";
    data.instances.push(inst);
    fs.writeFile(dir,JSON.stringify(data),function(){
        logger.log("Succesfully added new instance")
    });
}