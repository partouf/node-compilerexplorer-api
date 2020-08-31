import { ICompilers, ICompiler, IApiOptions } from "./interfaces";
import { Compiler } from "./compiler";
import http from "http";
import https from "https";
import parseJson from "parse-json";

export class Compilers implements ICompilers {
    private _list: Promise<Array<ICompiler>>;
    private web: typeof https | typeof http;

    constructor(public apiOptions: IApiOptions) {
        this.web = this.apiOptions.url.startsWith('https://') ? https : http;
        this._list = this.load();
    }

    private load(): Promise<Array<ICompiler>> {
        return new Promise((resolve, reject) => {
            this.web.get(`${this.apiOptions.url}/api/compilers/${encodeURIComponent(this.apiOptions.defaultLanguage)}`, {
                headers: {
                    Accept: 'application/json'
                }
            }, (resp) => {
                let data = "";
                resp.on('data', (chunk: string) => data += chunk);
                resp.on('end', () => {
                    const jsdata = parseJson(data);
                    const list = [];
                    for (const details of jsdata) {
                        const compiler = new Compiler(this.apiOptions, details);
                        list.push(compiler);
                    }
                    data = "";
                    resolve(list);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    public async list(): Promise<Array<ICompiler>> {
        const list = await this._list;

        return list;
    }

    public async find(name: string, version: string): Promise<ICompiler> {
        const list = await this.list();

        for (const compiler of list) {
            if ((compiler.type === name) && (compiler.version === version)) {
                return compiler;
            }
        }

        throw "Compiler not found";
    }

    public async findById(id: string): Promise<ICompiler> {
        const list = await this.list();

        for (const compiler of list) {
            if (compiler.id === id) {
                return compiler;
            }
        }

        throw "Compiler not found";
    }
}