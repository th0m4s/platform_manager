const exitHook = require('async-exit-hook');
 
exitHook(() => {
    console.log('exiting');
});
 
// you can add multiple hooks, even across files
exitHook(() => {
    console.log('exiting 2');
});
 
// you can add async hooks by accepting a callback
exitHook(callback => {
    setTimeout(() => {
        console.log('exiting 3');
        callback();
    }, 1000);
});

// All async hooks will work with uncaught errors when you have specified an uncaughtExceptionHandler
process.kill(process.pid);
console.log("After kill");