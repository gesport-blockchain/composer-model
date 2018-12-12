function today() {
    return Date.now.setHours(0,0,0,0)
}

function addDays(date, days) {
    return new Date(date.getTime() + days*24*60*60*1000)
}
