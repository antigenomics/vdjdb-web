// Default configuration for UglifyJS plugin

module.exports = {
    parallel: true,
    uglifyOptions: {
        ie8: false,
        warnings: true,
        ecma: 5,
        compress: {
            sequences: true,  // join consecutive statemets with the “comma operator”
            properties: true,  // optimize property access: a["foo"] → a.foo
            dead_code: true,  // discard unreachable code
            drop_debugger: true,  // discard “debugger” statements
            unsafe: false, // some unsafe optimizations (see below)
            conditionals: true,  // optimize if-s and conditional expressions
            comparisons: true,  // optimize comparisons
            evaluate: true,  // evaluate constant expressions
            booleans: true,  // optimize boolean expressions
            loops: true,  // optimize loops
            unused: true,  // drop unused variables/functions
            hoist_funs: true,  // hoist function declarations
            hoist_vars: false, // hoist variable declarations
            if_return: true,  // optimize if-s followed by return/continue
            join_vars: true,  // join var declarations
            side_effects: true,  // drop side-effect-free statements
            warnings: true,   // warn about potentially dangerous optimizations/code,
            inline: true,
            reduce_vars: true,
            passes: 10
        },
        mangle: {
            keep_fnames: true
        }
    }
};