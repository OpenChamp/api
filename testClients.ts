const Connections = [];
const Total_test_users = 1000

for(let i = 0; i < Total_test_users; i++) {
    AddUser();
}

setInterval(()=>{
    console.clear();
    for (let i = 0; i < Connections.length; i++) {
        //console.log(`User ID: ${i} | RTT: ${Connections[i].rtt}ms`)
    }
}, 1000)

setInterval(()=>{
    let p1 = Connections.pop();
    let p2 = Connections.pop();
    p1.send("queue");
    p2.send("queue");
}, 5000)

function AddUser() {
    const socket = new WebSocket("ws://localhost:8080/ws");
    socket.onopen = () => {
        socket.timerStart = Date.now()
        socket.send("ping");
    }
    socket.onmessage = (event) => {
        if(event.data === "pong") {
            socket.rtt = socket.timerStart - Date.now();
            socket.timerStart = Date.now();
            console.time("RTT");
            socket.send("ping");
        } else {
            console.log(event.data);
        }
    }
    Connections.push(socket);
}