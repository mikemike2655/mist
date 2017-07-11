const EventEmitter = require('events').EventEmitter;
const Q = require('bluebird');
const Settings = require('./settings.js');
const Swarm = require('swarm-js');
const path = require('path');
const fs = require('fs');
const os = require('os');

class SwarmNode extends EventEmitter {
    constructor() {
        super();

        this._swarm = null;
        this._stop = null;
        this._accountPassword = 'SAP';
    }

    getKeyPath() {
        // TODO: replace by web3.utils.randomHex when we use it
        function randomHex(bytes) {
            let hex = '';
            for (let i = 0; i < bytes * 2; i = i + 1) {
                hex += (Math.random() * 16 | 0).toString(16);
            }
            return hex;
        }

        // Gets Swarm Key path
        const swarmKeyDir = path.join(Settings.userDataPath, 'swarmjs');
        const swarmKeyPath = path.join(swarmKeyDir, 'swarmKey');

        // Generates the key if not there
        if (!fs.existsSync(swarmKeyDir)) {
            fs.mkdirSync(swarmKeyDir);
        }
        if (!fs.existsSync(swarmKeyPath)) {
            fs.writeFileSync(swarmKeyPath, randomHex(32));
        }

        return swarmKeyPath;
    }

    startUsingLocalNode() {
        const totalSize = 7406937; // TODO: hardcoded & innacurate, use archives.json instead
        let totalDownloaded = 0;

        const swarmBinDir = path.join(Settings.userDataPath, 'swarmjs', 'bin');
        const swarmBinExt = os.platform() === 'win32' ? '.exe' : '';
        const swarmBinPath = path.join(swarmBinDir, `swarm${swarmBinExt}`);

        const config = {
            privateKey: this.getKeyPath(),
            dataDir: path.join(Settings.userDataPath, 'swarmjs'),
            ethApi: Settings.rpcIpcPath,
            binPath: swarmBinPath,
            onProgress: size => this.emit('downloadProgress', (totalDownloaded += size) / totalSize)
        };

        return new Q((resolve, reject) => {
            Swarm.local(config)(swarm => new Q((stop) => {
                this.emit('started', true);
                this._stop = stop;
                this._swarm = swarm;
                resolve(this);
            }));
        });
    }

    startUsingGateway() {
        return new Q((resolve, reject) => {
            this.emit('started', false);
            this._swarm = Swarm.at(Settings.swarmURL);
            this._stop = () => {};
            resolve(this);
        });
    }

    init() {
        this.emit('starting');

        if (Settings.swarmURL === 'http://localhost:8500') {
            return this.startUsingLocalNode();
        }
        return this.startUsingGateway();
    }

    upload(arg) {
        console.log("swarmNode.js a");
        if (!this._swarm) {
            console.log("swarmNode.js b");
            return Q.reject(new Error('Swarm not initialized. Have you called swarmNode.init()?'));
        }
        console.log("swarmNode.js c");

        return this._swarm.upload(arg);
    }

}

module.exports = new SwarmNode();
