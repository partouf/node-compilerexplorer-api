import { ICompiler, ICompilerOptions, ICompilerFilters, ICompilationResult, IApiOptions, ICompilerDetails,
    ICompileApiPostData, ICompileApiPostDataOptions, IExecuteParameters, IResultLine, APIType, IResultAsmLine,
    ICompilationBaseResult, ILibrary } from "./interfaces";
import http from "http";
import https from "https";

export class Compiler implements ICompiler {
    public version: string;
    public lang: string;
    public type: string;
    public id: string;
    public name: string;
    private web: typeof https | typeof http;
    private regexTextExecuteExitCode: RegExp;
    private regexTextStdOut: RegExp;
    private regexTextStdErr: RegExp;
    private regexTextCompilerExitCode: RegExp;

    public constructor(public apiOptions: IApiOptions, public details: ICompilerDetails) {
        this.web = this.apiOptions.url.startsWith('https://') ? https : http;

        this.id = details.id;
        this.name = details.name;
        this.lang = details.lang;

        this.regexTextExecuteExitCode = /^# Execution result with exit code (-?\d*)/;
        this.regexTextCompilerExitCode = /^# Compiler exited with result code (-?\d*)/;
        this.regexTextStdOut = /^#?\s?Standard out:/;
        this.regexTextStdErr = /^#?\s?Standard error:/;

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

    public supportsExecution(): boolean {
        return this.details.supportsExecute;
    }

    private async jsonCompile(postdata: ICompileApiPostData): Promise<ICompilationResult> {
        return new Promise((resolve, reject) => {
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

    private getCompilationResultFromText(data: string, postdata: ICompileApiPostData): ICompilationResult {
        const result = {
            code: 0,
            stdout: [],
            stderr: [],
            asm: [],
        } as ICompilationResult;

        let inStdOut = false;
        let inStdErr = false;
        let executionExitCodeSeen = false;
        let compilerExitCodeSeen = false;

        if (postdata.options.compilerOptions.executorRequest || postdata.options.filters.execute) {
            result.buildResult = {
                code: 0,
                stdout: [],
                stderr: [],
                asm: []
            } as ICompilationBaseResult;
        }

        for (let line of data.split('\n')) {
            if (!executionExitCodeSeen) {
                const exitCodeMatches = this.regexTextExecuteExitCode.exec(line);
                if (exitCodeMatches && exitCodeMatches[1]) {
                    result.code = parseInt(exitCodeMatches[1]);
                    executionExitCodeSeen = true;
                    continue;
                }
            }

            if (!compilerExitCodeSeen) {
                const exitCodeMatches = this.regexTextCompilerExitCode.exec(line);
                if (exitCodeMatches && exitCodeMatches[1]) {
                    if (result.buildResult) {
                        result.buildResult.code = parseInt(exitCodeMatches[1]);
                    } else {
                        result.code = parseInt(exitCodeMatches[1]);
                    }
                    compilerExitCodeSeen = true;
                    continue;
                }
            }

            if (!inStdOut && this.regexTextStdOut.test(line)) {
                inStdOut = true;
                inStdErr = false;
                continue;
            } else if (!inStdErr && this.regexTextStdErr.test(line)) {
                inStdOut = false;
                inStdErr = true;
                continue;
            }

            if (inStdOut) {
                if (!executionExitCodeSeen && result.buildResult) {
                    result.buildResult.stdout.push({text: line} as IResultLine);
                } else {
                    result.stdout.push({text: line} as IResultLine);
                }
            } else if (inStdErr) {
                if (!executionExitCodeSeen && result.buildResult) {
                    result.buildResult.stderr.push({text: line} as IResultLine);
                } else {
                    result.stderr.push({text: line} as IResultLine);
                }
            } else {
                if (result.buildResult) {
                    result.buildResult.asm?.push({text: line} as IResultAsmLine);
                } else {
                    result.asm?.push({text: line} as IResultAsmLine);
                }
            }
        }

        result.didExecute = (executionExitCodeSeen && result.buildResult?.code === 0);

        return result;
    }

    private async textCompile(postdata: ICompileApiPostData): Promise<ICompilationResult> {
        return new Promise((resolve, reject) => {
            let filtersstr = "";
            if (postdata.options.filters.binary) filtersstr += ",binary";
            if (postdata.options.filters.commentOnly) filtersstr += ",commentOnly";
            if (postdata.options.filters.demangle) filtersstr += ",demangle";
            if (postdata.options.filters.directives) filtersstr += ",directives";
            if (postdata.options.filters.execute) filtersstr += ",execute";
            if (postdata.options.filters.intel) filtersstr += ",intel";
            if (postdata.options.filters.labels) filtersstr += ",labels";
            if (postdata.options.filters.libraryCode) filtersstr += ",libraryCode";
            if (postdata.options.filters.trim) filtersstr += ",trim";

            filtersstr = filtersstr.substr(1);

            if (postdata.options.compilerOptions.skipAsm) filtersstr += "&skipAsm=true";
            if (postdata.options.compilerOptions.executorRequest) filtersstr += "&executorRequest=true";

            const postdatastr = postdata.source;
            const req = this.web.request(`${this.apiOptions.url}/api/compiler/${this.id}/compile?filters=${filtersstr}`, {
                method: "POST",
                headers: {
                    'Content-Length': postdatastr.length,
                }
            }, (resp) => {
                let data = "";
                resp.on('data', (chunk: string) => data += chunk);
                resp.on('end', () => {
                    const result = this.getCompilationResultFromText(data, postdata);
                    resolve(result);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });

            req.write(postdatastr);
            req.end();
        });
    }

    private async formCompile(postdata: ICompileApiPostData): Promise<ICompilationResult> {
        return new Promise((resolve, reject) => {
            let postdatastr = "compiler=" + encodeURIComponent(this.id);
            postdatastr += "&lang=" + encodeURIComponent(this.lang);
            postdatastr += "&source=" + encodeURIComponent(postdata.source);

            if (postdata.options.filters.binary) postdatastr += "&binary=true";
            if (postdata.options.filters.commentOnly) postdatastr += "&commentOnly=true";
            if (postdata.options.filters.demangle) postdatastr += "&demangle=true";
            if (postdata.options.filters.directives) postdatastr += "&directives=true";
            if (postdata.options.filters.execute) postdatastr += "&execute=true";
            if (postdata.options.filters.intel) postdatastr += "&intel=true";
            if (postdata.options.filters.labels) postdatastr += "&labels=true";
            if (postdata.options.filters.libraryCode) postdatastr += "&libraryCode=true";
            if (postdata.options.filters.trim) postdatastr += "&trim=true";

            if (postdata.options.compilerOptions.skipAsm) postdatastr += "&skipAsm=true";
            if (postdata.options.compilerOptions.executorRequest) postdatastr += "&executorRequest=true";

            const req = this.web.request(`${this.apiOptions.url}/api/noscript/compile`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postdatastr.length,
                }
            }, (resp) => {
                let data = "";
                resp.on('data', (chunk: string) => data += chunk);
                resp.on('end', () => {
                    const result = this.getCompilationResultFromText(data, postdata);
                    resolve(result);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });

            req.write(postdatastr);
            req.end();
        });
    }

    public async compile(code: string, compilerArgs?: string[], options?: ICompilerOptions, filters?: ICompilerFilters, libraries?: ILibrary[], execParams?: IExecuteParameters): Promise<ICompilationResult> {
        const postdata: ICompileApiPostData = {
            source: code,
            compiler: this.id,
            options: {
                userArguments: "",
                compilerOptions: {} as ICompilerOptions,
                filters: {} as ICompilerFilters,
                libraries: [] as ILibrary[],
            } as ICompileApiPostDataOptions
        };

        if (compilerArgs) postdata.options.userArguments = compilerArgs?.map((arg) => '"' + arg + '"').join(' ');
        if (options) postdata.options.compilerOptions = options;
        if (filters) postdata.options.filters = filters;
        if (execParams) postdata.options.executeParameters = execParams;
        if (libraries) postdata.options.libraries = libraries;

        switch (this.apiOptions.apiType) {
            case APIType.JSON:
                return this.jsonCompile(postdata);
                break;
            case APIType.Text:
                return this.textCompile(postdata);
                break;
            case APIType.Form:
                return this.formCompile(postdata);
                break;
            default:
                return this.jsonCompile(postdata);
                break;
        }
    }

    public async execute(code: string, compilerArgs?: string[], libraries?: ILibrary[], execParams?: IExecuteParameters): Promise<ICompilationResult> {
        return this.compile(code, compilerArgs, {
            skipAsm: true,
            executorRequest: true
        }, {
            execute: true
        },
        libraries,
        execParams);
    }
}