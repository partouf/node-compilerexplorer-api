import { Compilers } from "./compilers";
import { IApi, ICompilers, IApiOptions } from "CompilerExplorer";
export * from "CompilerExplorer";

export class Api implements IApi {
    public compilers: ICompilers;

    constructor(public apiOptions: IApiOptions) {
        this.compilers = new Compilers(apiOptions);
    }
}