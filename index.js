const {
    Extension,
    INPUT_METHOD,
    log,
    PLATFORMS
} = require("deckboard-kit");
const os = require('os');
const path = require('path');
const Shell = require('node-powershell');

const CmdLetPath = path.join(os.homedir(), 'deckboard', 'audio-device-select', 'AudioDeviceCmdlets.dll');

class AudioDeviceSelect extends Extension {
    constructor() {
        super();
        this.name = "Audio Device Select";
        this.platforms = [PLATFORMS.WINDOWS];
        this.ps = new Shell();
    }

    async initExtension() {
        try {
            await this.importCmdLet();
        } catch (err) {
            console.log('importCmdLet')
        }
        try {
            // this.ps = new Shell();
            this.ps.addCommand('Get-AudioDevice -List');
            const res = await this.ps.invoke();
            const audioData = JSON.parse(
                "[" +
                res
                    .toString()
                    .split(/\r\n\r\n/g)
                    .filter(x => !!x)
                    .map(x => '{"' + x
                        .replace(/\r\n/g, '", "')
                        .replace(/  +/g, '')
                        .replace(/: /g, '": "')
                        + '"}'
                    ).join(', ')
                + "]"
            )
                .map(item => ({
                    label: item.Name,
                    value: item.ID
                }));


            await this.ps.dispose();
            this.inputs = [
                {
                    label: 'Audio Device',
                    value: 'audio-device-toggle',
                    icon: 'headphones',
                    color: '#8E44AD',
                    input: [
                        {
                            label: 'Toggle Audio Device',
                            ref: 'deviceId',
                            type: INPUT_METHOD.INPUT_SELECT,
                            items: audioData
                        }
                    ]
                }
            ];
        } catch (err) {
            log.error(`deckboard-power-control ${err}`)
            this.inputs = [
                {
                    label: 'Toggle Audio Device',
                    value: 'audio-device-toggle',
                    icon: 'headphones',
                    color: '#8E44AD',
                    input: [
                        {
                            label: 'Toggle Audio Device',
                            ref: 'deviceId',
                            type: INPUT_METHOD.INPUT_SELECT,
                            items: []
                        }
                    ]
                }
            ]
        }
    }

    async importCmdLet() {
        this.ps.addCommand('New-Item "$($profile | split-path)\\Modules\\AudioDeviceCmdlets" -Type directory -Force');
        this.ps.addCommand(`Copy-Item "${CmdLetPath}" "$($profile | split-path)\\Modules\\AudioDeviceCmdlets\\AudioDeviceCmdlets.dll"`)
        this.ps.addCommand('Set-Location "$($profile | Split-Path)\\Modules\\AudioDeviceCmdlets"')
        this.ps.addCommand('Get-ChildItem | Unblock-File')
        this.ps.addCommand('Import-Module AudioDeviceCmdlets')
        await this.ps.invoke();
        await this.ps.dispose();
    }

    async execute(action, { deviceId }) {
        switch (action) {
            case "audio-device-toggle":
                this.ps = new Shell();
                this.ps.addCommand(`Set-AudioDevice "${deviceId}"`);
                await this.ps.invoke();
                await this.ps.dispose();
                break;
            default:
                break;
        }
    };
}

module.exports = new AudioDeviceSelect();