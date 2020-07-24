
How to use this API
===================

const { Api } = require('node-compilerexplorer-api');

const ce = new Api({
    url: "https://compiler-explorer.com",
    defaultlanguage: "C++"});

async function compileSomething() {
    const gcc101 = await ce.compilers.find("gcc", "10.1");

    const code = "int main () { return 0; }";

    return gcc101.compile(code, ["-O3"], {});
}

compileSomething().then(compileResult => {
    console.log(compileResult);
});
