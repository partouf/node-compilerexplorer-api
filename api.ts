import { Compilers } from "./compilers";
import { IApi, ICompilers, IApiOptions } from "./interfaces";

export class Api implements IApi {
    public compilers: ICompilers;

    constructor(public apiOptions: IApiOptions) {
        this.compilers = new Compilers(apiOptions);
    }
}