import { ICompiler, ICompilerOptions, ICompilerFilters, ICompilationResult, IApiOptions, ICompilerDetails,
    ICompileApiPostData, ICompileApiPostDataOptions } from "./interfaces";
import http from "http";
import https from "https";

export class Compiler implements ICompiler {
    public version: string;
    public type: string;
    private id: string;
    private web: typeof https | typeof http;

    public constructor(public apiOptions: IApiOptions, public details: ICompilerDetails) {
        this.id = details.id;
        this.web = this.apiOptions.url.startsWith('https://') ? https : http;

        if (details.compilerType) {
            this.type = details.compilerType;
        } else {
            this.type = "gcc";
        }

        if (details.semver) {
            this.version = details.semver;
        } else {
            this.version = this.id;
        }
    }

    public async compile(code: string, compilerArgs?: string[], options?: ICompilerOptions, filters?: ICompilerFilters): Promise<ICompilationResult> {
        return new Promise((resolve, reject) => {
            const postdata: ICompileApiPostData = {
                source: code,
                compiler: this.id,
                options: {
                    userArguments: "",
                    compilerOptions: {} as ICompilerOptions,
                    filters: {} as ICompilerFilters
                } as ICompileApiPostDataOptions
            };

            if (compilerArgs) postdata.options.userArguments = compilerArgs?.map((arg) => '"' + arg + '"').join(' ');
            if (options) postdata.options.compilerOptions = options;
            if (filters) postdata.options.filters = filters;

            const postdatastr = JSON.stringify(postdata);

            const req = this.web.request(`${this.apiOptions.url}/api/compiler/${this.id}/compile`, {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': postdatastr.length
                }
            }, (resp) => {
                let data = "";
                resp.on('data', (chunk: string) => data += chunk);
                resp.on('end', () => {
                    const jsdata = JSON.parse(data);

                    resolve(jsdata as ICompilationResult);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });

            req.write(postdatastr);
            req.end();
        });
    }
}