import { Compilers } from "./compilers";
import { IApi, IApiOptions, ICompilers } from "CompilerExplorer";

export class Api implements IApi {
    public compilers: ICompilers;

    constructor(public apiOptions: IApiOptions) {
        this.compilers = new Compilers(apiOptions);
    }
}