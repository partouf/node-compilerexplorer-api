import { ICompilers, ICompiler, IApiOptions } from "./interfaces";
import { Compiler } from "./compiler";
import http from "http";
import https from "https";

export class Compilers implements ICompilers {
    private _list: Array<ICompiler> = [];
    private web: typeof https | typeof http;
    private busyLoading = false;

    constructor(public apiOptions: IApiOptions) {
        this.web = this.apiOptions.url.startsWith('https://') ? https : http;
    }

    private async load(): Promise<void> {
        this.busyLoading = true;
        return new Promise<void>((resolve, reject) => {
            this.web.get(`${this.apiOptions.url}/api/compilers/${encodeURIComponent(this.apiOptions.defaultLanguage)}`, {
                headers: {
                    Accept: 'application/json'
                }
            }, (resp) => {
                let data = "";
                resp.on('data', (chunk: string) => data += chunk);
                resp.on('end', () => {
                    const jsdata = JSON.parse(data);
                    for (const details of jsdata) {
                        const compiler = new Compiler(this.apiOptions, details);
                        this._list.push(compiler);
                    }
                    this.busyLoading = false;
                    resolve();
                });
            }).on('error', (err) => {
                console.error(err);
                this.busyLoading = false;
                reject(err);
            });
        });
    }

    public async list(): Promise<Array<ICompiler>> {
        if (!this.busyLoading && (this._list.length === 0)) {
            await this.load();
        }

        return this._list;
    }

    public async find(name: string, version: string): Promise<ICompiler> {
        await this.list();

        for (const compiler of this._list) {
            if ((compiler.type === name) && (compiler.version === version)) {
                return compiler;
            }
        }

        throw "Compiler not found";
    }
}