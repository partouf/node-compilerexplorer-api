export interface ICompilerOptions {
    skipAsm: boolean;
    executorRequest: boolean;
}

export interface ICompilerFilters {
    binary?: boolean;
    commentOnly?: boolean;
    demangle?: boolean;
    directives?: boolean;
    execute?: boolean;
    intel?: boolean;
    labels?: boolean;
    libraryCode?: boolean;
    trim?: boolean;
}

export interface IExecuteParameters {
    args: Array<string>;
    stdin: string
}

export interface IResultLineTag {
    line: string;
    text: string;
}

export interface IResultLine {
    text: string;
    tag?: IResultLineTag;
}

export interface IResultAsmSource {
    file: string | null;
    line: number;
}

export interface IResultAsmLine {
    text: string;
    source: IResultAsmSource;
    labels: Array<string>
}

export interface ICompilationBaseResult {
    code: number;
    stdout: Array<IResultLine>;
    stderr: Array<IResultLine>;
    asmsize?: number;
    asm?: Array<IResultAsmLine>;
}

export interface ICompilationResult extends ICompilationBaseResult {
    didExecute?: boolean;
    buildResult?: ICompilationBaseResult;
}

export interface ICompilerDetails {
    id: string;
    compilerType: string;
    group: string;
    semver: string;
    supportsExecute: boolean;
    name: string;
}

export interface ICompileApiPostDataOptions {
    userArguments: string;
    compilerOptions: ICompilerOptions;
    filters: ICompilerFilters;
    executeParameters?: IExecuteParameters;
}

export interface ICompileApiPostData {
    source: string;
    compiler: string;
    options: ICompileApiPostDataOptions;
}

export interface ICompiler {
    id: string;
    type: string;
    name: string;
    version: string;
    supportsExecution(): boolean;
    compile(code: string, compilerArgs?: Array<string>, options?: ICompilerOptions, filters?: ICompilerFilters, execParams?: IExecuteParameters): Promise<ICompilationResult>;
    execute(code: string, compilerArgs?: string[], execParams?: IExecuteParameters): Promise<ICompilationResult>;
}

export interface ICompilers {
    list(): Promise<Array<ICompiler>>;
    find(name: string, version: string): Promise<ICompiler>;
}

export interface IApiOptions {
    url: string;
    defaultLanguage: string;
}

export interface IApi {
    compilers: ICompilers;
}
