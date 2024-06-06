
/**
 * the function starts any number of asynchronous methods and executes them one after the other
 * @param tasks array with the asynchronous functions
 * @returns return values of the executed functions
 */
async function runTasksSync(tasks : (() => Promise<any>)[]){
    const result : any[] = []
    for(let task of tasks){
        result.push(await task())
    }
    return result
}

/**
 * the function starts any number of asynchronous methods and executes them side by side
 * @param tasks array with the asynchronous functions
 * @returns return values of the executed functions
 */
function runTasksAsync(tasks : (() => Promise<any>)[]){
    return Promise.all(tasks.map((task) => task()))
}

export {runTasksAsync, runTasksSync}