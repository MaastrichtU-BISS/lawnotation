function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export { delay };